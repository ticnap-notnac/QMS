import React from 'react';
import { X, ShieldCheck, Sparkles, Target } from 'lucide-react';

export default function IntroModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      {/* Glassmorphic Modal Container */}
      <div style={modalStyle}>
        
        {/* Close Window Button */}
        <button onClick={onClose} style={closeButtonStyle} aria-label="Close modal">
          <X size={18} />
        </button>

        {/* Dynamic Gradient Title */}
        <h2 style={titleStyle}>QUALITY MANAGEMENT SYSTEM INTRODUCTION</h2>
        
        {/* Scrollable Document Content Canvas */}
        <div style={contentContainerStyle}>
          
          {/* Paragraph 1 - Core Framework Block */}
          <div style={accentBoxStyle('#3b82f6', 'rgba(59, 130, 246, 0.03)')}>
            <div style={iconHeaderStyle}>
              <ShieldCheck size={16} color="#3b82f6" />
              <strong style={{ color: '#f8fafc' }}>Core System Framework</strong>
            </div>
            <p style={paragraphStyle}>
              Our Quality Management System (QMS) is designed to ensure consistent excellence across 
              all our processes, products, and services. It provides a structured framework that aligns 
              our operations with defined standards, regulatory requirements, and customer expectations.
            </p>
          </div>

          {/* Paragraph 2 - Continuous Improvement Block */}
          <div style={accentBoxStyle('#22d3ee', 'rgba(34, 211, 238, 0.03)')}>
            <div style={iconHeaderStyle}>
              <Sparkles size={16} color="#22d3ee" />
              <strong style={{ color: '#f8fafc' }}>Continuous Enhancement</strong>
            </div>
            <p style={paragraphStyle}>
              At its core, the QMS promotes a culture of continuous improvement, accountability, and 
              efficiency. By establishing clear procedures, measurable objectives, and systematic 
              controls, we are able to monitor performance, identify opportunities for enhancement, 
              and implement effective solutions.
            </p>
          </div>

          {/* Paragraph 3 - Strategic Assets Block */}
          <div style={accentBoxStyle('#6366f1', 'rgba(99, 102, 241, 0.03)')}>
            <div style={iconHeaderStyle}>
              <Target size={16} color="#6366f1" />
              <strong style={{ color: '#f8fafc' }}>Strategic Compliance Operations</strong>
            </div>
            <p style={paragraphStyle}>
              This system is not only a tool for compliance but also a strategic asset that supports 
              our commitment to delivering reliable, high-quality outcomes. It empowers our team to 
              work collaboratively, make informed decisions, and uphold the highest standards in 
              everything we do.
            </p>
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
  background: 'rgba(2, 6, 12, 0.70)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
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
  background: 'rgba(13, 26, 45, 0.65)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
  borderRadius: '16px',
  padding: '40px 32px 32px 32px',
  boxSizing: 'border-box'
};

const closeButtonStyle = {
  position: 'absolute',
  top: '20px',
  right: '20px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: '#94a3b8',
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
  letterSpacing: '1px',
  textAlign: 'left',
  background: 'linear-gradient(135deg, #22d3ee, #3b82f6)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
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
  color: '#94a3b8',
  textAlign: 'justify'
};