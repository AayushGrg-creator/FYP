import React from 'react';

/**
 * Button Component
 * Path: client/src/components/common/Button.jsx
 * * A scalable, reusable button for managing actions across the platform.
 * Supports loading parameters, state overrides, and seamless theme variations.
 */
export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
  size = 'md',          // 'sm' | 'md' | 'lg'
  isLoading = false,
  isDisabled = false,
  leftIcon,
  rightIcon,
  styleOverrides = {},
  ...props
}) {
  
  // ── Theme Mapping Token Config Matrix ──
  const variantStyles = {
    primary: {
      background: '#0EA5E9',
      color: '#ffffff',
      border: '1px solid #0284C7',
    },
    secondary: {
      background: '#1E293B',
      color: '#E2E8F0',
      border: '1px solid #334155',
    },
    danger: {
      background: '#EF4444',
      color: '#ffffff',
      border: '1px solid #DC2626',
    },
    success: {
      background: '#10B981',
      color: '#ffffff',
      border: '1px solid #059669',
    },
    ghost: {
      background: 'transparent',
      color: '#94A3B8',
      border: '1px solid transparent',
    }
  };

  const sizeStyles = {
    sm: {
      padding: '8px 14px',
      fontSize: '13px',
      borderRadius: '6px',
    },
    md: {
      padding: '12px 20px',
      fontSize: '14.5px',
      borderRadius: '8px',
    },
    lg: {
      padding: '16px 28px',
      fontSize: '16px',
      borderRadius: '10px',
    }
  };

  const currentVariant = variantStyles[variant] || variantStyles.primary;
  const currentSize = sizeStyles[size] || sizeStyles.md;
  
  const finalDisabled = isDisabled || isLoading;

  return (
    <button
      type={props.type || 'button'}
      disabled={finalDisabled}
      style={{
        ...styles.baseButton,
        ...currentVariant,
        ...currentSize,
        ...(finalDisabled ? styles.disabledState : {}),
        ...styleOverrides
      }}
      {...props}
    >
      {/* ── Spinner Pipeline Indicator ── */}
      {isLoading && (
        <span style={styles.spinner} aria-hidden="true">
          ◌
        </span>
      )}

      {/* ── Left Decorative Graphic Lane ── */}
      {!isLoading && leftIcon && <span style={styles.iconWrapper}>{leftIcon}</span>}

      {/* ── Child Element Content Track ── */}
      <span style={{ 
        ...styles.textLabel, 
        opacity: isLoading ? 0.7 : 1 
      }}>
        {isLoading ? 'Processing Vector...' : children}
      </span>

      {/* ── Right Decorative Graphic Lane ── */}
      {!isLoading && rightIcon && <span style={styles.iconWrapper}>{rightIcon}</span>}
    </button>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  baseButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 700,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    cursor: 'pointer',
    transition: 'background 0.15s ease, transform 0.1s ease, border-color 0.15s ease',
    boxSizing: 'border-box',
    userSelect: 'none',
    lineHeight: 1.2,
    outline: 'none',
  },
  disabledState: {
    background: '#1E293B',
    borderColor: '#334155',
    color: '#64748B',
    cursor: 'not-allowed',
    transform: 'none',
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: '1.1em',
  },
  textLabel: {
    display: 'inline-block',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
    fontSize: '16px',
    fontWeight: 400,
  }
};