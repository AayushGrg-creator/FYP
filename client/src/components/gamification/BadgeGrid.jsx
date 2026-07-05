import React from 'react';

export default function BadgeGrid({ allBadges = [], earnedBadges = [] }) {
  const earnedSlugs = new Set(earnedBadges.map((ub) => ub.badge?.slug));

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: '16px',
    }}>
      {allBadges.map((badge) => {
        const isEarned = earnedSlugs.has(badge.slug);
        return (
          <div
            key={badge._id}
            title={badge.description}
            style={{
              backgroundColor: '#1a1a1a',
              border: `1px solid ${isEarned ? badge.colour : '#2a2a2a'}`,
              borderRadius: '12px',
              padding: '16px 12px',
              textAlign: 'center',
              opacity: isEarned ? 1 : 0.4,
              transition: 'opacity 0.2s ease',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{badge.icon}</div>
            <div style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              fontSize: '13px',
              color: '#ffffff',
              marginBottom: '4px',
            }}>
              {badge.name}
            </div>
            <div style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px',
              color: '#7c6ff7',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {badge.tier}
            </div>
          </div>
        );
      })}
    </div>
  );
}