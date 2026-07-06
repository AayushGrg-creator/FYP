import React from 'react';

/**
 * TrustScoreBadge.jsx
 *
 * Circular badge showing a numeric trust score (0-100) with a color
 * that shifts based on the score band. Used on PublicProfilePage.
 *
 * Props:
 *   score  - number (0-100)
 *   size   - diameter in px (default 120)
 */
export default function TrustScoreBadge({ score = 0, size = 120 }) {
  const clamped = Math.max(0, Math.min(100, score));

  const colorFor = (s) => {
    if (s >= 80) return '#22C55E'; // strong trust - green
    if (s >= 60) return '#1D6FEB'; // good - blue
    if (s >= 40) return '#F59E0B'; // moderate - amber
    return '#EF4444';              // low - red
  };

  const color = colorFor(clamped);
  const strokeWidth = Math.max(6, size * 0.07);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E8F0FF"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Bebas Neue', Impact, sans-serif",
        }}
      >
        <span style={{ fontSize: size * 0.28, color, lineHeight: 1 }}>
          {Math.round(clamped)}
        </span>
        <span
          style={{
            fontSize: size * 0.07,
            color: '#8FA3CC',
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.08em',
            marginTop: 2,
          }}
        >
          / 100
        </span>
      </div>
    </div>
  );
}