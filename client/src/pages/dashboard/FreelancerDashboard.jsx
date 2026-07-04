import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import TrustScoreBadge from '../../components/profile/TrustScoreBadge';
import { ProfileStrengthMeter } from '../../components/profile/TrustScoreBadge';
import matchService from '../../services/matchService';

/* ══════════════════════════════════════════════════════════════════════
   FreelancerDashboard.jsx
   Light blue/white aesthetic · TaskTide brand palette
   ══════════════════════════════════════════════════════════════════════ */

/* ─── Design tokens ──────────────────────────────────────────────────── */
const T = {
  bg:          '#F0F4FF',
  surface:     '#FFFFFF',
  surfaceAlt:  '#EBF2FF',
  border:      '#D6E4FF',
  borderStrong:'#A8C5FF',
  brand:       '#1D6FEB',
  brandLight:  '#E8F0FF',
  brandDark:   '#1455BF',
  accent:      '#00B4D8',
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

/* ─── Real profile hook ──────────────────────────────────────────────────
   Pulls the ACTUAL FreelancerProfile document from the backend via
   GET /api/profile/me (bio, skills, hourlyRate, location, avatar,
   trustScore, profileStrength, portfolio — all real, stored in MongoDB).
   ──────────────────────────────────────────────────────────────────── */
function useRealProfile() {
  const { user } = useAuth();
  const { profile, loading, fetchProfile } = useProfile();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    loading,
    name: user?.name || 'Freelancer',
    trustScore: profile?.trustScore ?? user?.trustScore ?? 0,
    profileStrength: profile?.profileStrength ?? 0,
    bio: profile?.bio || '',
    skills: profile?.skills || [],
    hourlyRate: profile?.hourlyRate || 0,
    location: profile?.location || '',
    portfolio: profile?.portfolio || [],
    avatarUrl: profile?.avatarUrl || user?.avatarUrl || '',

    completedFields: {
      avatar: !!(profile?.avatarUrl || user?.avatarUrl),
      bio: !!(profile?.bio && profile.bio.trim().length > 0),
      skills: !!(profile?.skills && profile.skills.length > 0),
      hourlyRate: !!(profile?.hourlyRate && profile.hourlyRate > 0),
      portfolio: !!(profile?.portfolio && profile.portfolio.length > 0),
      location: !!(profile?.location && profile.location.trim().length > 0),
      phone: false,
      social: false,
    },
  };
}

/* ─── Placeholder stats — EXPLICITLY NOT real data ──────────────────────
   These depend on subsystems not yet built:
     points / level / badges          → Gamification System   (Phase 3)
     completedProjects / activeProjects
       / earnings                     → Job + Payment models  (Phase 2)
     responseRate / completionRate
       / avgRating                    → Reputation Engine     (Phase 3)
   Shown as 0 / empty with a "Coming soon" tag rather than invented
   numbers, so the dashboard never claims data that doesn't exist yet.
   ──────────────────────────────────────────────────────────────────── */
const MOCK_STATS = {
  points: 0,
  level: 1,
  completedProjects: 0,
  activeProjects: 0,
  earnings: 0,
  responseRate: 0,
  completionRate: 0,
  avgRating: 0,
  badges: [],
};

/* ─── Real matches hook ──────────────────────────────────────────────────
   Pulls actual job matches from the TF-IDF matching engine via
   GET /api/matches/me (title, matchPercent, skillsRequired, budgetAmount).
   ──────────────────────────────────────────────────────────────────── */
function useRealMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    matchService.getMyMatches({ topN: 6 })
      .then((res) => setMatches(res.results || []))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, []);

  return { matches, loading };
}

/* ─── Atoms ──────────────────────────────────────────────────────────── */
function SectionLabel({ children, tag }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 14,
    }}>
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
        color: T.textMuted,
      }}>
        {children}
      </div>
      {tag && (
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          color: T.warning,
          background: 'rgba(245,158,11,0.12)',
          border: `1px solid ${T.warning}40`,
          borderRadius: 4,
          padding: '2px 6px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {tag}
        </span>
      )}
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
function StatCard({ label, value, prefix = '', suffix = '', colour = T.brand, icon, comingSoon }) {
  return (
    <Card style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: colour, borderRadius: '14px 14px 0 0',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        {comingSoon && (
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            color: T.textMuted,
            background: T.surfaceAlt,
            padding: '2px 7px',
            borderRadius: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Soon
          </span>
        )}
      </div>
      <div style={{
        fontFamily: "'Bebas Neue', Impact, sans-serif",
        fontSize: 34,
        color: comingSoon ? T.textMuted : colour,
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

/* ─── MiniRadial ─────────────────────────────────────────────────────── */
function MiniRadial({ value, label, colour = T.accent, size = 72, comingSoon }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const offset = arc - (value / 100) * arc;
  const displayColour = comingSoon ? T.border : colour;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={6}
          strokeDasharray={`${arc} ${circ}`} strokeLinecap="round"
          transform={`rotate(135 ${size/2} ${size/2})`} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={displayColour} strokeWidth={6}
          strokeDasharray={`${arc} ${circ}`} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(135 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' }} />
        <text x={size/2} y={size/2 + 2} textAnchor="middle" dominantBaseline="middle"
          style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: size * 0.22, fill: comingSoon ? T.textMuted : colour }}>
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

/* ─── SkillChip ──────────────────────────────────────────────────────── */
function SkillChip({ skill }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '5px 12px',
      background: T.brandLight,
      border: `1px solid ${T.borderStrong}`,
      borderRadius: 20,
      fontFamily: "'DM Mono', monospace",
      fontSize: 11,
      color: T.brandDark,
      whiteSpace: 'nowrap',
    }}>
      {skill}
    </span>
  );
}

/* ─── EmptyState ─────────────────────────────────────────────────────── */
function EmptyState({ icon, title, subtitle, actionLabel, onAction }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: T.textMuted }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600, color: T.textSecond, marginBottom: 4 }}>
        {title}
      </div>
      <p style={{ fontSize: 12, maxWidth: 320, margin: '0 auto 16px' }}>{subtitle}</p>
      {actionLabel && (
        <button
          onClick={onAction}
          style={{
            padding: '8px 18px',
            background: T.brand,
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ─── MatchCard ──────────────────────────────────────────────────────── */
function MatchCard({ match, onView }) {
  const percent = Math.round((match.matchPercent ?? match.score ?? 0));
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>
          {match.title}
        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 12,
          fontWeight: 600,
          color: percent >= 70 ? T.success : percent >= 40 ? T.warning : T.textMuted,
          background: percent >= 70 ? 'rgba(16,185,129,0.12)' : percent >= 40 ? 'rgba(245,158,11,0.12)' : T.surfaceAlt,
          padding: '3px 10px',
          borderRadius: 20,
          whiteSpace: 'nowrap',
        }}>
          {percent}% match
        </div>
      </div>

      {Array.isArray(match.skillsRequired) && match.skillsRequired.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {match.skillsRequired.map((s) => <SkillChip key={s} skill={s} />)}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: T.brand, fontWeight: 600 }}>
          {match.budgetAmount ? `₨${Number(match.budgetAmount).toLocaleString()}` : 'Budget not set'}
        </div>
        <button
          onClick={() => onView?.(match)}
          style={{
            padding: '6px 14px',
            background: T.brand,
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            cursor: 'pointer',
          }}
        >
          View
        </button>
      </div>
    </Card>
  );
}

/* ─── Main dashboard ─────────────────────────────────────────────────── */
export default function FreelancerDashboard() {
  const profile = useRealProfile();
  const navigate = useNavigate();
  const { matches, loading: matchesLoading } = useRealMatches();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = ['overview', 'matches', 'badges'];

  if (profile.loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: T.bg, color: T.textMuted, fontFamily: "'Sora', sans-serif",
      }}>
        Loading your dashboard…
      </div>
    );
  }

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
        <div style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 20,
          fontWeight: 700,
          color: T.textPrimary,
        }}>
          Task <span style={{ color: T.brand }}>Tide</span>
        </div>

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

        {/* User chip — click to edit profile */}
        <div
          onClick={() => navigate('/profile/edit')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          title="Edit your profile"
        >
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${T.borderStrong}` }}
            />
          ) : (
            <TrustScoreBadge score={profile.trustScore} size={42} showLabel={false} />
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{profile.name}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.textMuted }}>
              {profile.skills.length > 0
                ? profile.skills.slice(0, 2).join(', ')
                : 'Complete your profile →'}
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
                Welcome back
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

            {/* Profile incomplete nudge */}
            {profile.profileStrength < 100 && (
              <Card style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} highlight>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                    Your profile is {profile.profileStrength}% complete
                  </div>
                  <div style={{ fontSize: 12, color: T.textSecond }}>
                    A complete profile gets more job matches once the matching engine goes live.
                  </div>
                </div>
                <button
                  onClick={() => navigate('/profile/edit')}
                  style={{
                    padding: '9px 18px',
                    background: T.brand,
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Complete Profile
                </button>
              </Card>
            )}

            {/* Main grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>

              {/* LEFT column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* KPI row — explicitly marked as not-yet-live */}
                <div>
                  <SectionLabel tag="Coming soon">Performance Overview</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <StatCard label="Completed" value={MOCK_STATS.completedProjects} icon="✅" suffix=" jobs" colour={T.success} comingSoon />
                    <StatCard label="Active"     value={MOCK_STATS.activeProjects}   icon="🔄" colour={T.accent} comingSoon />
                    <StatCard label="Earnings (NPR)" value={MOCK_STATS.earnings}     icon="💰" colour={T.brand} prefix="₨" comingSoon />
                    <StatCard label="Avg Rating" value={MOCK_STATS.avgRating * 20}   icon="⭐" suffix="%" colour={T.pink} comingSoon />
                  </div>
                </div>

                {/* Real profile summary */}
                <Card>
                  <SectionLabel>Your Bio</SectionLabel>
                  {profile.bio ? (
                    <p style={{ fontSize: 13, color: T.textSecond, lineHeight: 1.6, margin: 0 }}>
                      {profile.bio}
                    </p>
                  ) : (
                    <p style={{ fontSize: 13, color: T.textMuted, fontStyle: 'italic', margin: 0 }}>
                      No bio yet — add one so clients know what you do.
                    </p>
                  )}

                  <div style={{ marginTop: 16 }}>
                    <SectionLabel>Skills</SectionLabel>
                    {profile.skills.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {profile.skills.map((s) => <SkillChip key={s} skill={s} />)}
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: T.textMuted, fontStyle: 'italic', margin: 0 }}>
                        No skills added yet.
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
                    <div>
                      <SectionLabel>Hourly Rate</SectionLabel>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: T.brand, fontWeight: 600 }}>
                        {profile.hourlyRate > 0 ? `₨${profile.hourlyRate.toLocaleString()}/hr` : 'Not set'}
                      </div>
                    </div>
                    <div>
                      <SectionLabel>Location</SectionLabel>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: T.textSecond }}>
                        {profile.location || 'Not set'}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Portfolio — real, from FreelancerProfile.portfolio */}
                {profile.portfolio.length > 0 && (
                  <Card>
                    <SectionLabel>Portfolio</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {profile.portfolio.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            borderBottom: i < profile.portfolio.length - 1 ? `1px solid ${T.border}` : 'none',
                            paddingBottom: 14,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: T.textPrimary }}>
                              {item.title}
                            </span>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 12, color: T.brand, fontFamily: "'DM Mono', monospace" }}
                              >
                                View →
                              </a>
                            )}
                          </div>
                          {item.description && (
                            <p style={{ fontSize: 13, color: T.textSecond, lineHeight: 1.5, margin: '4px 0' }}>
                              {item.description}
                            </p>
                          )}
                          {Array.isArray(item.techStack) && item.techStack.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                              {item.techStack.map((tech) => (
                                <span
                                  key={tech}
                                  style={{
                                    fontSize: 10,
                                    fontFamily: "'DM Mono', monospace",
                                    padding: '3px 8px',
                                    borderRadius: 12,
                                    background: T.surfaceAlt,
                                    color: T.textSecond,
                                  }}
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Matches — real, from matchService */}
                <div>
                  <SectionLabel>Top Job Matches</SectionLabel>
                  {matchesLoading ? (
                    <Card>
                      <div style={{ textAlign: 'center', padding: '24px', color: T.textMuted, fontSize: 13 }}>
                        Finding your best-fit jobs…
                      </div>
                    </Card>
                  ) : matches.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {matches.slice(0, 3).map((m) => (
                        <MatchCard
                          key={m._id || m.jobId || m.title}
                          match={m}
                          onView={(match) => navigate(`/jobs/${match._id || match.jobId}`)}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <EmptyState
                        icon="🔍"
                        title="No matches yet"
                        subtitle="Complete your profile with skills to start getting matched to relevant jobs."
                        actionLabel="Complete Profile"
                        onAction={() => navigate('/profile/edit')}
                      />
                    </Card>
                  )}
                </div>
              </div>

              {/* RIGHT column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Trust score — real, defaults to 100 per schema */}
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
                    Starts at 100 · full breakdown (completion, rating,<br />response, disputes, badges) activates with Reputation Engine
                  </div>
                </Card>

                {/* Profile strength — real, calculated server-side */}
                <Card>
                  <SectionLabel>Profile Strength</SectionLabel>
                  <ProfileStrengthMeter completedFields={profile.completedFields} />
                </Card>

                {/* Badges — genuinely empty until gamification is built */}
                <Card>
                  <SectionLabel tag="Coming soon">Earned Badges</SectionLabel>
                  <div style={{ fontSize: 12, color: T.textMuted }}>
                    Gamification system not live yet — badges will appear here as you complete jobs.
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
            {matchesLoading ? (
              <Card>
                <div style={{ textAlign: 'center', padding: '24px', color: T.textMuted, fontSize: 13 }}>
                  Finding your best-fit jobs…
                </div>
              </Card>
            ) : matches.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {matches.map((m) => (
                  <MatchCard
                    key={m._id || m.jobId || m.title}
                    match={m}
                    onView={(match) => navigate(`/jobs/${match._id || match.jobId}`)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <EmptyState
                  icon="🧠"
                  title="No matches yet"
                  subtitle="This uses TF-IDF cosine similarity to compare your skills against open jobs. Complete your profile to see results."
                  actionLabel="Complete Profile"
                  onAction={() => navigate('/profile/edit')}
                />
              </Card>
            )}
          </>
        )}

        {activeTab === 'badges' && (
          <>
            <div style={{ marginBottom: 28 }}>
              <SectionLabel tag="Coming soon">Achievement System</SectionLabel>
              <h2 style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: 40,
                margin: 0,
                color: T.textPrimary,
              }}>
                Your <span style={{ color: T.brand }}>Badges</span>
              </h2>
            </div>
            <Card>
              <EmptyState
                icon="🏆"
                title="Gamification System is under development"
                subtitle="Complete jobs and build your reputation to unlock achievements once this feature ships."
              />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}