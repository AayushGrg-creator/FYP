import React from 'react';

/**
 * ProposalCard Component
 * Path: client/src/components/marketplace/ProposalCard.jsx
 * * Renders incoming freelancer job bids with matching parameters.
 * Employs automated currency formatting metrics and contextual interaction hooks.
 */
export default function ProposalCard({ proposalData, onAccept, onReject, isProcessing = false }) {
  if (!proposalData) return null;

  const {
    freelancerName = 'Specialist Contractor',
    avatarUrl = '',
    title = 'Full-Stack Developer',
    bidAmount = 0,
    deliveryDays = 0,
    coverLetter = '',
    aiMatchScore = 0,
    skills = []
  } = proposalData;

  // Localized currency formatter rendering metrics in NPR structures
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Helper utility to flag match tiers programmatically
  const getMatchBadgeStyle = (score) => {
    if (score >= 85) return { bg: '#0F2F21', text: '#10B981', label: 'Strong AI Match' };
    if (score >= 70) return { bg: '#3B2A12', text: '#F59E0B', label: 'Good Match' };
    return { bg: '#1E293B', text: '#94A3B8', label: 'Standard Match' };
  };

  const matchStyle = getMatchBadgeStyle(aiMatchScore);

  return (
    <div style={styles.card}>
      {/* ── Top Info Track: Identity Block & AI Match Vectors ── */}
      <div style={styles.headerRow}>
        <div style={styles.profileBlock}>
          <div style={styles.avatarFrame}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={freelancerName} style={styles.avatar} />
            ) : (
              <span style={styles.avatarPlaceholder}></span>
            )}
          </div>
          <div style={styles.metaData}>
            <h4 style={styles.freelancerName}>{freelancerName}</h4>
            <span style={styles.freelancerTitle}>{title}</span>
          </div>
        </div>

        <div style={{ ...styles.aiBadge, backgroundColor: matchStyle.bg, color: matchStyle.text }}>
          <span style={styles.aiSparkle}>✦</span> {matchStyle.label} ({aiMatchScore}%)
        </div>
      </div>

      {/* ── Proposal Text Payload ── */}
      <div style={styles.coverLetterSection}>
        <p style={styles.coverLetterText}>{coverLetter}</p>
      </div>

      {/* ── Skill Matrix Alignment Tags ── */}
      {skills.length > 0 && (
        <div style={styles.skillsCloud}>
          {skills.map((skill, idx) => (
            <span key={idx} style={styles.skillTag}>
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* ── Core Bid Parameters Breakdown ── */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricItem}>
          <span style={styles.metricLabel}>Proposed Bid Total</span>
          <span style={styles.metricValue}>{formatCurrency(bidAmount)}</span>
        </div>
        <div style={styles.metricItem}>
          <span style={styles.metricLabel}>Estimated Timeline</span>
          <span style={styles.metricValue}>{deliveryDays} Days</span>
        </div>
      </div>

      <div style={styles.divider} />

      {/* ── Action Control Buttons ── */}
      <div style={styles.actionRow}>
        <button
          type="button"
          onClick={onReject}
          disabled={isProcessing}
          style={styles.rejectBtn}
        >
          Decline
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={isProcessing}
          style={{ ...styles.acceptBtn, ...(isProcessing ? styles.disabledBtn : {}) }}
        >
          {isProcessing ? 'Processing Contract...' : 'Accept Proposal & Fund Escrow'}
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  card: {
    background: '#111827',
    border: '1px solid #1E293B',
    borderRadius: 14,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxSizing: 'border-box',
    width: '100%',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  profileBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  avatarFrame: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    background: '#0B1120',
    border: '1px solid #334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatar: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    fontSize: '20px',
    color: '#64748B',
  },
  metaData: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  freelancerName: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 700,
    color: '#F1F5F9',
  },
  freelancerTitle: {
    fontSize: '12.5px',
    color: '#64748B',
    fontWeight: 500,
  },
  aiBadge: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
  },
  aiSparkle: {
    fontSize: '12px',
  },
  coverLetterSection: {
    background: '#0B1120',
    border: '1px solid #1E293B',
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '14px',
  },
  coverLetterText: {
    margin: 0,
    fontSize: '13.5px',
    color: '#94A3B8',
    lineHeight: '1.5',
    whiteSpace: 'pre-line',
  },
  skillsCloud: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '18px',
  },
  skillTag: {
    background: '#1E293B',
    color: '#E2E8F0',
    fontSize: '12px',
    fontWeight: 500,
    padding: '3px 8px',
    borderRadius: '4px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '20px',
    background: '#0B1120',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #1E293B',
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metricLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  metricValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#F1F5F9',
    fontVariantNumeric: 'tabular-nums',
  },
  divider: {
    height: '1px',
    background: '#1E293B',
    marginBottom: '16px',
    marginTop: 'auto',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    flexWrap: 'wrap',
  },
  rejectBtn: {
    background: 'transparent',
    border: '1px solid #1E293B',
    color: '#94A3B8',
    borderRadius: '6px',
    padding: '10px 18px',
    fontSize: '13.5px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  acceptBtn: {
    background: '#0EA5E9',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '13.5px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s ease',
  },
  disabledBtn: {
    background: '#1E293B',
    color: '#475569',
    cursor: 'not-allowed',
  }
};