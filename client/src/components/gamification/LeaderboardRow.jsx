import React from 'react';
import BadgeDisplay from '../common/BadgeDisplay';

/**
 * LeaderboardRow Component
 * Path: client/src/components/leaderboard/LeaderboardRow.jsx
 * * Renders structured row items for the Top Freelancer Leaderboard interface.
 * Displays ranking position, dynamic trust metrics, skill tags, and validation badges.
 */
export default function LeaderboardRow({ freelancer, rank }) {
  if (!freelancer) return null;

  // Formatting utility to cleanly display earnings metrics in Nepalese Rupees (NPR)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Determine ranking badge styles for top 3 platform positions
  const getRankStyle = (position) => {
    if (position === 1) return { ...styles.rankBadge, backgroundColor: '#FEF3C7', color: '#D97706' }; // Gold
    if (position === 2) return { ...styles.rankBadge, backgroundColor: '#E2E8F0', color: '#475569' }; // Silver
    if (position === 3) return { ...styles.rankBadge, backgroundColor: '#FFEDD5', color: '#C2410C' }; // Bronze
    return styles.rankDefault;
  };

  return (
    <tr style={styles.row}>
      {/* ── Position Column ── */}
      <td style={styles.cell}>
        <div style={getRankStyle(rank)}>
          {rank}
        </div>
      </td>

      {/* ── Profile Information Module Column ── */}
      <td style={styles.cell}>
        <div style={styles.profileCell}>
          <div style={styles.avatar}>
            {freelancer.name ? freelancer.name.charAt(0).toUpperCase() : 'F'}
          </div>
          <div style={styles.metaData}>
            <div style={styles.nameBlock}>
              <span style={styles.nameLabel}>{freelancer.name}</span>
              {freelancer.trustScore >= 90 && (
                <BadgeDisplay badgeType="topRated" size="small" />
              )}
            </div>
            <span style={styles.titleLabel}>{freelancer.professionalTitle || 'Independent Specialist'}</span>
          </div>
        </div>
      </td>

      {/* ── Core Mathematical Trust Score Weight ── */}
      <td style={styles.cell}>
        <div style={styles.scoreContainer}>
          <div style={styles.scoreBarBackground}>
            <div 
              style={{ 
                ...styles.scoreBarFill, 
                width: `${freelancer.trustScore || 0}%`,
                background: freelancer.trustScore >= 85 ? '#10B981' : '#F59E0B'
              }} 
            />
          </div>
          <span style={styles.scoreText}>{freelancer.trustScore}%</span>
        </div>
      </td>

      {/* ── System Skill Taxonomies ── */}
      <td style={styles.cell}>
        <div style={styles.tagCloud}>
          {(freelancer.skills || []).slice(0, 3).map((skill, index) => (
            <span key={index} style={styles.skillTag}>{skill}</span>
          ))}
        </div>
      </td>

      {/* ── Financial Transaction Volume Metrics ── */}
      <td style={{ ...styles.cell, ...styles.numericCell }}>
        <span style={styles.earningsText}>
          {formatCurrency(freelancer.totalEarnings || 0)}
        </span>
      </td>

      {/* ── Project Volume Metric Column ── */}
      <td style={{ ...styles.cell, ...styles.numericCell }}>
        <span style={styles.completedCount}>
          {freelancer.completedProjects || 0} Jobs
        </span>
      </td>
    </tr>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  row: {
    borderBottom: '1px solid #E5E7EB',
    transition: 'background-color 0.15s ease',
  },
  cell: {
    padding: '16px 20px',
    verticalAlign: 'middle',
    color: '#4B5563',
    fontSize: '14px',
  },
  numericCell: {
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums', // Keeps numeric characters strictly aligned vertically
  },
  rankBadge: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '13px',
  },
  rankDefault: {
    paddingLeft: '10px',
    fontWeight: 600,
    color: '#9CA3AF',
    fontSize: '14px',
  },
  profileCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #764ba2, #667eea)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '15px',
  },
  metaData: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  nameBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  nameLabel: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1E1B4B',
  },
  titleLabel: {
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: 500,
  },
  scoreContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  scoreBarBackground: {
    width: '100px',
    height: '6px',
    background: '#E5E7EB',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  scoreText: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#374151',
  },
  tagCloud: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  skillTag: {
    background: '#F3F4F6',
    color: '#4B5563',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
  },
  earningsText: {
    fontWeight: 700,
    color: '#059669', // Distinct green color signaling currency volume accumulation
  },
  completedCount: {
    fontWeight: 500,
    color: '#374151',
  }
};