import React from 'react';
import { ShieldCheck, Crown, Lock, BrainCircuit, Zap } from 'lucide-react';

/**
 * BadgeDisplay Component
 * Path: client/src/components/common/BadgeDisplay.jsx
 *
 * Renders high-quality, professional badges representing a user's verified platform standing.
 * Seamlessly visualizes trust assessment weights and milestones inside dashboards and profiles.
 */
export default function BadgeDisplay({ badgeType = 'verified', size = 'medium' }) {

  // ── Badge Metadata Dictionary ──
  // `icon` is a Lucide component reference, not an emoji glyph — renders as a
  // crisp, uniformly-styled SVG that inherits currentColor from textColor.
  const badgeConfig = {
    verified: {
      label: 'Verified Identity',
      icon: ShieldCheck,
      bgColor: '#EEF2F6',
      textColor: '#334155',
      borderColor: '#CBD5E1',
      description: 'Identity cross-checked and verified via system safety parameters.',
    },
    topRated: {
      label: 'Top Rated',
      icon: Crown,
      bgColor: '#FEF3C7',
      textColor: '#92400E',
      borderColor: '#FCD34D',
      description: 'Maintained exceptional project completion rates and client reviews.',
    },
    escrowSecure: {
      label: 'Escrow Protected',
      icon: Lock,
      bgColor: '#ECFDF5',
      textColor: '#065F46',
      borderColor: '#A7F3D0',
      description: 'Financial transactions safely bound and protected by our escrow subsystem.',
    },
    expertDeveloper: {
      label: 'Expert Developer',
      icon: BrainCircuit,
      bgColor: '#EEF2FF',
      textColor: '#3730A3',
      borderColor: '#C7D2FE',
      description: 'Successfully passed algorithmic and structural skill validation matrices.',
    },
    fastResponder: {
      label: 'Fast Responder',
      icon: Zap,
      bgColor: '#FFF5F5',
      textColor: '#9B2C2C',
      borderColor: '#FEB2B2',
      description: 'Consistently replies to inquiries within a 2-hour communication boundary.',
    }
  };

  // Icon pixel size per badge size variant
  const iconSizes = {
    small: 12,
    medium: 14,
    large: 17,
  };

  const currentBadge = badgeConfig[badgeType] || badgeConfig.verified;
  const currentDimensions = styles.sizes[size] || styles.sizes.medium;
  const IconComponent = currentBadge.icon;
  const iconPixelSize = iconSizes[size] || iconSizes.medium;

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
        <span style={styles.iconSpan}>
          <IconComponent size={iconPixelSize} strokeWidth={2} color={currentBadge.textColor} />
        </span>
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