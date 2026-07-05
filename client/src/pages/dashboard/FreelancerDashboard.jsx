import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import TrustScoreBadge from '../../components/profile/TrustScoreBadge';
import { ProfileStrengthMeter } from '../../components/profile/TrustScoreBadge';
import matchService from '../../services/matchService';
import proposalService from '../../services/proposalService';
import jobService from '../../services/jobService';
import projectService from '../../services/projectService';

/* ══════════════════════════════════════════════════════════════════════
   FreelancerDashboard.jsx
   Light blue/white aesthetic · TaskTide brand palette
   ══════════════════════════════════════════════════════════════════════ */

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

/* ─── Real profile hook ──────────────────────────────────────────────── */
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

/* ─── Real proposals hook ────────────────────────────────────────────── */
function useMyProposals() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await proposalService.getAll();
      const list = Array.isArray(data) ? data : (data?.proposals || data?.data || []);
      if (isMountedRef.current) setProposals(list);
    } catch (err) {
      if (isMountedRef.current) setError(err.message || 'Failed to load proposals.');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { proposals, loading, error, reload: load };
}
/* ─── Real matches hook ──────────────────────────────────────────────────
   Pulls actual job matches from the TF-IDF matching engine via
   GET /api/match/my-matches. Response shape not fully confirmed against
   the live controller, so this defensively handles several possible
   envelope shapes rather than assuming one.
   ──────────────────────────────────────────────────────────────────── */
function useRealMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    matchService.getMyMatches({ topN: 6 })
      .then((res) => {
        const list = Array.isArray(res)
          ? res
          : (res?.matches || res?.results || res?.data || []);
        setMatches(list);
      })
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, []);

  return { matches, loading };
}

/* ─── Placeholder stats — EXPLICITLY NOT real data ──────────────────── */
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

/* ─── Atoms ──────────────────────────────────────────────────────────── */
function SectionLabel({ children, tag }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: 'uppercase',
        letterSpacing: '0.18em', color: T.textMuted,
      }}>
        {children}
      </div>
      {tag && (
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 9, color: T.warning,
          background: 'rgba(245,158,11,0.12)', border: `1px solid ${T.warning}40`,
          borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.08em',
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
      borderRadius: 14, padding: '20px 24px',
      boxShadow: highlight ? T.shadowMd : T.shadow,
      ...style,
    }}>
      {children}
    </div>
  );
}

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

function StatCard({ label, value, prefix = '', suffix = '', colour = T.brand, icon, comingSoon }) {
  return (
    <Card style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: colour, borderRadius: '14px 14px 0 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        {comingSoon && (
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: 9, color: T.textMuted, background: T.surfaceAlt,
            padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Soon
          </span>
        )}
      </div>
      <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 34, color: comingSoon ? T.textMuted : colour, lineHeight: 1, marginTop: 10 }}>
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </div>
    </Card>
  );
}

function SkillChip({ skill }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '5px 12px',
      background: T.brandLight, border: `1px solid ${T.borderStrong}`, borderRadius: 20,
      fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.brandDark, whiteSpace: 'nowrap',
    }}>
      {skill}
    </span>
  );
}

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
            padding: '8px 18px', background: T.brand, border: 'none', borderRadius: 8, color: '#fff',
            fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ─── ProposalStatusBadge ────────────────────────────────────────────── */
function ProposalStatusBadge({ status }) {
  const MAP = {
    pending:   { bg: '#FEF3C7', color: '#B45309', label: 'Pending' },
    accepted:  { bg: '#D1FAE5', color: '#059669', label: 'Accepted' },
    rejected:  { bg: '#FEE2E2', color: '#DC2626', label: 'Rejected' },
    withdrawn: { bg: T.surfaceAlt, color: T.textMuted, label: 'Withdrawn' },
  };
  const s = MAP[status] || MAP.pending;
  return (
    <span style={{
      background: s.bg, color: s.color, borderRadius: 20, padding: '4px 12px',
      fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

/* ─── ProposalRow ────────────────────────────────────────────────────── */
function ProposalRow({ proposal }) {
  const jobTitle = proposal.job?.title || 'Job listing';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 0', borderBottom: `1px solid ${T.border}`, gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: T.textPrimary }}>
          {jobTitle}
        </div>
        {proposal.coverLetter && (
          <p style={{ fontSize: 12, color: T.textSecond, margin: '4px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {proposal.coverLetter}
          </p>
        )}
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.textMuted, marginTop: 6 }}>
          Bid: ₨{proposal.bidAmount?.toLocaleString?.() ?? proposal.bidAmount}
          {proposal.deliveryTimeframe ? ` · ${proposal.deliveryTimeframe} days` : ''}
        </div>
      </div>
      <ProposalStatusBadge status={proposal.status} />
    </div>
  );
}

/* ─── ActiveJobRow — accepted proposal whose job is in_progress/completed ── */
function ActiveJobRow({ proposal, onMarkComplete, completing }) {
  const job = proposal.job || {};
  const jobStatus = job.status; // 'in_progress' | 'completed'

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: `1px solid ${T.border}`, gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: T.textPrimary }}>
          {job.title || 'Job listing'}
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.textMuted, marginTop: 4 }}>
          Bid: ₨{proposal.bidAmount?.toLocaleString?.() ?? proposal.bidAmount}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          background: jobStatus === 'completed' ? '#EDE9FE' : '#DBEAFE',
          color: jobStatus === 'completed' ? '#7C3AED' : '#2563EB',
          borderRadius: 20, padding: '4px 12px',
          fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
        }}>
          {jobStatus === 'completed' ? 'Completed' : 'In Progress'}
        </span>
        {jobStatus === 'in_progress' && (
          <button
            onClick={() => onMarkComplete(job._id)}
            disabled={completing}
            style={{
              padding: '7px 16px', background: T.success, border: 'none', borderRadius: 6, color: '#fff',
              fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
              cursor: completing ? 'not-allowed' : 'pointer', opacity: completing ? 0.6 : 1, whiteSpace: 'nowrap',
            }}
          >
            {completing ? 'Saving…' : '✓ Mark Complete'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── ActiveWorkspaceRow — accepted Project shared with a client ─────── */
function ActiveWorkspaceRow({ project }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: `1px solid ${T.border}`, gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: T.textPrimary }}>
          {project.job?.title || 'Project'}
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.textMuted, marginTop: 4 }}>
          with {project.client?.name || 'Client'} · {project.status}
        </div>
      </div>
      <button
        onClick={() => window.location.assign(`/workspace/${project._id}`)}
        style={{
          padding: '7px 16px', background: T.brand, border: 'none', borderRadius: 6, color: '#fff',
          fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        Open →
      </button>
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
          fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600,
          color: percent >= 70 ? T.success : percent >= 40 ? T.warning : T.textMuted,
          background: percent >= 70 ? 'rgba(16,185,129,0.12)' : percent >= 40 ? 'rgba(245,158,11,0.12)' : T.surfaceAlt,
          padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
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
            padding: '6px 14px', background: T.brand, border: 'none', borderRadius: 6, color: '#fff',
            fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
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
  const { proposals, loading: proposalsLoading, error: proposalsError, reload: reloadProposals } = useMyProposals();
  const { matches, loading: matchesLoading } = useRealMatches();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [completingId, setCompletingId] = useState(null);

  // ── Active workspaces (Projects) for this freelancer ────────────────────
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    projectService.getMine().then((res) => setProjects(res.projects || [])).catch(() => {});
  }, []);

  const tabs = ['overview', 'proposals', 'matches', 'badges'];

  // Accepted proposals whose job is actively being worked on or finished.
  const activeJobs = proposals.filter(
    (p) => p.status === 'accepted' && ['in_progress', 'completed'].includes(p.job?.status)
  );
  const inProgressJobs = activeJobs.filter((p) => p.job?.status === 'in_progress');
  const completedJobs  = activeJobs.filter((p) => p.job?.status === 'completed');

  const handleMarkComplete = async (jobId) => {
    if (!window.confirm('Mark this job as completed? This cannot be undone.')) return;
    setCompletingId(jobId);
    try {
      await jobService.markComplete(jobId);
      await reloadProposals();
    } catch (err) {
      alert(err.message || 'Failed to mark job as completed.');
    } finally {
      setCompletingId(null);
    }
  };

  if (profile.loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, color: T.textMuted, fontFamily: "'Sora', sans-serif" }}>
        Loading your dashboard…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.textPrimary, fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=Sora:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.borderStrong}; border-radius: 3px; }
      `}</style>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div style={{
        padding: '0 40px', height: 60, borderBottom: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: T.surface, boxShadow: T.shadow, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: T.textPrimary }}>
          Task <span style={{ color: T.brand }}>Tide</span>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                padding: '7px 18px', background: activeTab === t ? T.brand : 'transparent',
                border: `1px solid ${activeTab === t ? T.brand : T.border}`, borderRadius: 6,
                color: activeTab === t ? '#fff' : T.textSecond, fontFamily: "'DM Mono', monospace",
                fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {t}
              {t === 'proposals' && proposals.filter(p => p.status === 'accepted').length > 0 && (
                <span style={{
                  marginLeft: 6, background: activeTab === t ? '#fff' : T.success,
                  color: activeTab === t ? T.brand : '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 9,
                }}>
                  {proposals.filter(p => p.status === 'accepted').length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div onClick={() => navigate('/profile/edit')} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} title="Edit your profile">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${T.borderStrong}` }} />
          ) : (
            <TrustScoreBadge score={profile.trustScore} size={42} showLabel={false} />
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{profile.name}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.textMuted }}>
              {profile.skills.length > 0 ? profile.skills.slice(0, 2).join(', ') : 'Complete your profile →'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 40px' }}>

        {activeTab === 'overview' && (
          <>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.textMuted, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
                Welcome back
              </div>
              <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 'clamp(36px,4vw,56px)', margin: 0, lineHeight: 1, letterSpacing: '-0.01em', color: T.textPrimary }}>
                {profile.name.split(' ')[0]}'s <span style={{ color: T.brand }}>Dashboard</span>
              </h1>
            </div>

            {profile.profileStrength < 100 && (
              <Card style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} highlight>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Your profile is {profile.profileStrength}% complete</div>
                  <div style={{ fontSize: 12, color: T.textSecond }}>A complete profile gets more job matches from the matching engine.</div>
                </div>
                <button
                  onClick={() => navigate('/profile/edit')}
                  style={{ padding: '9px 18px', background: T.brand, border: 'none', borderRadius: 8, color: '#fff', fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Complete Profile
                </button>
              </Card>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                <div>
                  <SectionLabel tag="Coming soon">Performance Overview</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <StatCard label="Completed" value={MOCK_STATS.completedProjects} icon="✅" suffix=" jobs" colour={T.success} comingSoon />
                    <StatCard label="Active"     value={MOCK_STATS.activeProjects}   icon="🔄" colour={T.accent} comingSoon />
                    <StatCard label="Earnings (NPR)" value={MOCK_STATS.earnings}     icon="💰" colour={T.brand} prefix="₨" comingSoon />
                    <StatCard label="Avg Rating" value={MOCK_STATS.avgRating * 20}   icon="⭐" suffix="%" colour={T.pink} comingSoon />
                  </div>
                </div>

                {/* ── Active Workspaces (Projects) ── */}
                {projects.length > 0 && (
                  <div>
                    <SectionLabel>Active Workspaces</SectionLabel>
                    <Card>
                      {projects.map((p) => (
                        <ActiveWorkspaceRow key={p._id} project={p} />
                      ))}
                    </Card>
                  </div>
                )}

                <Card>
                  <SectionLabel>Your Bio</SectionLabel>
                  {profile.bio ? (
                    <p style={{ fontSize: 13, color: T.textSecond, lineHeight: 1.6, margin: 0 }}>{profile.bio}</p>
                  ) : (
                    <p style={{ fontSize: 13, color: T.textMuted, fontStyle: 'italic', margin: 0 }}>No bio yet — add one so clients know what you do.</p>
                  )}

                  <div style={{ marginTop: 16 }}>
                    <SectionLabel>Skills</SectionLabel>
                    {profile.skills.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {profile.skills.map((s) => <SkillChip key={s} skill={s} />)}
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: T.textMuted, fontStyle: 'italic', margin: 0 }}>No skills added yet.</p>
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
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: T.textSecond }}>{profile.location || 'Not set'}</div>
                    </div>
                  </div>
                </Card>

                {profile.portfolio.length > 0 && (
                  <Card>
                    <SectionLabel>Portfolio</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {profile.portfolio.map((item, i) => (
                        <div key={i} style={{ borderBottom: i < profile.portfolio.length - 1 ? `1px solid ${T.border}` : 'none', paddingBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: T.textPrimary }}>{item.title}</span>
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: T.brand, fontFamily: "'DM Mono', monospace" }}>View →</a>
                            )}
                          </div>
                          {item.description && <p style={{ fontSize: 13, color: T.textSecond, lineHeight: 1.5, margin: '4px 0' }}>{item.description}</p>}
                          {Array.isArray(item.techStack) && item.techStack.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                              {item.techStack.map((tech) => (
                                <span key={tech} style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", padding: '3px 8px', borderRadius: 12, background: T.surfaceAlt, color: T.textSecond }}>{tech}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <div>
                  <SectionLabel>Top Job Matches</SectionLabel>
                  {matchesLoading ? (
                    <Card><div style={{ textAlign: 'center', padding: '24px', color: T.textMuted, fontSize: 13 }}>Finding your best-fit jobs…</div></Card>
                  ) : matches.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {matches.slice(0, 3).map((m) => (
                        <MatchCard key={m._id || m.jobId || m.title} match={m} onView={(match) => navigate(`/jobs/${match._id || match.jobId}`)} />
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <EmptyState icon="🔍" title="No matches yet" subtitle="Complete your profile with skills to start getting matched to relevant jobs." actionLabel="Complete Profile" onAction={() => navigate('/profile/edit')} />
                    </Card>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Card>
                  <SectionLabel>Trust Score</SectionLabel>
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                    <TrustScoreBadge score={profile.trustScore} size={140} />
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.textMuted, textAlign: 'center', lineHeight: 1.6 }}>
                    Starts at 100 · full breakdown (completion, rating,<br />response, disputes, badges) activates with Reputation Engine
                  </div>
                </Card>

                <Card>
                  <SectionLabel>Profile Strength</SectionLabel>
                  <ProfileStrengthMeter completedFields={profile.completedFields} />
                </Card>

                <Card>
                  <SectionLabel>Recent Proposals</SectionLabel>
                  {proposalsLoading ? (
                    <div style={{ fontSize: 12, color: T.textMuted }}>Loading…</div>
                  ) : proposals.length === 0 ? (
                    <div style={{ fontSize: 12, color: T.textMuted }}>No proposals submitted yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {proposals.slice(0, 3).map((p) => (
                        <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: T.textSecond, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.job?.title || 'Job listing'}</span>
                          <ProposalStatusBadge status={p.status} />
                        </div>
                      ))}
                      {proposals.length > 3 && (
                        <button onClick={() => setActiveTab('proposals')} style={{ background: 'none', border: 'none', color: T.brand, fontSize: 11, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                          View all {proposals.length} →
                        </button>
                      )}
                    </div>
                  )}
                </Card>

                <Card>
                  <SectionLabel tag="Coming soon">Earned Badges</SectionLabel>
                  <div style={{ fontSize: 12, color: T.textMuted }}>Gamification system not live yet — badges will appear here as you complete jobs.</div>
                </Card>
              </div>
            </div>
          </>
        )}

        {activeTab === 'proposals' && (
          <>
            <div style={{ marginBottom: 28 }}>
              <SectionLabel>Your Bids</SectionLabel>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 40, margin: 0, color: T.textPrimary }}>
                My <span style={{ color: T.brand }}>Proposals</span>
              </h2>
            </div>

            {!proposalsLoading && !proposalsError && inProgressJobs.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionLabel>In Progress</SectionLabel>
                <Card>
                  {inProgressJobs.map((p) => (
                    <ActiveJobRow
                      key={p._id}
                      proposal={p}
                      onMarkComplete={handleMarkComplete}
                      completing={completingId === p.job?._id}
                    />
                  ))}
                </Card>
              </div>
            )}

            {!proposalsLoading && !proposalsError && completedJobs.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionLabel>Completed</SectionLabel>
                <Card>
                  {completedJobs.map((p) => (
                    <ActiveJobRow key={p._id} proposal={p} onMarkComplete={() => {}} completing={false} />
                  ))}
                </Card>
              </div>
            )}

            <SectionLabel>All Proposals</SectionLabel>
            <Card>
              {proposalsLoading ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>Loading your proposals…</div>
              ) : proposalsError ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: T.danger, fontSize: 13 }}>{proposalsError}</div>
              ) : proposals.length === 0 ? (
                <EmptyState icon="📬" title="No proposals submitted yet" subtitle="Browse open jobs and submit a proposal to get started." actionLabel="Browse Jobs" onAction={() => navigate('/jobs')} />
              ) : (
                <div>
                  {proposals.map((p) => <ProposalRow key={p._id} proposal={p} />)}
                </div>
              )}
            </Card>
          </>
        )}

        {activeTab === 'matches' && (
          <>
            <div style={{ marginBottom: 28 }}>
              <SectionLabel>AI-Powered Job Matches</SectionLabel>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 40, margin: 0, color: T.textPrimary }}>
                Recommended <span style={{ color: T.brand }}>For You</span>
              </h2>
            </div>
            {matchesLoading ? (
              <Card><div style={{ textAlign: 'center', padding: '24px', color: T.textMuted, fontSize: 13 }}>Finding your best-fit jobs…</div></Card>
            ) : matches.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {matches.map((m) => (
                  <MatchCard key={m._id || m.jobId || m.title} match={m} onView={(match) => navigate(`/jobs/${match._id || match.jobId}`)} />
                ))}
              </div>
            ) : (
              <Card>
                <EmptyState icon="🧠" title="No matches yet" subtitle="This uses TF-IDF cosine similarity to compare your skills against open jobs. Complete your profile to see results." actionLabel="Complete Profile" onAction={() => navigate('/profile/edit')} />
              </Card>
            )}
          </>
        )}

        {activeTab === 'badges' && (
          <>
            <div style={{ marginBottom: 28 }}>
              <SectionLabel tag="Coming soon">Achievement System</SectionLabel>
              <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 40, margin: 0, color: T.textPrimary }}>
                Your <span style={{ color: T.brand }}>Badges</span>
              </h2>
            </div>
            <Card>
              <EmptyState icon="🏆" title="Gamification System is under development" subtitle="Complete jobs and build your reputation to unlock achievements once this feature ships." />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}