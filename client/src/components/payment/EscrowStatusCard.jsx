import React from 'react';

/**
 * EscrowStatusCard Component
 * Path: client/src/components/finances/EscrowStatusCard.jsx
 * * Displays secure financial parameters, vault holds, and milestone disbursements.
 * Renders operational summaries and handles localized NPR calculation matrix tracking.
 */
export default function EscrowStatusCard({ escrowData }) {
  if (!escrowData) return null;

  // Destructure deep metrics securely with stable fallbacks
  const {
    contractId = '',
    jobTitle = 'Contract Agreement',
    totalAgreedAmount = 0,
    heldInEscrow = 0,
    disbursedToDate = 0,
    disputedAmount = 0,
    vaultStatus = 'inactive', // inactive | held | disputed | released
    lastTransactionDate
  } = escrowData;

  // Localized currency formatting helper mapping parameters directly into NPR structures
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Maps global financial states to corresponding design tokens and labels
  const getVaultStatusDetails = (status) => {
    switch (status) {
      case 'held':
        return { bg: '#0F2235', text: '#0EA5E9', border: '#0EA5E9', label: 'Secured in Escrow' };
      case 'disputed':
        return { bg: '#3B1212', text: '#EF4444', border: '#EF4444', label: 'Funds Locked / Disputed' };
      case 'released':
        return { bg: '#0F2F21', text: '#10B981', border: '#10B981', label: 'Fully Disbursed' };
      default:
        return { bg: '#1E293B', text: '#94A3B8', border: '#334155', label: 'No Active Escrow Hold' };
    }
  };

  const statusConfig = getVaultStatusDetails(vaultStatus);

  // Compute balance breakdown metrics safely
  const safeHeld = Number(heldInEscrow) || 0;
  const safeTotal = Number(totalAgreedAmount) || 1; // Prevent divide by zero errors
  const fundingRatio = Math.min(Math.round((safeHeld / safeTotal) * 100), 100);

  return (
    <div style={styles.card}>
      {/* ── Top Header Track: Context Title & State Badge ── */}
      <div style={styles.cardHeader}>
        <div style={styles.titleGroup}>
          <span style={styles.metaLabel}>Financial Tracker</span>
          <h3 style={styles.projectTitle}>{jobTitle}</h3>
        </div>
        <span style={{
          ...styles.statusBadge,
          backgroundColor: statusConfig.bg,
          color: statusConfig.text,
          borderColor: statusConfig.border
        }}>
          {statusConfig.label}
        </span>
      </div>

      {/* ── Core Value Spotlight ── */}
      <div style={styles.spotlightRow}>
        <div style={styles.spotlightItem}>
          <span style={styles.spotlightLabel}>Currently Held Secure</span>
          <span style={styles.spotlightValue}>{formatCurrency(heldInEscrow)}</span>
        </div>
        <div style={styles.ratioCircle}>
          <span style={styles.ratioNumber}>{fundingRatio}%</span>
          <span style={styles.ratioSub}>Funded</span>
        </div>
      </div>

      {/* ── Allocation Progress Ratio Bar ── */}
      <div style={styles.progressContainer}>
        <div style={styles.progressBarBg}>
          <div style={{ 
            ...styles.progressBarFill, 
            width: `${fundingRatio}%`,
            background: vaultStatus === 'disputed' ? '#EF4444' : 'linear-gradient(90deg, #0EA5E9, #10B981)'
          }} />
        </div>
      </div>

      {/* ── Detailed Financial Parameters Matrix ── */}
      <div style={styles.detailsGrid}>
        <div style={styles.detailItem}>
          <span style={styles.gridLabel}>Total Value</span>
          <span style={styles.gridValue}>{formatCurrency(totalAgreedAmount)}</span>
        </div>
        <div style={styles.detailItem}>
          <span style={styles.gridLabel}>Disbursed Funds</span>
          <span style={{ ...styles.gridValue, color: '#10B981' }}>{formatCurrency(disbursedToDate)}</span>
        </div>
        <div style={styles.detailItem}>
          <span style={styles.gridLabel}>Arbitration Hold</span>
          <span style={{ ...styles.gridValue, color: disputedAmount > 0 ? '#EF4444' : '#F1F5F9' }}>
            {formatCurrency(disputedAmount)}
          </span>
        </div>
      </div>

      <div style={styles.divider} />

      {/* ── Footer Metadata & Safety Alerts ── */}
      <div style={styles.cardFooter}>
        {vaultStatus === 'disputed' ? (
          <div style={styles.alertNotice}>
            ⚠️ <strong>Arbitration Lock Active:</strong> Escrow payouts are frozen until the resolution sequence evaluates.
          </div>
        ) : (
          <div style={styles.syncContainer}>
            <span style={styles.syncLabel}>Last Ledger Entry:</span>
            <span style={styles.syncValue}>
              {lastTransactionDate ? new Date(lastTransactionDate).toLocaleDateString('en-NP', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }) : 'N/A'}
            </span>
          </div>
        )}
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
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  titleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metaLabel: {
    color: '#64748B',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  projectTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 700,
    color: '#F1F5F9',
    lineHeight: '1.4',
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    border: '1px solid transparent',
  },
  spotlightRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#0B1120',
    padding: '16px 20px',
    borderRadius: '10px',
    border: '1px solid #1E293B',
    marginBottom: '16px',
  },
  spotlightItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  spotlightLabel: {
    fontSize: '12px',
    color: '#94A3B8',
    fontWeight: 500,
  },
  spotlightValue: {
    fontSize: '26px',
    fontWeight: 800,
    color: '#F1F5F9',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
  },
  ratioCircle: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#111827',
    border: '2px solid #1E293B',
    width: '54px',
    height: '54px',
    borderRadius: '50%',
  },
  ratioNumber: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#E2E8F0',
    fontVariantNumeric: 'tabular-nums',
  },
  ratioSub: {
    fontSize: '8px',
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  progressContainer: {
    marginBottom: '20px',
    width: '100%',
  },
  progressBarBg: {
    height: '6px',
    background: '#1E293B',
    borderRadius: '3px',
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.4s ease',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  gridLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  gridValue: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#E2E8F0',
    fontVariantNumeric: 'tabular-nums',
  },
  divider: {
    height: '1px',
    background: '#1E293B',
    marginBottom: '16px',
    marginTop: 'auto',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  alertNotice: {
    width: '100%',
    fontSize: '12.5px',
    color: '#FCA5A5',
    background: '#2A1212',
    border: '1px solid #7F1D1D',
    padding: '10px 12px',
    borderRadius: '6px',
    lineHeight: '1.4',
  },
  syncContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    fontSize: '12px',
  },
  syncLabel: {
    color: '#64748B',
    fontWeight: 500,
  },
  syncValue: {
    color: '#94A3B8',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  }
};