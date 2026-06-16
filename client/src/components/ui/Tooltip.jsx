import React, { useState, useRef } from 'react';

/**
 * Tooltip Component
 * Path: client/src/components/common/Tooltip.jsx
 * * Renders an optimized contextual micro-overlay on hover or focus events.
 * Implements position routing configurations and matches dark UI design system tokens.
 */
export default function Tooltip({ 
  text, 
  children, 
  position = 'top', // 'top' | 'bottom' | 'left' | 'right'
  delay = 200,      // Delay in milliseconds before showing the overlay
  styleOverrides = {} 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef(null);
  const triggerRef = useRef(null);

  if (!text) return <>{children}</>;

  // ── Interaction Timers: Show Overlay With Delay ──
  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  // ── Interaction Timers: Instantly Hide Overlay ──
  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  // Maps alignment tokens securely across orientation vectors
  const getPositionStyles = (pos) => {
    switch (pos) {
      case 'bottom':
        return {
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%) translateY(8px)',
        };
      case 'left':
        return {
          top: '50%',
          right: '100%',
          transform: 'translateY(-50%) translateX(-8px)',
        };
      case 'right':
        return {
          top: '50%',
          left: '100%',
          transform: 'translateY(-50%) translateX(8px)',
        };
      case 'top':
      default:
        return {
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%) translateY(-8px)',
        };
    }
  };

  // Maps corresponding placement for the tiny indicator arrow
  const getArrowStyles = (pos) => {
    switch (pos) {
      case 'bottom':
        return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', borderBottomColor: '#1E293B' };
      case 'left':
        return { left: '100%', top: '50%', transform: 'translateY(-50%)', borderLeftColor: '#1E293B' };
      case 'right':
        return { right: '100%', top: '50%', transform: 'translateY(-50%)', borderRightColor: '#1E293B' };
      case 'top':
      default:
        return { top: '100%', left: '50%', transform: 'translateX(-50%)', borderTopColor: '#1E293B' };
    }
  };

  const positionStyle = getPositionStyles(position);
  const arrowStyle = getArrowStyles(position);

  return (
    <div
      ref={triggerRef}
      style={styles.wrapperContainer}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {/* Target element slot trigger */}
      {children}

      {/* Floating Tooltip Bubble Markup */}
      {isVisible && (
        <div 
          style={{ ...styles.tooltipBubble, ...positionStyle, ...styleOverrides }}
          role="tooltip"
        >
          {/* Internal text string wrapper */}
          <span style={styles.tooltipText}>{text}</span>
          
          {/* Visual indicator triangle anchor */}
          <div style={{ ...styles.arrowIndicator, ...arrowStyle }} />
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  wrapperContainer: {
    position: 'relative',
    display: 'inline-block',
    width: 'fit-content',
  },
  tooltipBubble: {
    position: 'absolute',
    background: '#111827',
    border: '1px solid #1E293B',
    borderRadius: '6px',
    padding: '6px 10px',
    color: '#E2E8F0',
    whiteSpace: 'nowrap',
    zIndex: 1200,
    pointerEvents: 'none', // Prevents mouse catching anomalies during layout transitions
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    animation: 'tooltipFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  tooltipText: {
    display: 'block',
    lineHeight: '1.3',
  },
  arrowIndicator: {
    position: 'absolute',
    borderWidth: '5px',
    borderStyle: 'solid',
    borderColor: 'transparent',
    width: 0,
    height: 0,
  },
};