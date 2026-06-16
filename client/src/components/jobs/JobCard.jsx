import React from 'react';
import { Link } from 'react-router-dom';
import StarRating from '../common/StarRating';
import BadgeDisplay from '../common/BadgeDisplay';

/**
 * JobCard Component
 * Path: client/src/components/jobs/JobCard.jsx
 * * Displays detailed summary contexts for posted freelance contracts.
 * Matches the dark theme aesthetic (#111827) and exposes action metrics seamlessly.
 */
export default function JobCard({ job, onApply }) {
  if (!job) return null;

  // Destructure with safe default values to protect layout execution
  const {
    _id,
    title = 'Untitled Position',
    description = '',
    category = 'General',
    minBudget = 0,
    maxBudget = 0,
    budgetType = 'fixed',
    experienceLevel = 'intermediate',
    skills = [],
    client = {},
    createdAt
  } = job;

  // Format currency directly into NPR formatting structures
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Human-readable timestamp utility
  const getRelativeTime = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins || 1}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div style={styles.card}>
      {/* ── Top Header Track: Category & Time Meta ── */}
      <div style={styles.cardHeader}>
        <span style={styles.categoryBadge}>{category}</span>
        <span style={styles.timestamp}>{getRelativeTime(createdAt)}</span>
      </div>

      {/* ── Main Content Block ── */}
      <div style={styles.contentBlock}>
        <Link to={`/jobs/${_id}`} style={styles.titleLink}>
          <h3 style={styles.title}>{title}</h3>
        </Link>
        <p style={styles.description}>
          {description.length > 160 ? `${description.substring(0, 160)}...` : description}
        </p>
      </div>

      {/* ── Skill Matrix Cloud ── */}
      <div style={styles.tagCloud}>
        {skills.slice(0, 4).map((skill, index) => (
          <span key={index} style={styles.skillTag}>
            {skill}
          </span>
        ))}
        {skills.length > 4 && (
          <span style={styles.moreTags}>+{skills.length - 4} more</span>
        )}
      </div>

      {/* ── Parameters Matrix (Budget & Tier Details) ── */}
      <div style={styles.parameterRow}>
        <div style={styles.paramItem}>
          <span style={styles.paramLabel}>Budget (NPR)</span>
          <span style={styles.paramValue}>
            {maxBudget > minBudget 
              ? `${formatCurrency(minBudget)} - ${formatCurrency(maxBudget)}` 
              : formatCurrency(minBudget)}
            <span style={styles.budgetTypeLabel}>
              {budgetType === 'hourly' ? ' / hr' : ' fixed'}
            </span>
          </span>
        </div>

        <div style={styles.paramItem}>
          <span style={styles.paramLabel}>Experience Tier</span>
          <span style={{ 
            ...styles.paramValue, 
            color: experienceLevel === 'expert' ? '#F59E0B' : '#F1F5F9' 
          }}>
            {experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)}
          </span>
        </div>
      </div>

      <div style={styles.divider} />

      {/* ── Footer Track: Client Metrics & Action CTAs ── */}
      <div style={styles.cardFooter}>
        <div style={styles.clientMeta}>
          <div style={styles.clientDetails}>
            <span style={styles.clientName}>{client.name || 'Verified Client'}</span>
            <div style={styles.ratingWrap}>
              <StarRating rating={client.rating || 5} size={13} readOnly={true} />
              {client.isVerified && (
                <div style={styles.badgeWrapper}>
                  <BadgeDisplay badgeType="verified" size="small" />
                </div>
              )}
            </div>
          </div>
        </div>

        {onApply ? (
          <button 
            type="button" 
            style={styles.applyBtn} 
            onClick={() => onApply(_id)}
          >
            Apply Now
          </button>
        ) : (
          <Link to={`/jobs/${_id}`} style={styles.viewBtn}>
            View Contract
          </Link>
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
    padding: '22px',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxSizing: 'border-box',
    width: '100%',
    marginBottom: '16px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    background: '#0F2235',
    color: '#0EA5E9',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  timestamp: {
    fontSize: '12px',
    color: '#64748B',
    fontWeight: 500,
  },
  contentBlock: {
    marginBottom: 16,
  },
  titleLink: {
    textDecoration: 'none',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: 700,
    color: '#F1F5F9',
    lineHeight: '1.4',
    transition: 'color 0.15s ease',
  },
  description: {
    margin: 0,
    fontSize: '14px',
    color: '#94A3B8',
    lineHeight: '1.6',
  },
  tagCloud: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 18,
  },
  skillTag: {
    background: '#1E293B',
    color: '#94A3B8',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
  },
  moreTags: {
    fontSize: '12px',
    color: '#64748B',
    alignSelf: 'center',
    fontWeight: 600,
    marginLeft: 2,
  },
  parameterRow: {
    display: 'flex',
    gap: 32,
    marginBottom: 16,
    background: '#0B1120',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #1E293B',
  },
  paramItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  paramLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  paramValue: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#F1F5F9',
    fontVariantNumeric: 'tabular-nums',
  },
  budgetTypeLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#64748B',
  },
  divider: {
    height: '1px',
    background: '#1E293B',
    marginBottom: 16,
    marginTop: 'auto', // Pushes down the footer row evenly regardless of description lengths
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  clientMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  clientDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  clientName: {
    fontSize: '13.5px',
    fontWeight: 600,
    color: '#E2E8F0',
  },
  ratingWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  badgeWrapper: {
    transform: 'scale(0.85)',
    transformOrigin: 'left center',
    display: 'inline-block',
  },
  applyBtn: {
    background: '#0EA5E9',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13.5px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  viewBtn: {
    background: 'transparent',
    color: '#0EA5E9',
    border: '1px solid #1E293B',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13.5px',
    fontWeight: 600,
    textDecoration: 'none',
    textAlign: 'center',
    transition: 'all 0.15s ease',
  }
};