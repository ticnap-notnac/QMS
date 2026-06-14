import React from 'react';
import { X, ShieldCheck, Sparkles, Target } from 'lucide-react';
import learnMoreRaw from '../../../LEARN_MORE.md?raw'

export default function IntroModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  // Parse the markdown: extract first heading as title, then split remaining content into paragraphs
  const md = String(learnMoreRaw || '')
  const lines = md.split(/\r?\n/)
  let title = 'Introduction'
  let body = md
  const headingIndex = lines.findIndex((l) => l.trim().startsWith('#'))
  if (headingIndex >= 0) {
    title = lines[headingIndex].replace(/^#+\s*/, '')
    body = lines.slice(headingIndex + 1).join('\n')
  }

  const sections = body
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  const icons = [ShieldCheck, Sparkles, Target]
  const colors = ['#0f172a', '#475569', '#64748b']

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button onClick={onClose} style={closeButtonStyle} aria-label="Close modal">
          <X size={18} />
        </button>

        <h2 style={titleStyle}>{title}</h2>

        <div style={contentContainerStyle}>
          {sections.map((text, i) => {
            const Icon = icons[i % icons.length]
            const color = colors[i % colors.length]
            return (
              <div key={i} style={accentBoxStyle(color, '#f8fafc')}>
                <div style={iconHeaderStyle}>
                  <Icon size={16} color={color} />
                </div>
                <p style={paragraphStyle}>{text}</p>
              </div>
            )
          })}
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