import React from 'react';

/**
 * BadgeDisplay Component
 * Path: client/src/components/common/BadgeDisplay.jsx
 * * Renders high-quality, professional badges representing a user's verified platform standing.
 * Seamlessly visualizes trust assessment weights and milestones inside dashboards and profiles.
 */
export default function BadgeDisplay({ badgeType = 'verified', size = 'medium' }) {
  
  // ── Badge Metadata Dictionary ──
  const badgeConfig = {
    verified: {
      label: 'Verified Identity',
      icon: '🛡️',
      bgColor: '#EEF2F6',
      textColor: '#334155',
      borderColor: '#CBD5E1',
      description: 'Identity cross-checked and verified via system safety parameters.',
    },
    topRated: {
      label: 'Top Rated',
      icon: '👑',
      bgColor: '#FEF3C7',
      textColor: '#92400E',
      borderColor: '#FCD34D',
      description: 'Maintained exceptional project completion rates and client reviews.',
    },
    escrowSecure: {
      label: 'Escrow Protected',
      icon: '🔒',
      bgColor: '#ECFDF5',
      textColor: '#065F46',
      borderColor: '#A7F3D0',
      description: 'Financial transactions safely bound and protected by our escrow subsystem.',
    },
    expertDeveloper: {
      label: 'Expert Developer',
      icon: '🧠',
      bgColor: '#EEF2FF',
      textColor: '#3730A3',
      borderColor: '#C7D2FE',
      description: 'Successfully passed algorithmic and structural skill validation matrices.',
    },
    fastResponder: {
      label: 'Fast Responder',
      icon: '⚡',
      bgColor: '#FFF5F5',
      textColor: '#9B2C2C',
      borderColor: '#FEB2B2',
      description: 'Consistently replies to inquiries within a 2-hour communication boundary.',
    }
  };

  const currentBadge = badgeConfig[badgeType] || badgeConfig.verified;
  const currentDimensions = styles.sizes[size] || styles.sizes.medium;

  const dynamicBadgeStyle = {
    ...styles.badgeBase,
    ...currentDimensions,
    backgroundColor: currentBadge.bgColor,
    color: currentBadge.textColor,
    border: `1.5px solid ${currentBadge.borderColor}`,
  };

  return (
    <div style={styles.container} title={currentBadge.description}>
      <div style={dynamicBadgeStyle}>
        <span style={styles.iconSpan}>{currentBadge.icon}</span>
        <span style={styles.labelSpan}>{currentBadge.label}</span>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    display: 'inline-block',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    cursor: 'help', // Indicates tooltips are available on hover
    userSelect: 'none',
  },
  badgeBase: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    transition: 'transform 0.15s ease-in-out',
  },
  iconSpan: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelSpan: {
    whiteSpace: 'nowrap',
  },
  
  // Dynamic sizing map controls
  sizes: {
    small: {
      padding: '4px 8px',
      fontSize: '11px',
      gap: '4px',
    },
    medium: {
      padding: '6px 12px',
      fontSize: '13px',
      gap: '6px',
    },
    large: {
      padding: '8px 16px',
      fontSize: '15px',
      gap: '8px',
    }
  }
};