import React from 'react';
import { Link } from 'react-router-dom';
import StarRating from '../common/StarRating';
import BadgeDisplay from '../common/BadgeDisplay';

/**
 * FreelancerCard Component
 * Path: client/src/components/marketplace/FreelancerCard.jsx
 * * Visualizes a freelancer's professional profile inside matching grids.
 * Integrates trust weights, active tags, and transaction totals seamlessly.
 */
export default function FreelancerCard({ freelancer, onInvite }) {
  if (!freelancer) return null;

  // Destructure with robust fallbacks to keep the layout execution stable
  const {
    _id,
    name = 'Specialist Professional',
    professionalTitle = 'Independent Contractor',
    avatarUrl,
    trustScore = 0,
    rating = 5.0,
    reviewCount = 0,
    hourlyRate = 0,
    skills = [],
    bio = '',
    completedProjects = 0,
    isVerified = false
  } = freelancer;

  // Localized currency utility formatting values directly into NPR structures
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div style={styles.card}>
      {/* ── Top Row: Profile Avatar, Identity Meta, and Trust Badge ── */}
      <div style={styles.profileRow}>
        <div style={styles.avatarWrap}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} style={styles.avatarImage} />
          ) : (
            <div style={styles.avatarPlaceholder}>
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          {trustScore >= 90 && (
            <div style={styles.badgeOverlay} title="Top Rated Standing">
              👑
            </div>
          )}
        </div>

        <div style={styles.identityMeta}>
          <div style={styles.nameContainer}>
            <Link to={`/profile/freelancer/${_id}`} style={styles.profileLink}>
              <h3 style={styles.nameLabel}>{name}</h3>
            </Link>
            {isVerified && (
              <div style={styles.verifiedIconWrap}>
                <BadgeDisplay badgeType="verified" size="small" />
              </div>
            )}
          </div>
          <span style={styles.titleLabel}>{professionalTitle}</span>
        </div>
      </div>

      {/* ── Secondary Row: Operational Performance Evaluation ── */}
      <div style={styles.metricsRow}>
        <div style={styles.ratingBox}>
          <StarRating rating={rating} size={14} readOnly={true} />
          <span style={styles.reviewLabel}>({reviewCount} reviews)</span>
        </div>
        
        <div style={styles.trustScoreContainer}>
          <span style={styles.trustLabel}>Trust Weight:</span>
          <span style={{ 
            ...styles.trustValue, 
            color: trustScore >= 85 ? '#10B981' : '#F59E0B' 
          }}>
            {trustScore}%
          </span>
        </div>
      </div>

      {/* ── Professional Bio Overview ── */}
      <p style={styles.bioExcerpt}>
        {bio.length > 140 ? `${bio.substring(0, 140)}...` : bio || 'No professional background brief submitted yet.'}
      </p>

      {/* ── Skill Matrix Cloud ── */}
      <div style={styles.tagCloud}>
        {skills.slice(0, 4).map((skill, index) => (
          <span key={index} style={styles.skillTag}>
            {skill}
          </span>
        ))}
        {skills.length > 4 && (
          <span style={styles.moreTags}>+{skills.length - 4} items</span>
        )}
      </div>

      <div style={styles.divider} />

      {/* ── Footer Row: Financial Parameters & Contract Actions ── */}
      <div style={styles.cardFooter}>
        <div style={styles.financialStats}>
          <div style={styles.statGroup}>
            <span style={styles.statLabel}>Hourly Rate</span>
            <span style={styles.statValue}>
              {formatCurrency(hourlyRate)}<span style={styles.unitLabel}>/hr</span>
            </span>
          </div>
          <div style={styles.statGroup}>
            <span style={styles.statLabel}>Completed</span>
            <span style={styles.statValue}>{completedProjects} Jobs</span>
          </div>
        </div>

        <div style={styles.actionBlock}>
          {onInvite ? (
            <button 
              type="button" 
              style={styles.inviteBtn}
              onClick={() => onInvite(_id)}
            >
              Invite Job
            </button>
          ) : (
            <Link to={`/profile/freelancer/${_id}`} style={styles.viewProfileBtn}>
              View Profile
            </Link>
          )}
        </div>
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
    boxSizing: 'border-box',
    width: '100%',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  profileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '14px',
  },
  avatarWrap: {
    position: 'relative',
    width: '52px',
    height: '52px',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    objectFit: 'cover',
    border: '1px solid #334155',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #764ba2, #667eea)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '20px',
    boxShadow: '0 4px 12px rgba(118,75,162,0.15)',
  },
  badgeOverlay: {
    position: 'absolute',
    bottom: '-4px',
    right: '-4px',
    background: '#1F2937',
    border: '1px solid #FCD34D',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  },
  identityMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflow: 'hidden',
  },
  nameContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  profileLink: {
    textDecoration: 'none',
  },
  nameLabel: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 700,
    color: '#F1F5F9',
    lineHeight: '1.3',
  },
  verifiedIconWrap: {
    transform: 'scale(0.85)',
    transformOrigin: 'left center',
    display: 'inline-block',
  },
  titleLabel: {
    fontSize: '13px',
    color: '#94A3B8',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  metricsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#0B1120',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #1E293B',
    marginBottom: '14px',
    gap: '12px',
    flexWrap: 'wrap',
  },
  ratingBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  reviewLabel: {
    fontSize: '12px',
    color: '#64748B',
    fontWeight: 500,
  },
  trustScoreContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
  },
  trustLabel: {
    color: '#64748B',
    fontWeight: 600,
  },
  trustValue: {
    fontWeight: 700,
  },
  bioExcerpt: {
    margin: '0 0 16px 0',
    fontSize: '13.5px',
    color: '#94A3B8',
    lineHeight: '1.5',
  },
  tagCloud: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  skillTag: {
    background: '#1E293B',
    color: '#E2E8F0',
    padding: '4px 10px',
    borderRadius: '6px',
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
  divider: {
    height: '1px',
    background: '#1E293B',
    marginBottom: 16,
    marginTop: 'auto', // Keeps the financial footer locked perfectly flush on the base line grid
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  financialStats: {
    display: 'flex',
    gap: '20px',
  },
  statGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  statLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#F1F5F9',
    fontVariantNumeric: 'tabular-nums',
  },
  unitLabel: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#64748B',
  },
  actionBlock: {
    display: 'flex',
  },
  inviteBtn: {
    background: '#0EA5E9',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s ease',
  },
  viewProfileBtn: {
    background: 'transparent',
    color: '#0EA5E9',
    border: '1px solid #1E293B',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    textDecoration: 'none',
    textAlign: 'center',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  }
};