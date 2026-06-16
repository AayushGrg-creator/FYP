import React from 'react';

/**
 * Badge Component
 * Path: client/src/components/common/Badge.jsx
 * * Renders contextual indicator tokens for status trackers and skill clouds.
 * Maps flexible style parameters cleanly while preserving responsive string wrappers.
 */
export default function Badge({ 
  text, 
  variant = 'info', // 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'brand'
  size = 'md',      // 'sm' | 'md'
  icon, 
  isRounded = false,
  styleOverrides = {} 
}) {
  if (!text) return null;

  // ── Theme Mapping Token Config Matrix ──
  const variantStyles = {
    info: {
      background: '#0F2235',
      color: '#38BDF8',
      borderColor: '#0EA5E9',
    },
    success: {
      background: '#0F2F21',
      color: '#34D399',
      borderColor: '#10B981',
    },
    warning: {
      background: '#3B2A12',
      color: '#FBBF24',
      borderColor: '#F59E0B',
    },
    danger: {
      background: '#3B1212',
      color: '#F87171',
      borderColor: '#EF4444',
    },
    neutral: {
      background: '#1E293B',
      color: '#94A3B8',
      borderColor: '#334155',
    },
    brand: {
      background: '#231437',
      color: '#C084FC',
      borderColor: '#8B5CF6',
    }
  };

  const sizeStyles = {
    sm: {
      padding: '2px 6px',
      fontSize: '11px',
    },
    md: {
      padding: '4px 10px',
      fontSize: '12px',
    }
  };

  const currentVariant = variantStyles[variant] || variantStyles.info;
  const currentSize = sizeStyles[size] || sizeStyles.md;

  return (
    <span
      style={{
        ...styles.badge,
        ...currentVariant,
        ...currentSize,
        borderRadius: isRounded ? '9999px' : '6px',
        ...styleOverrides
      }}
    >
      {icon && <span style={styles.iconWrapper}>{icon}</span>}
      <span style={styles.textContainer}>{text}</span>
    </span>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    border: '1px solid transparent',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    lineHeight: 1,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    width: 'fit-content',
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1em',
    flexShrink: 0,
  },
  textContainer: {
    display: 'inline-block',
    marginTop: '-0.5px', // Micro-alignment adjustment for precise text centering
  },
};