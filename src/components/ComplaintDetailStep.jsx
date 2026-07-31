import React, { useEffect, useState } from 'react';
import { Camera, FileText } from 'lucide-react';

function FilePreview({ file, alt }) {
  const [previewUrl, setPreviewUrl] = useState('');
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return previewUrl ? <img src={previewUrl} alt={alt} /> : null;
}

export default function ComplaintDetailStep({ formData, files, onInputChange, onFileChange, onRemoveFile }) {
  return (
    <div className="step-content animate-fade-in">
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <FileText size={20} style={{ color: 'var(--primary-color)' }} /> Adım 3: Şikayet Detayı ve Fotoğraf
      </h3>
      <div className="form-grid">
        <div className="form-group">
          <label className="input-label" htmlFor="complaint-waste-type">Atık Türü</label>
          <select id="complaint-waste-type" className="custom-select" name="sikayet_turu" value={formData.sikayet_turu} onChange={onInputChange} disabled={!!formData.konteyner_id}>
            <option value="kati_atik">Katı Atık (Çöp)</option><option value="geri_donusum">Geri Dönüşüm</option>
          </select>
        </div>
        <div className="form-group">
          <label className="input-label" htmlFor="complaint-category">Şikayet Kategorisi</label>
          <select id="complaint-category" className="custom-select" name="sikayet_kategorisi" value={formData.sikayet_kategorisi} onChange={onInputChange} required>
            <option value="">Seçiniz</option><option value="konteyner_dolu">Konteyner Dolu / Taştı</option><option value="konteyner_kirik">Konteyner Kırık / Hasarlı</option><option value="kotu_koku">Kötü Koku</option><option value="cop_tasmasi">Çöp Taşması</option><option value="zamaninda_toplanmadi">Zamanında Toplanmadı</option><option value="diger">Diğer</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="input-label" htmlFor="complaint-detail">Şikayet Detayı</label>
        <textarea id="complaint-detail" className="custom-textarea" name="sikayet_metni" rows="4" placeholder="Lütfen karşılaştığınız sorunu detaylıca anlatın..." value={formData.sikayet_metni} onChange={onInputChange} required />
      </div>
      <div className="file-upload-section">
        <span className="input-label" id="complaint-photo-label">Fotoğraf Ekle (Maksimum 3 adet)</span>
        {files.length < 3 && <label className="file-upload-box"><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={onFileChange} className="hidden-file-input" aria-labelledby="complaint-photo-label" /><Camera size={32} className="upload-icon" /><span>Fotoğraf seçmek için tıklayın</span></label>}
        {files.length > 0 && <div className="photo-preview-grid">{files.map((file, index) => <div key={`${file.name}-${file.lastModified}`} className="photo-preview-item animate-fade-in"><FilePreview file={file} alt={`Önizleme ${index + 1}`} /><button type="button" className="photo-delete-btn" onClick={() => onRemoveFile(index)} aria-label={`${index + 1}. fotoğrafı kaldır`}>×</button></div>)}</div>}
      </div>
    </div>
  );
}
