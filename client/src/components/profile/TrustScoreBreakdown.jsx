import React from 'react';

/**
 * TrustScoreBreakdown.jsx
 *
 * Shows the individual factors that make up a Trust Score as labeled
 * progress bars, so a viewer can see WHY someone has the score they do.
 *
 * Expects `breakdown` shaped like:
 *   {
 *     reliability:  { score: 82, weight: 0.35, label: 'Reliability' },
 *     communication:{ score: 74, weight: 0.25, label: 'Communication' },
 *     performance:  { score: 90, weight: 0.25, label: 'Project Performance' },
 *     activity:     { score: 60, weight: 0.15, label: 'Overall Activity' },
 *   }
 *
 * Adjust the key names here to match whatever reputation.service.js
 * actually returns -- this is a best-guess shape based on the WBS
 * wording ("reliability, communication, and project performance").
 */

const FACTOR_ORDER = ['reliability', 'communication', 'performance', 'activity'];

const DEFAULT_LABELS = {
  reliability:   'Reliability',
  communication: 'Communication',
  performance:   'Project Performance',
  activity:      'Overall Activity',
};

const barColor = (score) => {
  if (score >= 80) return '#22C55E';
  if (score >= 60) return '#1D6FEB';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
};

export default function TrustScoreBreakdown({ breakdown }) {
  if (!breakdown || Object.keys(breakdown).length === 0) {
    return (
      <div style={{ color: '#8FA3CC', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
        No breakdown data available yet.
      </div>
    );
  }

  const keys = FACTOR_ORDER.filter((k) => breakdown[k] !== undefined);
  const extraKeys = Object.keys(breakdown).filter((k) => !FACTOR_ORDER.includes(k));
  const allKeys = [...keys, ...extraKeys];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {allKeys.map((key) => {
        const factor = breakdown[key];
        const score  = typeof factor === 'number' ? factor : factor.score ?? 0;
        const weight = typeof factor === 'object' ? factor.weight : null;
        const label  = (typeof factor === 'object' && factor.label) || DEFAULT_LABELS[key] || key;
        const clamped = Math.max(0, Math.min(100, score));
        const color = barColor(clamped);

        return (
          <div key={key}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                  color: '#0F1C3F',
                  fontWeight: 600,
                }}
              >
                {label}
                {weight != null && (
                  <span style={{ color: '#8FA3CC', fontWeight: 400 }}>
                    {' '}(weight {Math.round(weight * 100)}%)
                  </span>
                )}
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                  color,
                  fontWeight: 700,
                }}
              >
                {Math.round(clamped)}
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: '#E8F0FF',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${clamped}%`,
                  height: '100%',
                  background: color,
                  borderRadius: 4,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}