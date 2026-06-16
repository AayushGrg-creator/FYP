import React, { useEffect } from 'react';

/**
 * Modal Component
 * Path: client/src/components/common/Modal.jsx
 * * A uniform, highly accessible layout overlay for managing modal views.
 * Handles background click dismissals, blur parameters, and Escape key events.
 */
export default function Modal({ 
  children, 
  isOpen, 
  onClose, 
  maxWidth = '500px',
  styleOverrides = {} 
}) {
  
  // ── Keyboard Event Hook: Catch Escape Key to Close ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    
    if (isOpen) {
      // Prevent background page scrolling when modal viewport is active
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      // Re-enable body scroll and remove event triggers on cleanup
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      style={styles.overlay} 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* ── Content Container: Stop Click Bubble Propagation ── */}
      <div 
        style={{
          ...styles.contentCard,
          maxWidth: maxWidth,
          ...styleOverrides
        }}
        onClick={(e) => e.stopPropagation()} // Keeps modal open when clicking inside
      >
        {/* Optional Close Top-Right Button Anchor */}
        {onClose && (
          <button 
            type="button" 
            style={styles.closeBtn} 
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        )}

        {/* Modal Payload Slot */}
        <div style={styles.body}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(3, 7, 18, 0.82)', // Deep slate translucent layer
    backdropFilter: 'blur(6px)',       // Modern backdrop blur effect
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,                     // Ensures modal sits on top of navbar elements
    padding: '20px',
    boxSizing: 'border-box',
  },
  contentCard: {
    background: '#111827',             // Dark theme panel background
    border: '1px solid #1E293B',       // Slate border configuration
    borderRadius: '14px',
    width: '100%',
    position: 'relative',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 40px)',   // Prevent modal overflow on small mobile displays
    overflow: 'hidden',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '18px',
    background: 'transparent',
    border: 'none',
    color: '#64748B',
    fontSize: '24px',
    fontWeight: 400,
    cursor: 'pointer',
    padding: '4px',
    lineHeight: 0.7,
    zIndex: 10,
    transition: 'color 0.15s ease',
    outline: 'none',
  },
  body: {
    padding: '24px',
    overflowY: 'auto',                // Allows internal scrolling for longer forms
    boxSizing: 'border-box',
    width: '100%',
  },
};