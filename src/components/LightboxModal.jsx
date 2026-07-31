import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import './LightboxModal.css';
import useDialogFocusTrap from '../hooks/useDialogFocusTrap';

const LightboxModal = ({ images = [], initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const dialogRef = useRef(null);
  useDialogFocusTrap(dialogRef, images.length > 0, onClose);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft') {
        setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
      }
      if (event.key === 'ArrowRight') {
        setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  if (!images || images.length === 0) return null;

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      ref={dialogRef}
      className="lightbox-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      aria-label="Fotoğraf görüntüleyici"
    >
      <div className="lightbox-header">
        <button className="lightbox-close-btn" onClick={onClose} title="Kapat" aria-label="Fotoğraf görüntüleyiciyi kapat">
          <X size={24} />
        </button>
      </div>

      {images.length > 1 && (
        <>
          <button className="lightbox-nav-btn prev" onClick={handlePrev} title="Önceki Fotoğraf" aria-label="Önceki fotoğraf">
            <ChevronLeft size={28} />
          </button>
          <button className="lightbox-nav-btn next" onClick={handleNext} title="Sonraki Fotoğraf" aria-label="Sonraki fotoğraf">
            <ChevronRight size={28} />
          </button>
        </>
      )}

      <div className="lightbox-image-wrapper" onClick={e => e.stopPropagation()}>
        <img src={images[currentIndex]} alt={`Fotoğraf ${currentIndex + 1}`} />
      </div>

      <div className="lightbox-caption" aria-live="polite">
        Fotoğraf {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
};

export default LightboxModal;
