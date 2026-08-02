import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, Link2, Plus, Power, Search, Trash2, Truck, Users } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import Button from '../../components/Button';
import ConfirmModal from '../../components/ConfirmModal';
import api, { getApiErrorMessage } from '../../services/api';
import { fetchAllPages } from '../../services/pagination';
import './AdminAraclar.css';

const EMPTY_FORM = { plaka: '', arac_turu: 'kati_atik', cavus_id: '' };
const typeLabel = (value) => value === 'geri_donusum' ? 'Geri Dönüşüm' : 'Katı Atık';

function VehicleForm({ form, setForm, record, cavuslar }) {
  const activeCavuslar = cavuslar.filter((item) => item.aktif_mi || item.id === record?.cavus_id);
  const selected = cavuslar.find((item) => item.id === Number(form.cavus_id));
  return (
    <div className="vehicle-form">
      <label>
        Plaka
        <input
          autoFocus
          value={form.plaka}
          onChange={(event) => setForm((current) => ({ ...current, plaka: event.target.value.toLocaleUpperCase('tr-TR') }))}
          placeholder="46 ABC 123"
          maxLength={20}
        />
      </label>
      <label>
        Araç Türü
        <select value={form.arac_turu} onChange={(event) => setForm((current) => ({ ...current, arac_turu: event.target.value }))}>
          <option value="kati_atik">Katı Atık</option>
          <option value="geri_donusum">Geri Dönüşüm</option>
        </select>
      </label>
      <label>
        Bağlı Çavuş
        <select value={form.cavus_id} onChange={(event) => setForm((current) => ({ ...current, cavus_id: event.target.value }))}>
          <option value="">Çavuş seçin</option>
          {activeCavuslar.map((item) => (
            <option key={item.id} value={item.id}>
              {item.ad_soyad}{item.id === record?.cavus_id ? ' — şu anda bu çavuşa bağlı' : ''}{!item.aktif_mi ? ' — pasif' : ''}
            </option>
          ))}
        </select>
      </label>
      {record?.cavus_ad_soyad && (
        <p className="vehicle-owner-note" role="status">
          <Link2 size={14} /> Şu anda <strong>{record.cavus_ad_soyad}</strong> çavuşuna bağlı.
        </p>
      )}
      {record?.sofor_ad_soyad && Number(form.cavus_id) !== record.cavus_id && (
        <p className="vehicle-warning">Araçla birlikte {record.sofor_ad_soyad} adlı şoför de yeni çavuşa aktarılacak.</p>
      )}
      {selected && !selected.aktif_mi && record?.aktif_mi && (
        <p className="vehicle-warning">Aktif araç pasif bir çavuşa aktarılamaz.</p>
      )}
    </div>
  );
}

export default function AdminAraclar() {
  const [araclar, setAraclar] = useState([]);
  const [cavuslar, setCavuslar] = useState([]);
  const [soforler, setSoforler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [assignment, setAssignment] = useState({ cavus_id: '', sofor_id: '' });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [vehicleItems, sergeantItems, driverItems] = await Promise.all([
        fetchAllPages('/admin/araclar'),
        fetchAllPages('/admin/cavuslar'),
        fetchAllPages('/admin/soforler'),
      ]);
      setAraclar(vehicleItems);
      setCavuslar(sergeantItems);
      setSoforler(driverItems);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Araç yönetimi verileri yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return araclar.filter((item) => {
      if (query && ![item.plaka, item.cavus_ad_soyad, item.sofor_ad_soyad, item.mahalle_ad].some((value) => value?.toLocaleLowerCase('tr-TR').includes(query))) return false;
      if (statusFilter !== 'all' && item.aktif_mi !== (statusFilter === 'active')) return false;
      if (typeFilter !== 'all' && item.arac_turu !== typeFilter) return false;
      if (assignmentFilter === 'assigned' && !item.sofor_id) return false;
      if (assignmentFilter === 'empty' && item.sofor_id) return false;
      return true;
    });
  }, [araclar, assignmentFilter, search, statusFilter, typeFilter]);

  const stats = {
    total: araclar.length,
    active: araclar.filter((item) => item.aktif_mi).length,
    empty: araclar.filter((item) => !item.sofor_id).length,
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialog({ type: 'form', record: null });
  };

  const openEdit = (record) => {
    setForm({ plaka: record.plaka, arac_turu: record.arac_turu, cavus_id: String(record.cavus_id || '') });
    setDialog({ type: 'form', record });
  };

  const openAssignment = (record) => {
    setAssignment({ cavus_id: String(record.cavus_id || ''), sofor_id: String(record.sofor_id || '') });
    setDialog({ type: 'assignment', record });
  };

  const submitForm = async () => {
    const payload = { plaka: form.plaka.trim(), arac_turu: form.arac_turu, cavus_id: Number(form.cavus_id) };
    setBusy(true);
    try {
      if (dialog.record) await api.patch(`/admin/araclar/${dialog.record.id}`, payload);
      else await api.post('/admin/araclar', payload);
      setDialog(null);
      setNotice({ type: 'success', text: `Araç başarıyla ${dialog.record ? 'güncellendi' : 'eklendi'}.` });
      await fetchData();
    } catch (requestError) {
      setNotice({ type: 'error', text: getApiErrorMessage(requestError, 'Araç kaydedilemedi.') });
    } finally { setBusy(false); }
  };

  const submitAssignment = async () => {
    setBusy(true);
    try {
      await api.patch(`/admin/araclar/${dialog.record.id}/atama`, {
        cavus_id: Number(assignment.cavus_id),
        sofor_id: assignment.sofor_id ? Number(assignment.sofor_id) : null,
      });
      setDialog(null);
      setNotice({ type: 'success', text: 'Araç, çavuş ve şoför ataması güvenli biçimde güncellendi.' });
      await fetchData();
    } catch (requestError) {
      setNotice({ type: 'error', text: getApiErrorMessage(requestError, 'Araç ataması güncellenemedi.') });
    } finally { setBusy(false); }
  };

  const submitStatus = async () => {
    setBusy(true);
    try {
      await api.patch(`/admin/araclar/${dialog.record.id}/durum`, { aktif_mi: dialog.activating });
      setDialog(null);
      setNotice({ type: 'success', text: `Araç ${dialog.activating ? 'etkinleştirildi' : 'pasife alındı'}.` });
      await fetchData();
    } catch (requestError) {
      setNotice({ type: 'error', text: getApiErrorMessage(requestError, 'Araç durumu güncellenemedi.') });
    } finally { setBusy(false); }
  };

  const submitDelete = async () => {
    setBusy(true);
    try {
      await api.delete(`/admin/araclar/${dialog.record.id}`);
      setDialog(null);
      setNotice({ type: 'success', text: 'Bağlantısı olmayan pasif araç kalıcı olarak silindi.' });
      await fetchData();
    } catch (requestError) {
      setNotice({ type: 'error', text: getApiErrorMessage(requestError, 'Araç silinemedi.') });
    } finally { setBusy(false); }
  };

  const availableDrivers = soforler.filter((item) => !item.arac_id || item.arac_id === dialog?.record?.id);
  const selectedCavus = cavuslar.find((item) => item.id === Number(assignment.cavus_id));
  const formValid = form.plaka.trim().length >= 5 && form.cavus_id && form.arac_turu;

  return (
    <DashboardLayout title="Araç Yönetim Paneli">
      <div className="admin-vehicles">
        <section className="vehicle-summary" aria-label="Araç özeti">
          <div><Truck size={20} /><span>Toplam</span><strong>{stats.total}</strong></div>
          <div><Power size={20} /><span>Aktif</span><strong>{stats.active}</strong></div>
          <div><Users size={20} /><span>Boşta</span><strong>{stats.empty}</strong></div>
        </section>

        <section className="vehicle-toolbar glass-panel">
          <div><h2>Araçlar</h2><p>Belediye filosunu, çavuş ve şoför atamalarını yönetin.</p></div>
          <Button onClick={openCreate}><Plus size={17} /> Yeni Araç Ekle</Button>
        </section>

        <section className="vehicle-filters glass-panel" aria-label="Araç filtreleri">
          <label className="vehicle-search"><Search size={17} /><span className="sr-only">Ara</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Plaka, çavuş veya şoför ara" /></label>
          <label><span>Durum</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Tümü</option><option value="active">Aktif</option><option value="passive">Pasif</option></select></label>
          <label><span>Tür</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">Tümü</option><option value="kati_atik">Katı Atık</option><option value="geri_donusum">Geri Dönüşüm</option></select></label>
          <label><span>Atama</span><select value={assignmentFilter} onChange={(event) => setAssignmentFilter(event.target.value)}><option value="all">Tümü</option><option value="assigned">Şoför atanmış</option><option value="empty">Boşta</option></select></label>
          <span className="vehicle-result-count">{filtered.length} araç</span>
        </section>

        {notice && <div className={`vehicle-notice ${notice.type}`} role="status">{notice.text}</div>}
        {loading && <div className="vehicle-state glass-panel">Araçlar yükleniyor…</div>}
        {!loading && error && <div className="vehicle-state glass-panel"><p>{error}</p><Button variant="outline" onClick={fetchData}>Yeniden Dene</Button></div>}
        {!loading && !error && filtered.length === 0 && <div className="vehicle-state glass-panel">Filtrelere uygun araç bulunamadı.</div>}

        {!loading && !error && filtered.length > 0 && (
          <section className="vehicle-grid" aria-label="Araç listesi">
            {filtered.map((item) => (
              <article className="vehicle-card glass-panel" key={item.id}>
                <header>
                  <div className="vehicle-plate"><Truck size={19} /><h3>{item.plaka}</h3></div>
                  <span className={`vehicle-status ${item.aktif_mi ? 'active' : 'passive'}`}>{item.aktif_mi ? 'AKTİF' : 'PASİF'}</span>
                </header>
                <div className="vehicle-tags"><span>{typeLabel(item.arac_turu)}</span><span className={item.sofor_id ? 'assigned' : 'empty'}>{item.sofor_id ? 'Şoför atanmış' : 'Boşta'}</span></div>
                <dl>
                  <div><dt>Bağlı çavuş</dt><dd>{item.cavus_ad_soyad || 'Atanmamış'}{item.cavus_ad_soyad && <small><Link2 size={12} /> Şu anda bu çavuşa bağlı</small>}</dd></div>
                  <div><dt>Mahalle</dt><dd>{item.mahalle_ad || '—'}</dd></div>
                  <div><dt>Şoför</dt><dd>{item.sofor_ad_soyad || 'Atanmamış'}</dd></div>
                  <div><dt>Kayıt tarihi</dt><dd>{new Date(item.created_at).toLocaleDateString('tr-TR')}</dd></div>
                </dl>
                <div className="vehicle-actions">
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}><Edit3 size={15} /> Düzenle</Button>
                  <Button variant="outline" size="sm" onClick={() => openAssignment(item)}><Link2 size={15} /> Atama</Button>
                  <Button variant={item.aktif_mi ? 'outline' : 'primary'} size="sm" onClick={() => setDialog({ type: 'status', record: item, activating: !item.aktif_mi })}><Power size={15} /> {item.aktif_mi ? 'Pasife Al' : 'Etkinleştir'}</Button>
                  <Button variant="danger" size="sm" disabled={!item.silinebilir_mi} title={!item.silinebilir_mi ? 'Yalnızca bağlantısız pasif araç silinebilir.' : 'Aracı kalıcı sil'} onClick={() => setDialog({ type: 'delete', record: item })}><Trash2 size={15} /> Sil</Button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      <ConfirmModal isOpen={dialog?.type === 'form'} className="vehicle-modal" backdropClassName="vehicle-modal-backdrop" title={dialog?.record ? `${dialog.record.plaka} Aracını Düzenle` : 'Yeni Araç Ekle'} variant="info" confirmText={busy ? 'Kaydediliyor…' : 'Kaydet'} confirmDisabled={busy || !formValid} onCancel={() => !busy && setDialog(null)} onConfirm={submitForm}>
        {dialog?.type === 'form' && <VehicleForm form={form} setForm={setForm} record={dialog.record} cavuslar={cavuslar} />}
      </ConfirmModal>

      <ConfirmModal isOpen={dialog?.type === 'assignment'} className="vehicle-modal" backdropClassName="vehicle-modal-backdrop" title={`${dialog?.record?.plaka || ''} Atamasını Yönet`} message={dialog?.record?.cavus_ad_soyad ? `Araç şu anda ${dialog.record.cavus_ad_soyad} çavuşuna bağlı.` : undefined} variant="info" confirmText={busy ? 'Kaydediliyor…' : 'Atamayı Kaydet'} confirmDisabled={busy || !assignment.cavus_id || Boolean(dialog?.record?.aktif_mi && selectedCavus && !selectedCavus.aktif_mi)} onCancel={() => !busy && setDialog(null)} onConfirm={submitAssignment}>
        <div className="vehicle-form">
          <label>Bağlı Çavuş<select value={assignment.cavus_id} onChange={(event) => setAssignment({ cavus_id: event.target.value, sofor_id: '' })}><option value="">Çavuş seçin</option>{cavuslar.filter((item) => item.aktif_mi || item.id === dialog?.record?.cavus_id).map((item) => <option key={item.id} value={item.id}>{item.ad_soyad}{item.id === dialog?.record?.cavus_id ? ' — şu anda bağlı' : ''}{!item.aktif_mi ? ' — pasif' : ''}</option>)}</select></label>
          <label>Şoför<select value={assignment.sofor_id} onChange={(event) => setAssignment((current) => ({ ...current, sofor_id: event.target.value }))} disabled={!dialog?.record?.aktif_mi}><option value="">Şoför atamasını kaldır</option>{availableDrivers.map((item) => <option key={item.id} value={item.id}>{item.ad_soyad || `${item.ad} ${item.soyad}`}{item.id === dialog?.record?.sofor_id ? ' — şu anda atanmış' : ''}</option>)}</select></label>
          {dialog?.record?.sofor_ad_soyad && !assignment.sofor_id && <p className="vehicle-warning">Atama kaldırılırsa {dialog.record.sofor_ad_soyad} pasife alınacaktır.</p>}
        </div>
      </ConfirmModal>

      <ConfirmModal isOpen={dialog?.type === 'status'} className="vehicle-modal vehicle-modal-compact" backdropClassName="vehicle-modal-backdrop" title={dialog?.activating ? 'Aracı Etkinleştir' : 'Aracı Pasife Al'} message={!dialog?.activating && dialog?.record?.sofor_ad_soyad ? `${dialog.record.sofor_ad_soyad} adlı şoförün araç ataması kaldırılacak ve şoför pasife alınacak.` : `${dialog?.record?.plaka || ''} için durum değişikliğini onaylıyor musunuz?`} variant={dialog?.activating ? 'success' : 'warning'} confirmText={busy ? 'İşleniyor…' : dialog?.activating ? 'Etkinleştir' : 'Pasife Al'} confirmDisabled={busy} onCancel={() => !busy && setDialog(null)} onConfirm={submitStatus} />

      <ConfirmModal isOpen={dialog?.type === 'delete'} className="vehicle-modal vehicle-modal-compact" backdropClassName="vehicle-modal-backdrop" title="Aracı Kalıcı Sil" message={`${dialog?.record?.plaka || ''} kalıcı olarak silinecek. Bu işlem geri alınamaz.`} variant="danger" confirmText={busy ? 'Siliniyor…' : 'Kalıcı Sil'} confirmDisabled={busy} onCancel={() => !busy && setDialog(null)} onConfirm={submitDelete} />
    </DashboardLayout>
  );
}
