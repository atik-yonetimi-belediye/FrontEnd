import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api, { getApiErrorMessage } from '../../services/api';
import { fetchAllPages } from '../../services/pagination';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ConfirmModal from '../../components/ConfirmModal';
import {
  Archive,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import './AdminPersonel.css';

const EMPTY_CAVUS = { ad_soyad: '', telefon: '', sifre: '', mahalle_id: '' };
const EMPTY_SOFOR = { ad: '', soyad: '', telefon: '', sifre: '', cavus_id: '', arac_id: '' };

const PERMISSION_PROFILES = {
  cavus: {
    'Standart Çavuş': ['container.view', 'container.create', 'container.deactivate', 'task.assign', 'driver.view', 'driver.create', 'driver.assign_vehicle', 'driver.deactivate', 'vehicle.view', 'vehicle.create', 'vehicle.edit', 'vehicle.deactivate', 'collection.history.view'],
    'Saha Sorumlusu': ['container.view', 'container.create', 'container.deactivate', 'task.assign', 'task.cancel', 'driver.view', 'driver.create', 'driver.assign_vehicle', 'driver.deactivate', 'vehicle.view', 'vehicle.create', 'vehicle.edit', 'vehicle.deactivate', 'collection.history.view'],
    'Sadece İzleme': ['container.view', 'driver.view', 'vehicle.view', 'collection.history.view'],
  },
  sofor: {
    'Standart Şoför': ['task.view', 'task.start', 'collection.complete', 'collection.skip', 'collection.attach_evidence', 'route.open', 'own_history.view'],
    'Kıdemli Şoför': ['task.view', 'task.start', 'collection.complete', 'collection.skip', 'collection.attach_evidence', 'route.open', 'own_history.view'],
    'Geçici Personel': ['task.view', 'task.start', 'collection.complete', 'route.open'],
  },
};

function formatPhone(value = '') {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9, 11)]
    .filter(Boolean)
    .join(' ');
}

function normalizePhone(value = '') {
  return value.replace(/\D/g, '');
}

function PersonnelForm({ role, record, form, setForm, mahalleler, cavuslar, araclar, soforler, showPassword, setShowPassword }) {
  const isCavus = role === 'cavus';
  const isEditing = Boolean(record);
  const usedMahalleIds = new Set(cavuslar.filter((item) => item.id !== record?.id).map((item) => item.mahalle_id));
  const availableMahalleler = mahalleler.filter((item) => !usedMahalleIds.has(item.id));
  const usedVehicleIds = new Set(
    soforler.filter((item) => item.id !== record?.id && item.arac_id).map((item) => item.arac_id)
  );
  const availableVehicles = araclar.filter(
    (item) => item.aktif_mi && item.cavus_id === Number(form.cavus_id) && !usedVehicleIds.has(item.id)
  );

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <div className="personnel-form" data-testid="personnel-form">
      {isCavus ? (
        <Input label="Ad Soyad" value={form.ad_soyad} onChange={update('ad_soyad')} autoComplete="name" required />
      ) : (
        <div className="personnel-form-grid">
          <Input label="Ad" value={form.ad} onChange={update('ad')} autoComplete="given-name" required />
          <Input label="Soyad" value={form.soyad} onChange={update('soyad')} autoComplete="family-name" required />
        </div>
      )}

      <Input
        label="Telefon"
        value={formatPhone(form.telefon)}
        onChange={(event) => setForm((current) => ({ ...current, telefon: normalizePhone(event.target.value) }))}
        inputMode="tel"
        autoComplete="tel"
        placeholder="05XX XXX XX XX"
        required
      />

      {isCavus ? (
        <label className="personnel-select-label">
          Sorumlu Mahalle
          <select value={form.mahalle_id} onChange={update('mahalle_id')} required>
            <option value="">Mahalle seçin</option>
            {availableMahalleler.map((item) => <option key={item.id} value={item.id}>{item.ad}</option>)}
          </select>
        </label>
      ) : (
        <>
          <label className="personnel-select-label">
            Bağlı Çavuş
            <select
              value={form.cavus_id}
              onChange={(event) => setForm((current) => ({ ...current, cavus_id: event.target.value, arac_id: '' }))}
              required
            >
              <option value="">Çavuş seçin</option>
              {cavuslar.filter((item) => item.aktif_mi).map((item) => (
                <option key={item.id} value={item.id}>{item.ad_soyad} — {item.mahalle_ad}</option>
              ))}
            </select>
          </label>
          <label className="personnel-select-label">
            Araç
            <select value={form.arac_id} onChange={update('arac_id')} required={!isEditing || record?.aktif_mi}>
              <option value="">{isEditing && !record?.aktif_mi ? 'Araçsız bırak' : 'Araç seçin'}</option>
              {availableVehicles.map((item) => <option key={item.id} value={item.id}>{item.plaka} — {item.arac_turu === 'kati_atik' ? 'Katı Atık' : 'Geri Dönüşüm'}</option>)}
            </select>
          </label>
          {form.cavus_id && availableVehicles.length === 0 && !form.arac_id && (
            <p className="personnel-form-hint" role="status">Bu çavuşa ait boşta ve aktif araç bulunmuyor.</p>
          )}
        </>
      )}

      {!isEditing && (
        <div className="password-field">
          <Input
            label="İlk Şifre"
            type={showPassword ? 'text' : 'password'}
            value={form.sifre}
            onChange={update('sifre')}
            minLength={8}
            autoComplete="new-password"
            required
          />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      )}
    </div>
  );
}

const AdminPersonel = () => {
  const [activeTab, setActiveTab] = useState('cavus');
  const [cavuslar, setCavuslar] = useState([]);
  const [soforler, setSoforler] = useState([]);
  const [mahalleler, setMahalleler] = useState([]);
  const [araclar, setAraclar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(EMPTY_CAVUS);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permissionItems, setPermissionItems] = useState([]);
  const [originalPermissionItems, setOriginalPermissionItems] = useState([]);
  const [timeline, setTimeline] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [cavusItems, soforItems, mahalleItems, aracItems] = await Promise.all([
        fetchAllPages('/admin/cavuslar'),
        fetchAllPages('/admin/soforler'),
        fetchAllPages('/mahalleler'),
        fetchAllPages('/admin/araclar'),
      ]);
      setCavuslar(cavusItems);
      setSoforler(soforItems);
      setMahalleler(mahalleItems);
      setAraclar(aracItems);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Personel verileri yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const currentItems = activeTab === 'cavus' ? cavuslar : soforler;
  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return currentItems.filter((item) => {
      if (statusFilter !== 'all' && item.aktif_mi !== (statusFilter === 'active')) return false;
      const name = activeTab === 'cavus' ? item.ad_soyad : `${item.ad} ${item.soyad}`;
      return !query || name?.toLocaleLowerCase('tr-TR').includes(query) || item.telefon?.includes(query.replace(/\D/g, ''));
    });
  }, [activeTab, currentItems, search, statusFilter]);

  const openCreate = () => {
    setShowPassword(false);
    setForm(activeTab === 'cavus' ? { ...EMPTY_CAVUS } : { ...EMPTY_SOFOR });
    setDialog({ type: 'form', role: activeTab, record: null });
  };

  const openEdit = (role, record) => {
    setShowPassword(false);
    setForm(role === 'cavus'
      ? { ad_soyad: record.ad_soyad, telefon: record.telefon, mahalle_id: String(record.mahalle_id) }
      : { ad: record.ad, soyad: record.soyad, telefon: record.telefon, cavus_id: String(record.cavus_id || ''), arac_id: String(record.arac_id || '') });
    setDialog({ type: 'form', role, record });
  };

  const submitForm = async () => {
    const role = dialog.role;
    const isCavus = role === 'cavus';
    const isEditing = Boolean(dialog.record);
    const payload = isCavus
      ? { ad_soyad: form.ad_soyad.trim(), telefon: form.telefon, mahalle_id: Number(form.mahalle_id) }
      : { ad: form.ad.trim(), soyad: form.soyad.trim(), telefon: form.telefon, cavus_id: Number(form.cavus_id), arac_id: form.arac_id ? Number(form.arac_id) : null };
    if (!isEditing) payload.sifre = form.sifre;

    setBusy(true);
    try {
      const resource = isCavus ? 'cavuslar' : 'soforler';
      if (isEditing) await api.patch(`/admin/${resource}/${dialog.record.id}`, payload);
      else await api.post(`/admin/${resource}`, payload);
      setDialog(null);
      setNotice({ type: 'success', text: `${isCavus ? 'Çavuş' : 'Şoför'} başarıyla ${isEditing ? 'güncellendi' : 'eklendi'}.` });
      await fetchData();
    } catch (requestError) {
      setNotice({ type: 'error', text: getApiErrorMessage(requestError) });
    } finally {
      setBusy(false);
    }
  };

  const openPassword = (role, record) => {
    setShowPassword(false);
    setForm({ sifre: '' });
    setDialog({ type: 'password', role, record });
  };

  const submitPassword = async () => {
    setBusy(true);
    try {
      const resource = dialog.role === 'cavus' ? 'cavuslar' : 'soforler';
      await api.patch(`/admin/${resource}/${dialog.record.id}/sifre`, { sifre: form.sifre });
      setDialog(null);
      setNotice({ type: 'success', text: 'Personel şifresi güvenli biçimde yenilendi.' });
    } catch (requestError) {
      setNotice({ type: 'error', text: getApiErrorMessage(requestError) });
    } finally {
      setBusy(false);
    }
  };

  const promptStatus = (role, record) => {
    const activating = !record.aktif_mi;
    if (role === 'sofor' && activating && !record.arac_id) {
      setNotice({ type: 'error', text: 'Şoförü etkinleştirmeden önce düzenleme ekranından bir araç atayın.' });
      openEdit(role, record);
      return;
    }
    setDialog({ type: 'status', role, record, activating });
  };

  const submitStatus = async () => {
    setBusy(true);
    try {
      const resource = dialog.role === 'cavus' ? 'cavuslar' : 'soforler';
      const response = await api.patch(`/admin/${resource}/${dialog.record.id}/durum`, { aktif_mi: dialog.activating });
      const affected = response.data.data?.etkilenen_sofor_sayisi;
      setDialog(null);
      setNotice({
        type: 'success',
        text: affected
          ? `Çavuş pasife alındı; bağlı ${affected} şoför de güvenlik için pasife alındı.`
          : `Personel ${dialog.activating ? 'etkinleştirildi' : 'pasife alındı'}.`,
      });
      await fetchData();
    } catch (requestError) {
      setNotice({ type: 'error', text: getApiErrorMessage(requestError) });
    } finally {
      setBusy(false);
    }
  };

  const promptDelete = (role, record) => setDialog({ type: 'delete', role, record, confirmation: '' });

  const openGovernance = async (role, record) => {
    setDialog({ type: 'governance', role, record, loading: true });
    try {
      const [permissionsResponse, timelineResponse] = await Promise.all([
        api.get(`/admin/personel/${role}/${record.id}/yetkiler`),
        api.get(`/admin/personel/${role}/${record.id}/islem-gecmisi`),
      ]);
      const items = permissionsResponse.data.data || [];
      setPermissionItems(items);
      setOriginalPermissionItems(items);
      setTimeline(timelineResponse.data.data || []);
      setDialog((current) => ({ ...current, loading: false }));
    } catch (requestError) {
      setDialog(null);
      setNotice({ type: 'error', text: getApiErrorMessage(requestError, 'Yetkiler alınamadı.') });
    }
  };

  const permissionChanges = useMemo(() => permissionItems.filter((item) => {
    const original = originalPermissionItems.find((entry) => entry.code === item.code);
    return original && original.effective_value !== item.effective_value;
  }), [permissionItems, originalPermissionItems]);

  const setPermissionGroup = (category, allowed) => setPermissionItems((current) => current.map((item) => item.category === category ? { ...item, effective_value: allowed } : item));
  const applyPermissionProfile = (name) => {
    const enabled = new Set(PERMISSION_PROFILES[dialog.role]?.[name] || []);
    setPermissionItems((current) => current.map((item) => ({ ...item, effective_value: enabled.has(item.code) })));
  };
  const resetPermissionDraft = () => setPermissionItems((current) => current.map((item) => ({ ...item, effective_value: item.default_enabled })));

  const reviewPermissions = () => {
    if (!permissionChanges.length) {
      setNotice({ type: 'success', text: 'Yetkilerde kaydedilecek bir değişiklik yok.' });
      return;
    }
    setDialog((current) => ({ ...current, type: 'permission-review', changes: permissionChanges, criticalConfirmed: false }));
  };

  const savePermissions = async () => {
    setBusy(true);
    try {
      await api.put(`/admin/personel/${dialog.role}/${dialog.record.id}/yetkiler`, {
        permissions: permissionItems.map((item) => ({ code: item.code, allowed: item.effective_value })),
      });
      setDialog(null);
      setNotice({ type: 'success', text: 'Personel yetkileri güncellendi.' });
    } catch (requestError) { setNotice({ type: 'error', text: getApiErrorMessage(requestError) }); }
    finally { setBusy(false); }
  };

  const submitDelete = async () => {
    setBusy(true);
    try {
      const resource = dialog.role === 'cavus' ? 'cavuslar' : 'soforler';
      await api.delete(`/admin/${resource}/${dialog.record.id}`);
      setDialog(null);
      setNotice({ type: 'success', text: 'Bağlantısı olmayan pasif personel kalıcı olarak silindi.' });
      await fetchData();
    } catch (requestError) {
      setNotice({ type: 'error', text: getApiErrorMessage(requestError) });
    } finally {
      setBusy(false);
    }
  };

  const personName = dialog?.role === 'cavus' ? dialog?.record?.ad_soyad : `${dialog?.record?.ad || ''} ${dialog?.record?.soyad || ''}`.trim();
  const permissionGroups = useMemo(() => [...new Set(permissionItems.map((item) => item.category))], [permissionItems]);
  const formIsValid = dialog?.role === 'cavus'
    ? Boolean(form.ad_soyad?.trim() && normalizePhone(form.telefon).length === 11 && form.mahalle_id && (dialog.record || form.sifre?.length >= 8))
    : Boolean(form.ad?.trim() && form.soyad?.trim() && normalizePhone(form.telefon).length === 11 && form.cavus_id && form.arac_id && (dialog?.record || form.sifre?.length >= 8));

  return (
    <DashboardLayout title="Personel Yönetim Paneli">
      <div className="admin-personnel">
        <div className="personnel-toolbar glass-panel">
          <div className="personnel-tabs" role="tablist" aria-label="Personel türü">
            <button type="button" role="tab" aria-selected={activeTab === 'cavus'} className={activeTab === 'cavus' ? 'active' : ''} onClick={() => setActiveTab('cavus')}>
              <UserCheck size={18} /> Çavuşlar ({cavuslar.length})
            </button>
            <button type="button" role="tab" aria-selected={activeTab === 'sofor'} className={activeTab === 'sofor' ? 'active' : ''} onClick={() => setActiveTab('sofor')}>
              <Users size={18} /> Şoförler ({soforler.length})
            </button>
          </div>
          <Button onClick={openCreate}><Plus size={17} /> Yeni {activeTab === 'cavus' ? 'Çavuş' : 'Şoför'} Ekle</Button>
        </div>

        <div className="personnel-filters glass-panel">
          <label className="personnel-search">
            <span className="sr-only">Personelde ara</span>
            <Search size={17} aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ad veya telefonla ara" />
          </label>
          <label>
            <span>Durum</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Tümü</option>
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
            </select>
          </label>
          <span className="personnel-result-count">{filteredItems.length} kayıt</span>
        </div>

        {notice && <div className={`personnel-notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</div>}

        {loading ? (
          <div className="personnel-state glass-panel">Personel bilgileri yükleniyor…</div>
        ) : error ? (
          <div className="personnel-state glass-panel" role="alert"><p>{error}</p><Button variant="outline" onClick={fetchData}><RefreshCw size={16} /> Yeniden Dene</Button></div>
        ) : filteredItems.length === 0 ? (
          <div className="personnel-state glass-panel">Bu kriterlere uygun personel bulunamadı.</div>
        ) : (
          <div className="personnel-grid" role="tabpanel">
            {filteredItems.map((item) => {
              const isCavus = activeTab === 'cavus';
              const name = isCavus ? item.ad_soyad : `${item.ad} ${item.soyad}`;
              const dependencies = isCavus
                ? item.sofor_sayisi + item.arac_sayisi + item.konteyner_sayisi
                : item.toplama_kaydi_sayisi;
              const canDelete = !item.aktif_mi && dependencies === 0;
              return (
                <article className="personnel-card glass-panel" key={`${activeTab}-${item.id}`}>
                  <div className="personnel-card-header">
                    <div><h3>{name}</h3><p>{formatPhone(item.telefon)}</p></div>
                    <span className={`personnel-status ${item.aktif_mi ? 'active' : 'passive'}`}>{item.aktif_mi ? 'AKTİF' : 'PASİF'}</span>
                  </div>
                  <dl>
                    {isCavus ? (
                      <>
                        <div><dt>Mahalle</dt><dd>{item.mahalle_ad}</dd></div>
                        <div><dt>Bağlantılar</dt><dd>{item.sofor_sayisi} şoför · {item.arac_sayisi} araç · {item.konteyner_sayisi} konteyner</dd></div>
                      </>
                    ) : (
                      <>
                        <div><dt>Çavuş / Bölge</dt><dd>{item.cavus_ad_soyad || 'Atanmamış'} · {item.mahalle_ad || '-'}</dd></div>
                        <div><dt>Araç / Geçmiş</dt><dd>{item.plaka || 'Araç yok'} · {item.toplama_kaydi_sayisi} toplama kaydı</dd></div>
                      </>
                    )}
                    <div><dt>Kayıt tarihi</dt><dd>{new Date(item.created_at).toLocaleDateString('tr-TR')}</dd></div>
                  </dl>
                  <div className="personnel-actions">
                    <Button size="sm" variant="outline" onClick={() => openGovernance(activeTab, item)}><ShieldCheck size={15} /> Yetkiler</Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(activeTab, item)}><Pencil size={15} /> Düzenle</Button>
                    <Button size="sm" variant="outline" onClick={() => openPassword(activeTab, item)}><KeyRound size={15} /> Şifre</Button>
                    <Button size="sm" variant={item.aktif_mi ? 'outline' : 'primary'} onClick={() => promptStatus(activeTab, item)}><Archive size={15} /> {item.aktif_mi ? 'Pasife Al' : 'Etkinleştir'}</Button>
                    <Button size="sm" variant="danger" disabled={!canDelete} title={canDelete ? 'Kalıcı sil' : 'Önce pasife alınmalı ve tüm bağlantılar kaldırılmalı'} onClick={() => promptDelete(activeTab, item)}><Trash2 size={15} /> Sil</Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={dialog?.type === 'form'}
        className="personnel-modal"
        backdropClassName="personnel-modal-backdrop"
        title={`${dialog?.record ? 'Personeli Düzenle' : 'Yeni Personel Ekle'} — ${dialog?.role === 'cavus' ? 'Çavuş' : 'Şoför'}`}
        variant="info"
        confirmText={busy ? 'Kaydediliyor…' : 'Kaydet'}
        confirmDisabled={busy || !formIsValid}
        onConfirm={submitForm}
        onCancel={() => !busy && setDialog(null)}
      >
        {dialog?.type === 'form' && <PersonnelForm role={dialog.role} record={dialog.record} form={form} setForm={setForm} mahalleler={mahalleler} cavuslar={cavuslar} araclar={araclar} soforler={soforler} showPassword={showPassword} setShowPassword={setShowPassword} />}
      </ConfirmModal>

      <ConfirmModal
        isOpen={dialog?.type === 'password'}
        className="personnel-modal personnel-modal-compact"
        backdropClassName="personnel-modal-backdrop"
        title={`${personName} — Şifre Yenile`}
        message="Mevcut şifre gösterilmez. Belirlediğiniz yeni şifre hemen geçerli olur."
        variant="warning"
        confirmText={busy ? 'Yenileniyor…' : 'Şifreyi Yenile'}
        confirmDisabled={busy || form.sifre?.length < 8}
        onConfirm={submitPassword}
        onCancel={() => !busy && setDialog(null)}
      >
        {dialog?.type === 'password' && <div className="password-field"><Input label="Yeni Şifre" type={showPassword ? 'text' : 'password'} value={form.sifre} onChange={(event) => setForm({ sifre: event.target.value })} minLength={8} autoComplete="new-password" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>}
      </ConfirmModal>

      <ConfirmModal
        isOpen={dialog?.type === 'status'}
        className="personnel-modal personnel-modal-compact"
        backdropClassName="personnel-modal-backdrop"
        title={dialog?.activating ? 'Personeli Etkinleştir' : 'Personeli Pasife Al'}
        message={dialog?.role === 'cavus' && !dialog?.activating ? `${personName} pasife alındığında bağlı aktif şoförler de pasife alınır ve araç atamaları kaldırılır.` : `${personName} için bu durum değişikliğini onaylıyor musunuz?`}
        variant={dialog?.activating ? 'success' : 'warning'}
        confirmText={busy ? 'İşleniyor…' : dialog?.activating ? 'Etkinleştir' : 'Pasife Al'}
        confirmDisabled={busy}
        onConfirm={submitStatus}
        onCancel={() => !busy && setDialog(null)}
      />

      <ConfirmModal
        isOpen={dialog?.type === 'governance'}
        className="personnel-modal personnel-governance-modal"
        backdropClassName="personnel-modal-backdrop"
        title={`${personName} — Yetki ve İşlem Geçmişi`}
        variant="info"
        confirmText={busy ? 'Kaydediliyor…' : 'Yetkileri Kaydet'}
        confirmDisabled={busy || dialog?.loading}
        onConfirm={reviewPermissions}
        onCancel={() => !busy && setDialog(null)}
      >
        {dialog?.type === 'governance' && (dialog.loading ? <p>Yetkiler yükleniyor…</p> : (
          <div className="permission-manager">
            <div className="permission-tools">
              <label>Hazır yetki profili
                <select defaultValue="" onChange={(event) => { if (event.target.value) applyPermissionProfile(event.target.value); event.target.value = ''; }}>
                  <option value="">Profil seçin</option>
                  {Object.keys(PERMISSION_PROFILES[dialog.role] || {}).map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              <div><Button type="button" size="sm" variant="outline" onClick={() => setPermissionItems((current) => current.map((item) => ({ ...item, effective_value: true })))}>Tümünü Seç</Button><Button type="button" size="sm" variant="outline" onClick={() => setPermissionItems((current) => current.map((item) => ({ ...item, effective_value: false })))}>Tümünü Kaldır</Button><Button type="button" size="sm" variant="outline" onClick={resetPermissionDraft}>Rol Varsayılanı</Button></div>
            </div>
            <div className="permission-list">
              {permissionGroups.map((category) => {
                const items = permissionItems.filter((item) => item.category === category);
                const allEnabled = items.every((item) => item.effective_value);
                return <section className="permission-group" key={category}><header><h4>{category}</h4><button type="button" onClick={() => setPermissionGroup(category, !allEnabled)}>{allEnabled ? 'Grubu Kaldır' : 'Grubu Seç'}</button></header>{items.map((item) => (
                  <label key={item.code} className={`permission-switch ${item.risk_level === 'critical' ? 'critical' : ''}`}>
                    <span><strong>{item.label}</strong><small>{item.description}</small><em className={item.override_value == null ? 'role-default' : 'admin-override'}>{item.override_value == null ? 'Rol varsayılanı' : 'Yönetici tarafından değiştirildi'}</em></span>
                    <input type="checkbox" checked={item.effective_value} onChange={(event) => setPermissionItems((current) => current.map((permission) => permission.code === item.code ? { ...permission, effective_value: event.target.checked } : permission))} aria-label={`${item.label} yetkisi`} />
                  </label>
                ))}</section>;
              })}
            </div>
            <section className="person-timeline"><h4>İşlem Geçmişi</h4>{timeline.length === 0 ? <p>Henüz kayıt bulunmuyor.</p> : timeline.map((event) => <article key={event.id}><strong>{event.summary}</strong><small>{event.actor_name || 'Sistem'} · {new Date(event.created_at).toLocaleString('tr-TR')}</small></article>)}</section>
          </div>
        ))}
      </ConfirmModal>

      <ConfirmModal
        isOpen={dialog?.type === 'permission-review'}
        className="personnel-modal personnel-modal-compact"
        backdropClassName="personnel-modal-backdrop"
        title="Yetki Değişikliklerini Onayla"
        message={`${personName} için ${dialog?.changes?.length || 0} yetki değişecek. Değişiklikler sonraki API isteğinde anında geçerli olur.`}
        variant={dialog?.changes?.some((item) => item.risk_level === 'critical') ? 'warning' : 'info'}
        confirmText={busy ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
        confirmDisabled={busy || (dialog?.changes?.some((item) => item.risk_level === 'critical') && !dialog?.criticalConfirmed)}
        onConfirm={savePermissions}
        onCancel={() => !busy && setDialog((current) => ({ ...current, type: 'governance' }))}
      >
        <div className="permission-review-list">{(dialog?.changes || []).map((item) => <div key={item.code}><strong>{item.label}</strong><span>{item.effective_value ? 'Verilecek' : 'Kaldırılacak'}</span></div>)}</div>
        {dialog?.changes?.some((item) => item.risk_level === 'critical') && <label className="permission-critical-confirm"><input type="checkbox" checked={Boolean(dialog?.criticalConfirmed)} onChange={(event) => setDialog((current) => ({ ...current, criticalConfirmed: event.target.checked }))} /><span>Kritik yetkilerin güvenlik etkisini kontrol ettim ve onaylıyorum.</span></label>}
      </ConfirmModal>

      <ConfirmModal
        isOpen={dialog?.type === 'delete'}
        className="personnel-modal personnel-modal-compact"
        backdropClassName="personnel-modal-backdrop"
        title="Kalıcı Personel Silme"
        message={`${personName} kalıcı olarak silinecek. Bu işlem geri alınamaz. Onaylamak için personelin adını yazın.`}
        variant="danger"
        confirmText={busy ? 'Siliniyor…' : 'Kalıcı Olarak Sil'}
        confirmDisabled={busy || dialog?.confirmation !== personName}
        onConfirm={submitDelete}
        onCancel={() => !busy && setDialog(null)}
      >
        {dialog?.type === 'delete' && <Input label="Personel Adı" value={dialog.confirmation} onChange={(event) => setDialog((current) => ({ ...current, confirmation: event.target.value }))} autoComplete="off" />}
      </ConfirmModal>
    </DashboardLayout>
  );
};

export default AdminPersonel;
