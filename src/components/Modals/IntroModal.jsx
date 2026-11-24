import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, CheckCircle2, FileText, X } from 'lucide-react';

export default function IntroModal({ isOpen, onClose }) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleAgreeAndContinue = () => {
    localStorage.setItem('iso_terms_agreed', 'true');
    onClose();
  };

  const modalContent = (
    <div
      className="modal-overlay intro-modal-overlay"
      onClick={onClose}
    >
      <div
        className="modal-card intro-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="intro-modal-close-btn"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="intro-modal-header">
          <ShieldCheck size={26} color="#0891b2" style={{ flexShrink: 0 }} />
          <h2 className="intro-modal-title">System Terms & ISO Compliance Agreement</h2>
        </div>

        <p className="intro-modal-subtext">
          Please review and accept the quality compliance terms governing ResQ before using the system.
        </p>

        <div className="intro-modal-content">
          <div className="intro-modal-box intro-modal-box-blue">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '6px' }}>
              <FileText size={16} color="#0891b2" />
            </div>
            <div>
              <strong className="intro-modal-box-title">1. Quality & ISO Standard Adherence</strong>
              <p className="intro-modal-box-desc">
                All Quality Defect Reports (NCR, CAR, QDDR) submitted into ResQ must accurately reflect verified operational data and comply with active ISO 22000 food safety and quality management standards.
              </p>
            </div>
          </div>

          <div className="intro-modal-box intro-modal-box-slate">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '6px' }}>
              <ShieldCheck size={16} color="#1A435A" />
            </div>
            <div>
              <strong className="intro-modal-box-title">2. Data Integrity & Verification</strong>
              <p className="intro-modal-box-desc">
                Users agree that all reported non-conformances, investigation details, and root-cause evidence provided are genuine, non-falsified, and subject to audit verification.
              </p>
            </div>
          </div>
        </div>

        {/* Agreement Action Footer */}
        <div className="intro-modal-footer">
          <label className="intro-modal-checkbox-label">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ accentColor: '#0891b2', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500, lineHeight: 1.4 }}>
              I have read and agree to comply with the <strong style={{ color: '#1A435A' }}>ISO Compliance Terms & Conditions</strong>.
            </span>
          </label>

          <div className="intro-modal-actions">
            <button
              type="button"
              onClick={handleAgreeAndContinue}
              disabled={!agreed}
              className="btn-gradient-primary"
              style={{
                padding: '10px 24px',
                fontSize: '13.5px',
                opacity: agreed ? 1 : 0.5,
                cursor: agreed ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} /> Accept & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
