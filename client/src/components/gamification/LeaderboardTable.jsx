import React from 'react';
import LeaderboardRow from './LeaderboardRow';

/**
 * LeaderboardTable Component
 * Path: client/src/components/leaderboard/LeaderboardTable.jsx
 * * Manages the layout container for platform freelancer rankings.
 * Enforces proper data alignment mapping and handles zero-state layout fallbacks.
 */
export default function LeaderboardTable({ freelancers = [], isLoading = false }) {
  
  // ── Loading Skeleton Render Fallback ──
  if (isLoading) {
    return (
      <div style={styles.loadingBox}>
        <div style={styles.skeletonSpinner} />
        <p style={styles.loadingText}>Fetching elite platform rankings...</p>
      </div>
    );
  }

  // ── Zero-State Array Fallback Check ──
  if (!freelancers || freelancers.length === 0) {
    return (
      <div style={styles.emptyBox}>
        <span style={styles.emptyIcon}>📭</span>
        <h3 style={styles.emptyTitle}>No Rankings Found</h3>
        <p style={styles.emptySubtitle}>
          There are no matching freelancers on record for this tracking milestone segment yet.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.tableResponsiveWrapper}>
      <table style={styles.table}>
        
        {/* ── Structured Grid Header Matrix ── */}
        <thead>
          <tr style={styles.headerRow}>
            <th style={{ ...styles.th, width: '70px' }}>Rank</th>
            <th style={styles.th}>Freelancer Specialist</th>
            <th style={{ ...styles.th, width: '160px' }}>Trust Rating Matrix</th>
            <th style={styles.th}>Skill Expertise</th>
            <th style={{ ...styles.th, ...styles.numericTh, width: '150px' }}>Total Volume</th>
            <th style={{ ...styles.th, ...styles.numericTh, width: '130px' }}>Contracts</th>
          </tr>
        </thead>

        {/* ── Rows Generation Target Scope ── */}
        <tbody>
          {freelancers.map((freelancer, index) => (
            <LeaderboardRow 
              key={freelancer._id || index} 
              freelancer={freelancer} 
              rank={index + 1} 
            />
          ))}
        </tbody>

      </table>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  tableResponsiveWrapper: {
    width: '100%',
    overflowX: 'auto', // Enforces graceful multi-column breakdown scroll tracking on mobile views
    background: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #E5E7EB',
    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
    boxSizing: 'border-box',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  headerRow: {
    background: '#F9FAFB',
    borderBottom: '2px solid #E5E7EB',
  },
  th: {
    padding: '16px 20px',
    fontSize: '13px',
    fontWeight: 700,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
  numericTh: {
    textAlign: 'right',
  },
  
  // Asynchronous status feedback overlays
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    background: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #E5E7EB',
    gap: '16px',
  },
  skeletonSpinner: {
    width: '36px',
    height: '36px',
    border: '3.5px solid #F3F4F6',
    borderTopColor: '#7C3AED',
    borderRadius: '50%',
    animation: 'spin 0.75s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6B7280',
    margin: 0,
  },

  // Empty data condition block styles
  emptyBox: {
    textAlign: 'center',
    padding: '64px 32px',
    background: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #E5E7EB',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  emptyIcon: {
    fontSize: '44px',
    display: 'block',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1E1B4B',
    margin: '0 0 6px 0',
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0,
    maxWidth: '340px',
    marginLeft: 'auto',
    marginRight: 'auto',
    lineHeight: '1.5',
  }
};