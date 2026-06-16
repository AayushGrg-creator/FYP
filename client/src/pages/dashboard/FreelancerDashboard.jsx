import React, { useState, useEffect, useRef } from 'react';
import TrustScoreBadge from '../../components/profile/TrustScoreBadge';
import { ProfileStrengthMeter } from '../../components/profile/TrustScoreBadge';

/* ══════════════════════════════════════════════════════════════════════
   FreelancerDashboard.jsx
   Light blue/white aesthetic · TaskTide brand palette
   ══════════════════════════════════════════════════════════════════════ */

/* ─── Design tokens ──────────────────────────────────────────────────── */
const T = {
  bg:          '#F0F4FF',        // page background — very light blue-tinted white
  surface:     '#FFFFFF',        // card background
  surfaceAlt:  '#EBF2FF',        // subtle card variant
  border:      '#D6E4FF',        // card borders
  borderStrong:'#A8C5FF',
  brand:       '#1D6FEB',        // primary blue (matches landing)
  brandLight:  '#E8F0FF',
  brandDark:   '#1455BF',
  accent:      '#00B4D8',        // cyan accent
  success:     '#10B981',
  warning:     '#F59E0B',
  danger:      '#EF4444',
  pink:        '#EC4899',
  textPrimary: '#0F1C3F',
  textSecond:  '#4B5E8A',
  textMuted:   '#8FA3CC',
  shadow:      '0 2px 12px rgba(29,111,235,0.08)',
  shadowMd:    '0 4px 24px rgba(29,111,235,0.12)',
};

/* ─── Mock hooks ─────────────────────────────────────────────────────── */
function useMockProfile() {
  return {
    name: 'Rajan Thapa',
    role: 'UI/UX Designer',
    trustScore: 84,
    points: 3910,
    level: 7,
    completedProjects: 23,
    activeProjects: 2,
    earnings: 142500,
    responseRate: 97,
    completionRate: 96,
    avgRating: 4.7,
    badges: [
      { slug: 'perfect_ten',    name: 'Perfect Ten',    icon: '🌟', colour: '#EF4444' },
      { slug: 'fast_responder', name: 'Fast Responder', icon: '🔔', colour: '#8B5CF6' },
      { slug: 'escrow_expert',  name: 'Escrow Expert',  icon: '🔐', colour: '#00B4D8' },
      { slug: 'early_bird',     name: 'Early Bird',     icon: '🌅', colour: '#10B981' },
    ],
    completedFields: {
      avatar: true, bio: true, skills: true,
      hourlyRate: true, portfolio: true, location: true,
      phone: false, social: false,
    },
  };
}

function useMockMatches() {
  return [
    { id: 'm1', title: 'React Dashboard for FinTech Startup',    matchPct: 94, budget: 85000, category: 'web_development', client: 'Himalayan Fintech', postedAgo: '2h' },
    { id: 'm2', title: 'Mobile App UI Redesign (iOS + Android)',  matchPct: 88, budget: 60000, category: 'ui_ux_design',    client: 'Yeti Apps Ltd',    postedAgo: '5h' },
    { id: 'm3', title: 'Brand Identity & Design System',          matchPct: 81, budget: 45000, category: 'graphic_design',  client: 'Startup Nepal',    postedAgo: '1d' },
    { id: 'm4', title: 'Admin Panel for E-Commerce Platform',     matchPct: 76, budget: 70000, category: 'web_development', client: 'SastoBazar',        postedAgo: '1d' },
  ];
}

/* ─── Atoms ──────────────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: "'DM Mono', monospace",
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.18em',
      color: T.textMuted,
      marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

function Card({ children, style, highlight }) {
  return (
    <div style={{
      background: highlight ? T.brandLight : T.surface,
      border: `1px solid ${highlight ? T.borderStrong : T.border}`,
      borderRadius: 14,
      padding: '20px 24px',
      boxShadow: highlight ? T.shadowMd : T.shadow,
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── AnimatedNumber ─────────────────────────────────────────────────── */
function AnimatedNumber({ value, prefix = '', suffix = '', duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const start = useRef(0);
  const raf = useRef(null);

  useEffect(() => {
    const from = start.current;
    const to = value;
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
      else start.current = to;
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <span>{prefix}{display.toLocaleString()}{suffix}</span>;
}

/* ─── StatCard ───────────────────────────────────────────────────────── */
function StatCard({ label, value, prefix = '', suffix = '', colour = T.brand, icon, delta }) {
  return (
    <Card style={{ position: 'relative', overflow: 'hidden' }}>
      {/* subtle tinted stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: colour, borderRadius: '14px 14px 0 0',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        {delta !== undefined && (
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            color: delta >= 0 ? T.success : T.danger,
            background: delta >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            padding: '2px 7px',
            borderRadius: 4,
          }}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <div style={{
        fontFamily: "'Bebas Neue', Impact, sans-serif",
        fontSize: 34,
        color: colour,
        lineHeight: 1,
        marginTop: 10,
      }}>
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
      </div>
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        color: T.textMuted,
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        {label}
      </div>
    </Card>
  );
}

/* ─── MatchCard ──────────────────────────────────────────────────────── */
function MatchCard({ match }) {
  const barColour =
    match.matchPct >= 90 ? T.success : match.matchPct >= 80 ? T.brand : T.textMuted;

  return (
    <Card
      style={{ cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s' }}
      highlight={match.matchPct >= 90}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: T.textMuted,
        }}>
          {match.category.replace('_', ' ')} · {match.client}
        </span>
        <span style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: 22,
          color: barColour,
          lineHeight: 1,
        }}>
          {match.matchPct}%
        </span>
      </div>

      <div style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: 14,
        fontWeight: 600,
        color: T.textPrimary,
        marginBottom: 12,
        lineHeight: 1.4,
      }}>
        {match.title}
      </div>

      {/* Match bar */}
      <div style={{
        height: 5,
        background: T.border,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 12,
      }}>
        <div style={{
          width: `${match.matchPct}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${barColour}88, ${barColour})`,
          borderRadius: 3,
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 12,
          color: T.brand,
          fontWeight: 600,
        }}>
          NPR {match.budget.toLocaleString()}
        </span>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          color: T.textMuted,
        }}>
          {match.postedAgo} ago
        </span>
      </div>
    </Card>
  );
}

/* ─── BadgeChip ──────────────────────────────────────────────────────── */
function BadgeChip({ badge }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 12px',
      background: `${badge.colour}14`,
      border: `1px solid ${badge.colour}40`,
      borderRadius: 8,
      fontFamily: "'DM Mono', monospace",
      fontSize: 11,
      color: badge.colour,
      whiteSpace: 'nowrap',
    }}>
      <span>{badge.icon}</span>
      {badge.name}
    </div>
  );
}

/* ─── MiniRadial ─────────────────────────────────────────────────────── */
function MiniRadial({ value, label, colour = T.accent, size = 72 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const offset = arc - (value / 100) * arc;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={6}
          strokeDasharray={`${arc} ${circ}`} strokeLinecap="round"
          transform={`rotate(135 ${size/2} ${size/2})`} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colour} strokeWidth={6}
          strokeDasharray={`${arc} ${circ}`} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(135 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' }} />
        <text x={size/2} y={size/2 + 2} textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: size * 0.22, fill: colour }}>
          {value}
        </text>
      </svg>
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 9,
        color: T.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        {label}
      </span>
    </div>
  );
}

/* ─── Main dashboard ─────────────────────────────────────────────────── */
export default function FreelancerDashboard() {
  const profile = useMockProfile();
  const matches = useMockMatches();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = ['overview', 'matches', 'badges'];

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      color: T.textPrimary,
      fontFamily: "'Sora', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=Sora:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.borderStrong}; border-radius: 3px; }
      `}</style>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div style={{
        padding: '0 40px',
        height: 60,
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: T.surface,
        boxShadow: T.shadow,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        {/* Brand — matches landing page */}
        <div style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 20,
          fontWeight: 700,
          color: T.textPrimary,
        }}>
          Task <span style={{ color: T.brand }}>Tide</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                padding: '7px 18px',
                background: activeTab === t ? T.brand : 'transparent',
                border: `1px solid ${activeTab === t ? T.brand : T.border}`,
                borderRadius: 6,
                color: activeTab === t ? '#fff' : T.textSecond,
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* User chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <TrustScoreBadge score={profile.trustScore} size={42} showLabel={false} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{profile.name}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.textMuted }}>
              Level {profile.level} · {profile.points.toLocaleString()} pts
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 40px' }}>

        {activeTab === 'overview' && (
          <>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: T.textMuted,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                Good morning
              </div>
              <h1 style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: 'clamp(36px,4vw,56px)',
                margin: 0,
                lineHeight: 1,
                letterSpacing: '-0.01em',
                color: T.textPrimary,
              }}>
                {profile.name.split(' ')[0]}'s <span style={{ color: T.brand }}>Dashboard</span>
              </h1>
            </div>

            {/* Main grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>

              {/* LEFT column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* KPI row */}
                <div>
                  <SectionLabel>Performance Overview</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <StatCard label="Completed" value={profile.completedProjects} icon="✅" suffix=" jobs" colour={T.success}  delta={12} />
                    <StatCard label="Active"     value={profile.activeProjects}   icon="🔄" colour={T.accent} />
                    <StatCard label="Earnings (NPR)" value={profile.earnings}     icon="💰" colour={T.brand}   prefix="₨" delta={8} />
                    <StatCard label="Avg Rating" value={profile.avgRating * 20}   icon="⭐" suffix="%" colour={T.pink} />
                  </div>
                </div>

                {/* Metrics radials */}
                <Card>
                  <SectionLabel>Quality Metrics</SectionLabel>
                  <div style={{ display: 'flex', gap: 32, justifyContent: 'center', padding: '8px 0' }}>
                    <MiniRadial value={profile.completionRate} label="Completion" colour={T.success} />
                    <MiniRadial value={profile.responseRate}   label="Response"   colour={T.accent}  />
                    <MiniRadial value={Math.round(profile.avgRating / 5 * 100)} label="Rating" colour={T.pink} />
                    <MiniRadial value={profile.trustScore}     label="Trust"      colour={T.brand}   />
                  </div>
                </Card>

                {/* Top matches preview */}
                <div>
                  <SectionLabel>Top Job Matches</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {matches.slice(0, 3).map((m) => (
                      <MatchCard key={m.id} match={m} />
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('matches')}
                    style={{
                      marginTop: 12,
                      width: '100%',
                      padding: '10px',
                      background: 'transparent',
                      border: `1px dashed ${T.borderStrong}`,
                      borderRadius: 8,
                      color: T.textMuted,
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => { e.target.style.borderColor = T.brand; e.target.style.color = T.brand; }}
                    onMouseLeave={e => { e.target.style.borderColor = T.borderStrong; e.target.style.color = T.textMuted; }}
                  >
                    View All Matches →
                  </button>
                </div>
              </div>

              {/* RIGHT column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Trust score */}
                <Card>
                  <SectionLabel>Trust Score</SectionLabel>
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                    <TrustScoreBadge score={profile.trustScore} size={140} />
                  </div>
                  <div style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    color: T.textMuted,
                    textAlign: 'center',
                    lineHeight: 1.6,
                  }}>
                    Completion 35% · Rating 25%<br />Response 20% · Dispute-free 10% · Badges 10%
                  </div>
                </Card>

                {/* Profile strength */}
                <Card>
                  <SectionLabel>Profile Strength</SectionLabel>
                  <ProfileStrengthMeter completedFields={profile.completedFields} />
                </Card>

                {/* Recent badges */}
                <Card>
                  <SectionLabel>Earned Badges</SectionLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {profile.badges.map((b) => (
                      <BadgeChip key={b.slug} badge={b} />
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}

        {activeTab === 'matches' && (
          <>
            <div style={{ marginBottom: 28 }}>
              <SectionLabel>AI-Powered Job Matches</SectionLabel>
              <h2 style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: 40,
                margin: 0,
                color: T.textPrimary,
              }}>
                Recommended <span style={{ color: T.brand }}>For You</span>
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
              {matches.map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          </>
        )}

        {activeTab === 'badges' && (
          <>
            <div style={{ marginBottom: 28 }}>
              <SectionLabel>Achievement System</SectionLabel>
              <h2 style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: 40,
                margin: 0,
                color: T.textPrimary,
              }}>
                Your <span style={{ color: T.brand }}>Badges</span>
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {profile.badges.map((badge) => (
                <Card key={badge.slug} style={{ textAlign: 'center', padding: '28px 20px' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>{badge.icon}</div>
                  <div style={{
                    fontFamily: "'Sora', sans-serif",
                    fontSize: 15,
                    fontWeight: 700,
                    color: badge.colour,
                    marginBottom: 6,
                  }}>
                    {badge.name}
                  </div>
                  <div style={{
                    width: 48, height: 2,
                    background: badge.colour,
                    margin: '0 auto 12px',
                    opacity: 0.4,
                    borderRadius: 1,
                  }} />
                  <div style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    color: T.textMuted,
                  }}>
                    Earned · Active
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}