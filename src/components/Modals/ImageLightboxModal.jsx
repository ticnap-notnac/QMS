import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

export default function ImageLightboxModal({
  isOpen,
  onClose,
  images = [],
  initialIndex = 0,
  title = ''
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex >= 0 && initialIndex < images.length ? initialIndex : 0)
      setScale(1)
    }
  }, [isOpen, initialIndex, images.length])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
        setScale(1)
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
        setScale(1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, images.length, onClose])

  if (!isOpen || !images || images.length === 0) return null

  const currentImage = images[currentIndex] || images[0]
  const currentLabel = typeof currentImage === 'string' && currentImage.startsWith('data:')
    ? `Evidence Photo ${currentIndex + 1}`
    : decodeURIComponent(String(currentImage).split('/').pop()?.split('?')[0] || `Attachment ${currentIndex + 1}`)

  const handlePrev = (e) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
    setScale(1)
  }

  const handleNext = (e) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
    setScale(1)
  }

  const handleZoomIn = (e) => {
    e.stopPropagation()
    setScale((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 3))
  }

  const handleZoomOut = (e) => {
    e.stopPropagation()
    setScale((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.5))
  }

  const handleResetZoom = (e) => {
    e.stopPropagation()
    setScale(1)
  }

  const handleDownload = (e) => {
    e.stopPropagation()
    try {
      const a = document.createElement('a')
      a.href = currentImage
      a.download = currentLabel ? (currentLabel.endsWith('.jpg') || currentLabel.endsWith('.png') ? currentLabel : `${currentLabel}.jpg`) : 'evidence-photo.jpg'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      // Fallback
    }
  }

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        animation: 'fadeIn 0.15s ease-out',
        userSelect: 'none'
      }}
    >
      {/* Top Header / Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1240px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#ffffff',
          zIndex: 10,
          padding: '4px 0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
            {title ? `${title} — ` : ''}{currentLabel}
          </span>
          {images.length > 1 && (
            <span style={{
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.16)',
              color: '#e2e8f0',
              fontWeight: 500
            }}>
              {currentIndex + 1} of {images.length}
            </span>
          )}
          {scale !== 1 && (
            <span style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(56, 189, 248, 0.2)',
              color: '#38bdf8',
              fontWeight: 600
            }}>
              {Math.round(scale * 100)}%
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {scale !== 1 && (
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset Zoom"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                borderRadius: '6px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
            >
              <RotateCcw size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom out"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              borderRadius: '6px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
          >
            <ZoomOut size={17} />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom in"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              borderRadius: '6px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
          >
            <ZoomIn size={17} />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="Download image"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              borderRadius: '6px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
          >
            <Download size={17} />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            style={{
              background: 'rgba(239, 68, 68, 0.25)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#fca5a5',
              borderRadius: '6px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginLeft: '4px'
            }}
          >
            <X size={19} />
          </button>
        </div>
      </div>

      {/* Main image viewer area */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '12px'
        }}
      >
        {/* Prev button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            title="Previous image (Left arrow)"
            style={{
              position: 'absolute',
              left: '20px',
              zIndex: 20,
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              transition: 'transform 0.15s, background 0.15s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)'
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.95)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)'
            }}
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* The Image */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '92vw',
            maxHeight: '82vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease-out',
            transform: `scale(${scale})`
          }}
        >
          <img
            src={currentImage}
            alt={currentLabel}
            style={{
              maxWidth: '92vw',
              maxHeight: '82vh',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: '#090d16'
            }}
          />
        </div>

        {/* Next button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            title="Next image (Right arrow)"
            style={{
              position: 'absolute',
              right: '20px',
              zIndex: 20,
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              transition: 'transform 0.15s, background 0.15s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)'
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.95)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)'
            }}
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Bottom Bar / Hint */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          color: '#94a3b8',
          fontSize: '12px',
          textAlign: 'center',
          padding: '4px 0'
        }}
      >
        Click outside or press <kbd style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 5px', borderRadius: '4px', color: '#f1f5f9' }}>Esc</kbd> to close {images.length > 1 ? '• Use arrow keys to navigate' : ''}
      </div>
    </div>,
    document.body
  )
}
