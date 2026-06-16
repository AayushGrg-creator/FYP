import React from 'react';

/**
 * LoadingSpinner Component
 * Path: client/src/components/common/LoadingSpinner.jsx
 * * A high-quality, production-ready fullscreen or inline loading spinner.
 * Uses inline styles and matches the TaskTide background styling hierarchy.
 */
export default function LoadingSpinner({ fullscreen = false }) {
  const containerStyle = fullscreen ? styles.fullscreenPage : styles.inlineWrap;

  return (
    <div style={containerStyle}>
      <div style={styles.spinnerWrap}>
        <div style={styles.spinner} />
        <p style={styles.spinnerText}>Processing...</p>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  fullscreenPage: {
    minHeight: '100vh',
    width: '100vw',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  inlineWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    width: '100%',
  },
  spinnerWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  spinner: {
    width: 48,
    height: 48,
    border: '4px solid rgba(255, 255, 255, 0.25)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  spinnerText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: 500,
    margin: 0,
    letterSpacing: '0.02em',
  },
};