import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, FileText } from 'lucide-react';

export default function IntroModal({ isOpen, onClose }) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleAgreeAndContinue = () => {
    localStorage.setItem('iso_terms_agreed', 'true');
    onClose();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button onClick={onClose} style={closeButtonStyle} aria-label="Close modal">
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <ShieldCheck size={26} color="#0891b2" />
          <h2 style={{ ...titleStyle, margin: 0 }}>System Terms & ISO Compliance Agreement</h2>
        </div>

        <p style={{ color: '#64748b', fontSize: '13.5px', marginTop: '4px', marginBottom: '20px' }}>
          Please review and accept the quality compliance terms governing QFlow before using the system.
        </p>

        <div style={contentContainerStyle}>
          <div style={accentBoxStyle('#0891b2', '#f8fafc')}>
            <div style={iconHeaderStyle}>
              <FileText size={16} color="#0891b2" />
            </div>
            <div>
              <strong style={{ color: '#0f172a', fontSize: '14px', display: 'block', marginBottom: '4px' }}>1. Quality & ISO Standard Adherence</strong>
              <p style={paragraphStyle}>
                All Quality Defect Reports (NCR, CAR, QDDR) submitted into QFlow must accurately reflect verified operational data and comply with active ISO 22000 food safety and quality management standards.
              </p>
            </div>
          </div>

          <div style={accentBoxStyle('#0f172a', '#f8fafc')}>
            <div style={iconHeaderStyle}>
              <ShieldCheck size={16} color="#0f172a" />
            </div>
            <div>
              <strong style={{ color: '#0f172a', fontSize: '14px', display: 'block', marginBottom: '4px' }}>2. Data Integrity & Verification</strong>
              <p style={paragraphStyle}>
                Users agree that all reported non-conformances, investigation details, and root-cause evidence provided are genuine, non-falsified, and subject to audit verification.
              </p>
            </div>
          </div>
        </div>

        {/* Agreement Action Footer */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ accentColor: '#0891b2', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
              I have read and agree to comply with the <strong style={{ color: '#0f172a' }}>ISO Compliance Terms & Conditions</strong>.
            </span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
}

/* --- Inline Symmetrical Presentation Styles --- */
const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(15, 23, 42, 0.3)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px',
  boxSizing: 'border-box'
};

const modalStyle = {
  position: 'relative',
  width: '100%',
  maxWidth: '620px',
  background: '#ffffff',
  border: '1px solid #cbd5e1',
  boxShadow: '0 24px 60px rgba(0, 0, 0, 0.1)',
  borderRadius: '16px',
  padding: '40px 32px 32px 32px',
  boxSizing: 'border-box'
};

const closeButtonStyle = {
  position: 'absolute',
  top: '20px',
  right: '20px',
  background: 'rgba(0, 0, 0, 0.05)',
  border: '1px solid #cbd5e1',
  color: '#64748b',
  borderRadius: '50%',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

const titleStyle = {
  margin: '0 0 24px 0',
  fontSize: '18px',
  fontWeight: '700',
  letterSpacing: '0.5px',
  textAlign: 'left',
  color: '#0f172a',
  borderBottom: '1px solid #e2e8f0',
  paddingBottom: '16px'
};

const contentContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  maxHeight: '65vh',
  overflowY: 'auto',
  paddingRight: '6px'
};

const accentBoxStyle = (borderColor, bgColor) => ({
  borderLeft: `3px solid ${borderColor}`,
  background: bgColor,
  borderTop: '1px solid #e2e8f0',
  borderRight: '1px solid #e2e8f0',
  borderBottom: '1px solid #e2e8f0',
  padding: '14px 16px',
  borderRadius: '0 10px 10px 0',
  textAlign: 'left'
});

const iconHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px',
  marginBottom: '6px'
};

const paragraphStyle = {
  margin: 0,
  fontSize: '13.5px',
  lineHeight: '1.6',
  color: '#334155',
  textAlign: 'justify'
};