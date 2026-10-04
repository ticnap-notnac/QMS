import { useState, useEffect } from 'react'
import { X, Book, HelpCircle, FileText, ExternalLink } from 'lucide-react'
import './HelpSidebar.css'

export default function HelpSidebar({ isOpen, onClose, topic = "General" }) {
  if (!isOpen) return null

  // In a real app, this content might be dynamic or passed as children
  const getTopicContent = () => {
    switch(topic) {
      case 'DCC':
        return (
          <>
            <h4 className="help-section-title">Document Control Center (DCC)</h4>
            <p className="help-text">The DCC is your central hub for managing compliance documents. You can upload files via the drag-and-drop zone, or explore existing folders.</p>
            <ul className="help-list">
              <li><strong>Upload:</strong> Drag files into the top upload zone.</li>
              <li><strong>Filter:</strong> Use the search bar or filter buttons to locate files.</li>
              <li><strong>Preview:</strong> Click any file to open the document viewer.</li>
            </ul>
          </>
        )
      case 'Settings':
        return (
          <>
            <h4 className="help-section-title">User Settings</h4>
            <p className="help-text">Manage your profile, password, and accessibility preferences.</p>
            <ul className="help-list">
              <li><strong>Accessibility:</strong> Enable high contrast or reduce motion.</li>
              <li><strong>Changes:</strong> Unsaved changes will trigger a confirmation before closing.</li>
            </ul>
          </>
        )
      default:
        return (
          <>
            <h4 className="help-section-title">Getting Started</h4>
            <p className="help-text">Welcome to the QMS Platform! Navigate using the sidebar menu to explore modules like ISO Compliance, CAR/NCR reporting, and DCC.</p>
          </>
        )
    }
  }

  return (
    <div className="help-sidebar-overlay" onClick={onClose}>
      <div className={`help-sidebar-container ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="help-sidebar-header">
          <div className="help-sidebar-title-wrap">
            <HelpCircle size={20} className="help-sidebar-icon" />
            <h3>Help & Documentation</h3>
          </div>
          <button className="help-sidebar-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="help-sidebar-content">
          <div className="help-topic-block">
            {getTopicContent()}
          </div>
          
          <hr className="help-divider" />
          
          <h4 className="help-section-title">Quick Links</h4>
          <a href="/docs/user-manual" target="_blank" rel="noopener noreferrer" className="help-quick-link" onClick={(e) => { e.preventDefault(); alert("User Manual is currently being updated. Please check back later."); }}>
            <Book size={16} /> User Manual
          </a>
          <a href="https://www.iso.org/iso-9001-quality-management.html" target="_blank" rel="noopener noreferrer" className="help-quick-link">
            <FileText size={16} /> ISO 9001 Guidelines
          </a>
          <a href="mailto:support@qflow.com" className="help-quick-link">
            <ExternalLink size={16} /> Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}
