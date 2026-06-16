import React from 'react';

/**
 * Input Component
 * Path: client/src/components/common/Input.jsx
 * * A uniform, theme-aligned input component for all Task Tide forms.
 * Manages reactive validation borders, descriptive helper text, and error states.
 */
export default function Input({
  label,
  error,
  helperText,
  id,
  styleOverrides = {},
  ...props
}) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div style={styles.container}>
      {/* ── Label Element Field Lane ── */}
      {label && (
        <label htmlFor={inputId} style={styles.label}>
          {label}
        </label>
      )}

      {/* ── Base Browser Input Core Node ── */}
      <input
        id={inputId}
        style={{
          ...styles.baseInput,
          borderColor: error ? '#EF4444' : '#1E293B',
          backgroundColor: props.disabled ? '#1E293B' : '#0B1120',
          color: props.disabled ? '#64748B' : '#F1F5F9',
          ...styleOverrides
        }}
        {...props}
      />

      {/* ── Sub-Input Context Messages (Errors / Helpers) ── */}
      {error ? (
        <span style={styles.errorText} role="alert">
          ⚠️ {error}
        </span>
      ) : (
        helperText && <span style={styles.helperText}>{helperText}</span>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxSizing: 'border-box',
  },
  label: {
    color: '#94A3B8',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    width: 'fit-content',
  },
  baseInput: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14.5px',
    fontWeight: 500,
    borderRadius: '8px',
    border: '1px solid #1E293B',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  errorText: {
    color: '#F87171',
    fontSize: '12.5px',
    fontWeight: 600,
    marginTop: '2px',
  },
  helperText: {
    color: '#64748B',
    fontSize: '12px',
    fontWeight: 500,
    marginTop: '2px',
  },
};