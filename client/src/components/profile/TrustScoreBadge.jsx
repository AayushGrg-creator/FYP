// TrustScoreBadge.jsx
// Displays a radial gauge with animated fill and tier colour coding.

import React, { useEffect, useRef } from 'react';

/* ─── Tier config ───────────────────────────────────────────────────── */
const TIERS = [
  { min: 0,  max: 39,  label: 'Unranked',  colour: '#6B7280', glow: 'rgba(107,114,128,0.35)' },
  { min: 40, max: 59,  label: 'Bronze',    colour: '#B45309', glow: 'rgba(180,83,9,0.40)'    },
  { min: 60, max: 74,  label: 'Silver',    colour: '#9CA3AF', glow: 'rgba(156,163,175,0.45)' },
  { min: 75, max: 84,  label: 'Gold',      colour: '#F59E0B', glow: 'rgba(245,158,11,0.50)'  },
  { min: 85, max: 94,  label: 'Platinum',  colour: '#06B6D4', glow: 'rgba(6,182,212,0.55)'   },
  { min: 95, max: 100, label: 'Elite',     colour: '#EC4899', glow: 'rgba(236,72,153,0.60)'  },
];

function getTier(score) {
  return TIERS.find((t) => score >= t.min && score <= t.max) || TIERS[0];
}

/* ─── SVG radial gauge ──────────────────────────────────────────────── */
function RadialGauge({ score, size = 120, strokeWidth = 8 }) {
  const tier = getTier(score);
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  // 270° arc (three-quarter circle)
  const arcLength = circumference * 0.75;
  const offset = arcLength - (score / 100) * arcLength;

  const arcRef = useRef(null);

  useEffect(() => {
    const el = arcRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.strokeDashoffset = arcLength;
    // Force reflow
    void el.getBoundingClientRect();
    el.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    el.style.strokeDashoffset = offset;
  }, [score, arcLength, offset]);

  const cx = size / 2;
  const cy = size / 2;
  // Start angle = 135° (bottom-left), rotated via transform
  const rotation = 135;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ filter: `drop-shadow(0 0 8px ${tier.glow})`, overflow: 'visible' }}
    >
      {/* Track arc */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={strokeWidth}
        strokeDasharray={`${arcLength} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(${rotation} ${cx} ${cy})`}
      />
      {/* Value arc */}
      <circle
        ref={arcRef}
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={tier.colour}
        strokeWidth={strokeWidth}
        strokeDasharray={`${arcLength} ${circumference}`}
        strokeDashoffset={arcLength}
        strokeLinecap="round"
        transform={`rotate(${rotation} ${cx} ${cy})`}
      />
    </svg>
  );
}

/* ─── Main export ───────────────────────────────────────────────────── */
export default function TrustScoreBadge({ score = 0, size = 120, showLabel = true }) {
  const tier = getTier(Math.min(100, Math.max(0, score)));
  const fontSize = size * 0.22;
  const labelSize = size * 0.11;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      <RadialGauge score={score} size={size} strokeWidth={Math.max(6, size * 0.07)} />

      {/* Score overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          paddingTop: size * 0.05,
        }}
      >
        <span
          style={{
            fontFamily: "'Bebas Neue', 'Impact', sans-serif",
            fontSize: fontSize,
            lineHeight: 1,
            color: tier.colour,
            letterSpacing: '-0.02em',
          }}
        >
          {Math.round(score)}
        </span>
        {showLabel && (
          <span
            style={{
              fontFamily: "'DM Mono', 'Courier New', monospace",
              fontSize: labelSize,
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginTop: 2,
            }}
          >
            {tier.label}
          </span>
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────
// ProfileStrengthMeter.jsx  (exported separately at bottom of file)
// Segmented horizontal bar with field-level breakdown
//
// ✅ FIXED: dropped 'phone' and 'social' fields — they don't exist
// anywhere in FreelancerProfile.js's schema, so they could never be
// marked complete. Their combined weight (15) has been redistributed
// across the remaining 6 fields so the total still sums to 100, and
// these weights now MATCH server/models/FreelancerProfile.js's
// computeProfileStrength() exactly — previously the two used different
// weights and showed conflicting percentages on the same dashboard
// (e.g. 80% in one card, 85% in another for the same profile).
// ─────────────────────────────────────────────────────────────────────

const PROFILE_FIELDS = [
  { key: 'avatar',      label: 'Photo',      weight: 15 },
  { key: 'bio',         label: 'Bio',        weight: 15 },
  { key: 'skills',      label: 'Skills',     weight: 20 },
  { key: 'hourlyRate',  label: 'Rate',       weight: 10 },
  { key: 'portfolio',   label: 'Portfolio',  weight: 30 },
  { key: 'location',    label: 'Location',   weight: 10 },
];

function getStrengthLabel(pct) {
  if (pct < 30) return { label: 'Weak',       colour: '#EF4444' };
  if (pct < 60) return { label: 'Fair',        colour: '#F59E0B' };
  if (pct < 80) return { label: 'Good',        colour: '#10B981' };
  if (pct < 95) return { label: 'Strong',      colour: '#06B6D4' };
  return          { label: 'Elite Profile', colour: '#EC4899' };
}

export function ProfileStrengthMeter({ completedFields = {}, compact = false }) {
  const totalWeight = PROFILE_FIELDS.reduce((s, f) => s + f.weight, 0);
  const earnedWeight = PROFILE_FIELDS.reduce(
    (s, f) => s + (completedFields[f.key] ? f.weight : 0),
    0
  );
  const pct = Math.round((earnedWeight / totalWeight) * 100);
  const { label, colour } = getStrengthLabel(pct);

  const barRef = useRef(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    el.style.width = '0%';
    void el.getBoundingClientRect();
    el.style.transition = 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)';
    el.style.width = `${pct}%`;
  }, [pct]);

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            ref={barRef}
            style={{
              height: '100%',
              borderRadius: 3,
              background: `linear-gradient(90deg, ${colour}88, ${colour})`,
              width: '0%',
            }}
          />
        </div>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: colour,
            minWidth: 32,
            textAlign: 'right',
          }}
        >
          {pct}%
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: '20px 24px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          Profile Strength
        </span>
        <span
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: 26,
            color: colour,
            lineHeight: 1,
          }}
        >
          {pct}% &nbsp;
          <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", opacity: 0.8 }}>
            {label}
          </span>
        </span>
      </div>

      {/* Main bar */}
      <div
        style={{
          height: 10,
          borderRadius: 5,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
          marginBottom: 18,
          position: 'relative',
        }}
      >
        <div
          ref={barRef}
          style={{
            height: '100%',
            borderRadius: 5,
            background: `linear-gradient(90deg, ${colour}66, ${colour})`,
            width: '0%',
            position: 'relative',
          }}
        >
          {/* Shimmer */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite',
            }}
          />
        </div>
      </div>

      {/* Field checklist */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '8px 12px',
        }}
      >
        {PROFILE_FIELDS.map((field) => {
          const done = !!completedFields[field.key];
          return (
            <div
              key={field.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                opacity: done ? 1 : 0.45,
              }}
            >
              <span style={{ fontSize: 12, color: done ? colour : 'rgba(255,255,255,0.3)' }}>
                {done ? '✓' : '○'}
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  color: done ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)',
                }}
              >
                {field.label}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10,
                  color: done ? colour : 'rgba(255,255,255,0.2)',
                }}
              >
                +{field.weight}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  );
}