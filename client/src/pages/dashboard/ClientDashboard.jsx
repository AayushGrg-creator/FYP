import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { getMyJobs, updateJobStatus, jobService } from '../../services/jobService';
import { getJobProposals, acceptProposal, rejectProposal } from '../../services/proposalService';
import projectService from '../../services/projectService';

const TABS = ['Overview', 'My Jobs', 'Proposals'];

/* ─── Design tokens — matches FreelancerDashboard.jsx / brand palette ── */
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
  purple:      '#8B5CF6',
  textPrimary: '#0F1C3F',
  textSecond:  '#4B5E8A',
  textMuted:   '#8FA3CC',
  shadow:      '0 2px 12px rgba(29,111,235,0.08)',
  shadowMd:    '0 4px 24px rgba(29,111,235,0.12)',
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Real ClientProfile data (company, industry, location, avatar) ──
  const { profile, loading: profileLoading, fetchProfile } = useProfile();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const companyName      = profile?.companyName  || '';
  const industryType     = profile?.industryType || '';
  const location          = profile?.location     || '';
  const avatarUrl         = profile?.avatarUrl    || user?.avatarUrl || '';
  const profileIncomplete = !companyName && !industryType && !location && !avatarUrl;

  const [tab, setTab]             = useState('Overview');
  const [jobs, setJobs]           = useState([]);
  const [jobsLoading, setJobsL]   = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setPropL] = useState(false);
  const [stats, setStats]         = useState({ open: 0, inProgress: 0, completed: 0, total: 0 });
  const [actionLoading, setActionL] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // ── Active workspaces (Projects) for this client ────────────────────────
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    projectService.getMine().then((res) => setProjects(res.projects || [])).catch(() => {});
  }, []);

  // ── Load jobs ──────────────────────────────────────────────────────────────
  // NOTE: Job.status enum is 'open' | 'in_progress' | 'completed' | 'disputed'
  // (underscore, no 'cancelled' state exists on the schema).
  const loadJobs = useCallback(async () => {
    setJobsL(true);
    try {
      // Only send a status param when a filter is actually selected — sending
      // status: '' would filter for an empty string server-side instead of "all".
      const params = statusFilter ? { status: statusFilter } : {};
      const data = await getMyJobs(params);
      setJobs(data.jobs);

      const all = await getMyJobs({});
      setStats({
        open:       all.jobs.filter(j => j.status === 'open').length,
        inProgress: all.jobs.filter(j => j.status === 'in_progress').length,
        completed:  all.jobs.filter(j => j.status === 'completed').length,
        total:      all.total ?? all.jobs.length,
      });
    } catch {}
    setJobsL(false);
  }, [statusFilter]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // ── Load proposals for selected job ───────────────────────────────────────
  const loadProposals = useCallback(async (jobId) => {
    setPropL(true);
    try {
      const data = await getJobProposals(jobId);
      setProposals(Array.isArray(data) ? data : (data.proposals || []));
    } catch {}
    setPropL(false);
  }, []);

  const selectJob = (job) => {
    setSelectedJob(job);
    setTab('Proposals');
    loadProposals(job._id);
  };

 const handleAccept = async (proposalId) => {
  setActionL(proposalId);
  try {
    const result = await acceptProposal(proposalId);
    await loadProposals(selectedJob._id);
    await loadJobs();

    // Redirect to the shared workspace now that a Project exists
    if (result?.project?._id) {
      navigate(`/workspace/${result.project._id}`);
      return; // skip clearing actionLoading since we're navigating away
    }
  } catch {}
  setActionL(null);
};

  const handleReject = async (proposalId) => {
    setActionL(proposalId + 'r');
    try {
      await rejectProposal(proposalId);
      await loadProposals(selectedJob._id);
    } catch {}
    setActionL(null);
  };

  // NOTE: schema has no 'cancelled' status — closing a listing is represented
  // as archiving it (isArchived: true) rather than an invalid status value.
  const handleCloseJob = async (jobId) => {
    if (!window.confirm('Cancel this job listing?')) return;
    try {
      await jobService.update(jobId, { isArchived: true });
      await loadJobs();
    } catch {}
  };

  return (
    <div style={styles.page}>
      {/* Top bar — matches FreelancerDashboard.jsx, uses real ClientProfile avatar */}
      <div style={styles.topBar}>
        <div style={styles.logo}>
          Task <span style={{ color: T.brand }}>Tide</span>
        </div>
        <div
          onClick={() => navigate('/profile/edit')}
          style={styles.userChip}
          title="Edit your profile"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={user?.name} style={styles.userAvatar} />
          ) : (
            <div style={styles.userAvatarFallback}>
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <div style={styles.userName}>{user?.name}</div>
            <div style={styles.userRole}>Client</div>
          </div>
        </div>
      </div>

      <div style={styles.inner}>
        {/* Welcome header */}
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.pageTitle}>
              Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p style={styles.pageSub}>Manage your job listings and review incoming proposals</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/profile/edit" style={styles.editProfileBtn}>Edit Profile</Link>
            <Link to="/jobs/post" style={styles.postBtn}>+ Post a Job</Link>
          </div>
        </div>

        {/* Profile incomplete nudge — mirrors FreelancerDashboard.jsx */}
        {!profileLoading && profileIncomplete && (
          <div style={styles.nudgeCard}>
            <div>
              <div style={styles.nudgeTitle}>Your company profile is empty</div>
              <div style={styles.nudgeSub}>
                Add your company name, industry, and location so freelancers know who they're working with.
              </div>
            </div>
            <Link to="/profile/edit" style={styles.nudgeBtn}>Complete Profile</Link>
          </div>
        )}

        {/* Company profile summary — real data from ClientProfile */}
        {!profileLoading && !profileIncomplete && (
          <div style={styles.companyCard}>
            <div style={styles.companyRow}>
              <div>
                <div style={styles.companyLabel}>Company</div>
                <div style={styles.companyValue}>{companyName || 'Not set'}</div>
              </div>
              <div>
                <div style={styles.companyLabel}>Industry</div>
                <div style={styles.companyValue}>{industryType || 'Not set'}</div>
              </div>
              <div>
                <div style={styles.companyLabel}>Location</div>
                <div style={styles.companyValue}>{location || 'Not set'}</div>
              </div>
              <Link to="/profile/edit" style={styles.companyEditLink}>Edit →</Link>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div style={styles.statsRow}>
          <StatCard label="Open Jobs"     value={stats.open}       accent={T.brand}   icon="📂" />
          <StatCard label="In Progress"   value={stats.inProgress} accent={T.warning} icon="⚡" />
          <StatCard label="Completed"     value={stats.completed}  accent={T.success} icon="✅" />
          <StatCard label="Total Posted"  value={stats.total || 0} accent={T.purple}  icon="📋" />
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t}
              style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Overview tab ── */}
        {tab === 'Overview' && (
          <div style={styles.overviewGrid}>
            <div style={styles.overviewCard}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Recent Listings</span>
                <button style={styles.viewAllBtn} onClick={() => setTab('My Jobs')}>View all</button>
              </div>
              {jobsLoading
                ? <LoadingRows n={3} />
                : jobs.slice(0, 5).map(job => (
                  <div key={job._id} style={styles.jobRow}>
                    <div style={styles.jobRowLeft}>
                      <StatusDot status={job.status} />
                      <div>
                        <div style={styles.jobRowTitle}>{job.title}</div>
                        <div style={styles.jobRowSub}>
                          {job.budgetAmount?.toLocaleString()} NPR ({job.budgetType}) · {(job.category || '').replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>
                    <div style={styles.jobRowActions}>
                      <button style={styles.tinyBtn} onClick={() => selectJob(job)}>
                        View Proposals
                      </button>
                    </div>
                  </div>
                ))
              }
              {!jobsLoading && jobs.length === 0 && (
                <Empty message="No jobs posted yet." cta="Post your first job" href="/jobs/post" />
              )}
            </div>

            {/* ── Active Workspaces (Projects) ── */}
            {projects.length > 0 && (
              <div style={styles.overviewCard}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardTitle}>Active Workspaces</span>
                </div>
                {projects.map((p) => (
                  <div key={p._id} style={styles.jobRow}>
                    <div style={styles.jobRowLeft}>
                      <div>
                        <div style={styles.jobRowTitle}>{p.job?.title || 'Project'}</div>
                        <div style={styles.jobRowSub}>with {p.freelancer?.name} · {p.status}</div>
                      </div>
                    </div>
                    <Link to={`/workspace/${p._id}`} style={styles.tinyLinkBtn}>Open →</Link>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.overviewCard}>
              <div style={styles.cardHeader}><span style={styles.cardTitle}>Quick Tips</span></div>
              {TIPS.map((tip, i) => (
                <div key={i} style={styles.tipRow}>
                  <span style={styles.tipIcon}>{tip.icon}</span>
                  <div>
                    <div style={styles.tipTitle}>{tip.title}</div>
                    <div style={styles.tipText}>{tip.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── My Jobs tab ── */}
        {tab === 'My Jobs' && (
          <div>
            <div style={styles.filterRow}>
              {['', 'open', 'in_progress', 'completed', 'disputed'].map(s => (
                <button
                  key={s}
                  style={{ ...styles.filterBtn, ...(statusFilter === s ? styles.filterActive : {}) }}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === '' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>

            {jobsLoading ? (
              <LoadingRows n={5} />
            ) : jobs.length === 0 ? (
              <Empty message="No jobs match this filter." cta="Post a new job" href="/jobs/post" />
            ) : (
              <div style={styles.jobsTable}>
                <div style={styles.tableHeader}>
                  <span style={{ flex: 3 }}>Job</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>Status</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>Budget</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>Posted</span>
                  <span style={{ flex: 2, textAlign: 'right' }}>Actions</span>
                </div>
                {jobs.map(job => (
                  <div key={job._id} style={styles.tableRow}>
                    <div style={{ flex: 3 }}>
                      <div style={styles.tableJobTitle}>{job.title}</div>
                      <div style={styles.tableJobSub}>{(job.category || '').replace(/_/g, ' ')}</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                      <StatusBadge status={job.status} />
                    </div>
                    <div style={{ flex: 1, color: T.brand, fontWeight: 600, fontSize: 13, textAlign: 'center' }}>
                      {job.budgetAmount?.toLocaleString()} NPR
                    </div>
                    <div style={{ flex: 1, color: T.textMuted, fontSize: 13, textAlign: 'center' }}>
                      {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{ flex: 2, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button style={styles.tinyBtn} onClick={() => selectJob(job)}>Proposals</button>
                      <Link to={`/jobs/${job._id}`} style={styles.tinyLinkBtn}>View</Link>
                      {job.status === 'open' && (
                        <Link to={`/jobs/${job._id}/edit`} style={styles.tinyLinkBtn}>Edit</Link>
                      )}
                      {['open', 'in_progress'].includes(job.status) && (
                        <button
                          style={{ ...styles.tinyBtn, background: '#FEF2F2', color: T.danger, borderColor: '#FECACA' }}
                          onClick={() => handleCloseJob(job._id)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Proposals tab ── */}
        {tab === 'Proposals' && (
          <div>
            {!selectedJob ? (
              <div style={styles.selectJobPrompt}>
                <span style={{ fontSize: 48 }}>📋</span>
                <p style={{ color: T.textMuted, marginTop: 16 }}>Select a job from "My Jobs" to view its proposals.</p>
                <button style={styles.ghostBtn} onClick={() => setTab('My Jobs')}>Go to My Jobs</button>
              </div>
            ) : (
              <>
                <div style={styles.proposalHeader}>
                  <div>
                    <div style={styles.proposalJobTitle}>Proposals for: <span style={{ color: T.brand }}>{selectedJob.title}</span></div>
                    <div style={styles.proposalCount}>{proposals.length} proposal{proposals.length !== 1 ? 's' : ''} received</div>
                  </div>
                  <button style={styles.ghostBtn} onClick={() => setSelectedJob(null)}>← Back to job list</button>
                </div>

                {proposalsLoading ? (
                  <LoadingRows n={3} />
                ) : proposals.length === 0 ? (
                  <div style={styles.emptyProposals}>
                    <span style={{ fontSize: 40 }}>📬</span>
                    <p style={{ color: T.textMuted }}>No proposals yet. Share your job to get applications.</p>
                  </div>
                ) : (
                  <div style={styles.proposalList}>
                    {proposals.map(p => (
                      <ProposalCard
                        key={p._id}
                        proposal={p}
                        onAccept={() => handleAccept(p._id)}
                        onReject={() => handleReject(p._id)}
                        acceptLoading={actionLoading === p._id}
                        rejectLoading={actionLoading === p._id + 'r'}
                        jobStatus={selectedJob.status}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, icon }) {
  return (
    <div style={{ ...styles.statCard, borderColor: accent + '33' }}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={{ ...styles.statValue, color: accent }}>{value ?? 0}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function ProposalCard({ proposal, onAccept, onReject, acceptLoading, rejectLoading, jobStatus }) {
  const [expanded, setExpanded] = useState(false);
  // Proposal.js schema field is `freelancer`, not `freelancerId`.
  const fl = proposal.freelancer || {};
  const STATUS_COLORS = {
    pending:   { color: T.warning, bg: '#FEF3C7' },
    accepted:  { color: T.success, bg: '#D1FAE5' },
    rejected:  { color: T.danger,  bg: '#FEE2E2' },
    withdrawn: { color: T.textMuted, bg: T.surfaceAlt },
  };
  const sc = STATUS_COLORS[proposal.status] || STATUS_COLORS.pending;

  return (
    <div style={styles.proposalCard}>
      <div style={styles.proposalTop}>
        <div style={styles.proposalFreelancer}>
          <div style={styles.propAvatar}>
            {fl.avatar
              ? <img src={fl.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: T.brand, fontWeight: 700, fontSize: 18 }}>{(fl.name || 'F')[0].toUpperCase()}</span>
            }
          </div>
          <div>
            <div style={styles.propName}>
              {fl.name}
              {fl._id && (
                <Link to={`/profile/${fl._id}`} style={styles.viewProfileLink}>
                  View Profile →
                </Link>
              )}
            </div>
            <div style={styles.propMeta}>
              {fl.trustScore !== undefined && (
                <span style={styles.trustScore}>⭐ {fl.trustScore}/100</span>
              )}
            </div>
          </div>
        </div>
        <div style={styles.proposalRight}>
          <div style={styles.propBid}>NPR {proposal.bidAmount?.toLocaleString()}</div>
          {/* Proposal.js schema field is `deliveryTimeframe`, not `estimatedDays`. */}
          <div style={styles.propDays}>{proposal.deliveryTimeframe} days</div>
          <span style={{ background: sc.bg, color: sc.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
            {proposal.status}
          </span>
        </div>
      </div>

      <div
        style={{ ...styles.propCover, WebkitLineClamp: expanded ? 'unset' : 3 }}
        onClick={() => setExpanded(e => !e)}
      >
        {proposal.coverLetter}
      </div>
      <button style={styles.expandBtn} onClick={() => setExpanded(e => !e)}>
        {expanded ? 'Show less ▲' : 'Read more ▼'}
      </button>

      {proposal.status === 'pending' && jobStatus === 'open' && (
        <div style={styles.propActions}>
          <button
            style={{ ...styles.acceptBtn, opacity: acceptLoading ? 0.7 : 1 }}
            disabled={acceptLoading || rejectLoading}
            onClick={onAccept}
          >
            {acceptLoading ? 'Accepting…' : '✓ Accept Proposal'}
          </button>
          <button
            style={{ ...styles.rejectBtn, opacity: rejectLoading ? 0.7 : 1 }}
            disabled={acceptLoading || rejectLoading}
            onClick={onReject}
          >
            {rejectLoading ? 'Rejecting…' : '✕ Reject'}
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const MAP = {
    open:         { bg: '#D1FAE5', color: '#059669' },
    in_progress:  { bg: '#DBEAFE', color: '#2563EB' },
    completed:    { bg: '#EDE9FE', color: '#7C3AED' },
    disputed:     { bg: '#FEE2E2', color: '#DC2626' },
  };
  const s = MAP[status] || MAP.open;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {status?.replace('_', ' ')}
    </span>
  );
}

function StatusDot({ status }) {
  const COLORS = { open: T.success, in_progress: T.brand, completed: T.purple, disputed: T.danger };
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[status] || T.textMuted, flexShrink: 0, marginTop: 6 }} />;
}

function Empty({ message, cta, href }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: T.textMuted, fontSize: 14 }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🗂</div>
      <p style={{ margin: '0 0 16px' }}>{message}</p>
      <Link to={href} style={{ color: T.brand, fontWeight: 600, textDecoration: 'none' }}>{cta} →</Link>
    </div>
  );
}

function LoadingRows({ n }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ height: 64, background: T.surfaceAlt, borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const TIPS = [
  { icon: '✏️', title: 'Write clear descriptions', text: 'Detailed requirements attract higher-quality proposals.' },
  { icon: '💰', title: 'Set a realistic budget', text: 'Competitive budgets get more experienced freelancers.' },
  { icon: '⚡', title: 'Respond quickly', text: 'Accepting a proposal within 48 h improves project outcomes.' },
  { icon: '⭐', title: 'Leave honest reviews', text: 'Reviews help build a trusted community for everyone.' },
];

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: { minHeight: '100vh', width: '100%', background: T.bg, fontFamily: "'Sora', 'DM Sans', sans-serif" },
  inner: { maxWidth: 1200, margin: '0 auto', padding: '36px 32px 80px' },

  // ── Top bar ──
  topBar: {
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
  },
  logo: {
    fontFamily: "'Sora', sans-serif",
    fontSize: 20,
    fontWeight: 700,
    color: T.textPrimary,
  },
  userChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
  },
  userAvatar: {
    width: 42, height: 42, borderRadius: '50%', objectFit: 'cover',
    border: `2px solid ${T.borderStrong}`,
  },
  userAvatarFallback: {
    width: 42, height: 42, borderRadius: '50%',
    background: T.brandLight, border: `2px solid ${T.borderStrong}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: T.brand, fontWeight: 700, fontSize: 16,
  },
  userName: { fontSize: 13, fontWeight: 600, color: T.textPrimary },
  userRole: { fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.textMuted },

  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 },
  pageTitle: { margin: 0, fontSize: 28, fontWeight: 800, color: T.textPrimary, letterSpacing: '-0.02em' },
  pageSub: { margin: '6px 0 0', color: T.textMuted, fontSize: 15 },
  postBtn: {
    background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`,
    color: '#fff', borderRadius: 10, padding: '12px 24px',
    fontWeight: 700, textDecoration: 'none', fontSize: 15,
    boxShadow: T.shadowMd,
    whiteSpace: 'nowrap',
  },
  editProfileBtn: {
    background: T.surface,
    border: `1px solid ${T.border}`,
    color: T.textSecond,
    borderRadius: 10,
    padding: '11px 20px',
    fontWeight: 600,
    textDecoration: 'none',
    fontSize: 14,
    whiteSpace: 'nowrap',
  },

  // ── Profile incomplete nudge ──
  nudgeCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: T.brandLight, border: `1px solid ${T.borderStrong}`,
    borderRadius: 14, padding: '18px 24px', marginBottom: 24, gap: 16, flexWrap: 'wrap',
    boxShadow: T.shadowMd,
  },
  nudgeTitle: { fontWeight: 600, fontSize: 14, color: T.textPrimary, marginBottom: 2 },
  nudgeSub: { fontSize: 12, color: T.textSecond },
  nudgeBtn: {
    padding: '9px 18px', background: T.brand, borderRadius: 8, color: '#fff',
    fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: 'uppercase',
    letterSpacing: '0.1em', textDecoration: 'none', whiteSpace: 'nowrap',
  },

  // ── Company profile summary card ──
  companyCard: {
    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
    padding: '18px 24px', marginBottom: 24, boxShadow: T.shadow,
  },
  companyRow: {
    display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap',
  },
  companyLabel: {
    fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: T.textMuted, marginBottom: 4,
  },
  companyValue: { fontSize: 14, fontWeight: 600, color: T.textPrimary },
  companyEditLink: {
    marginLeft: 'auto', color: T.brand, fontWeight: 600, fontSize: 13, textDecoration: 'none',
  },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 },
  statCard: {
    background: T.surface, border: '1px solid',
    borderRadius: 14, padding: '20px',
    display: 'flex', flexDirection: 'column', gap: 4,
    boxShadow: T.shadow,
  },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em' },
  statLabel: { color: T.textMuted, fontSize: 13 },

  tabs: { display: 'flex', gap: 4, borderBottom: `1px solid ${T.border}`, marginBottom: 24 },
  tab: {
    background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer',
    padding: '10px 20px', fontSize: 15, fontWeight: 600,
    borderBottom: '2px solid transparent', marginBottom: -1, transition: 'all 0.15s',
  },
  tabActive: { color: T.brand, borderBottomColor: T.brand },

  overviewGrid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 },
  overviewCard: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '24px', boxShadow: T.shadow },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { color: T.textPrimary, fontWeight: 700, fontSize: 16 },
  viewAllBtn: { background: 'none', border: 'none', color: T.brand, cursor: 'pointer', fontSize: 13, fontWeight: 600 },

  jobRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${T.border}` },
  jobRowLeft: { display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 },
  jobRowTitle: { color: T.textPrimary, fontWeight: 600, fontSize: 14 },
  jobRowSub: { color: T.textMuted, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  jobRowActions: { flexShrink: 0, marginLeft: 12 },

  tipRow: { display: 'flex', gap: 12, padding: '12px 0', borderBottom: `1px solid ${T.border}` },
  tipIcon: { fontSize: 20, flexShrink: 0 },
  tipTitle: { color: T.textSecond, fontWeight: 600, fontSize: 14 },
  tipText: { color: T.textMuted, fontSize: 13, marginTop: 2 },

  filterRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterBtn: {
    background: T.surface, border: `1px solid ${T.border}`, color: T.textMuted,
    borderRadius: 20, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    textTransform: 'capitalize', transition: 'all 0.15s',
  },
  filterActive: { background: T.brandLight, border: `1px solid ${T.brand}`, color: T.brand },

  jobsTable: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: T.shadow },
  tableHeader: {
    display: 'flex', gap: 16, padding: '12px 20px',
    color: T.textMuted, fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    borderBottom: `1px solid ${T.border}`,
  },
  tableRow: {
    display: 'flex', gap: 16, padding: '16px 20px',
    borderBottom: `1px solid ${T.surfaceAlt}`, alignItems: 'center',
    transition: 'background 0.15s',
  },
  tableJobTitle: { color: T.textPrimary, fontWeight: 600, fontSize: 14 },
  tableJobSub: { color: T.textMuted, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },

  selectJobPrompt: { textAlign: 'center', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  proposalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  proposalJobTitle: { color: T.textPrimary, fontWeight: 700, fontSize: 18 },
  proposalCount: { color: T.textMuted, fontSize: 14, marginTop: 4 },
  emptyProposals: { textAlign: 'center', padding: '60px', color: T.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  proposalList: { display: 'flex', flexDirection: 'column', gap: 16 },

  proposalCard: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '20px 24px', boxShadow: T.shadow },
  proposalTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  proposalFreelancer: { display: 'flex', gap: 12, alignItems: 'center' },
  propAvatar: {
    width: 48, height: 48, borderRadius: '50%', background: T.brandLight,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0,
  },
  propName: { color: T.textPrimary, fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10 },
  viewProfileLink: {
    color: T.brand, fontWeight: 600, fontSize: 12, textDecoration: 'none',
    fontFamily: "'DM Mono', monospace",
  },
  propMeta: { display: 'flex', gap: 8, marginTop: 3 },
  trustScore: { color: T.warning, fontSize: 12, fontWeight: 600 },
  proposalRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  propBid: { color: T.brand, fontWeight: 800, fontSize: 18 },
  propDays: { color: T.textMuted, fontSize: 12 },
  propCover: {
    color: T.textSecond, fontSize: 14, lineHeight: 1.7,
    display: '-webkit-box', WebkitBoxOrient: 'vertical',
    overflow: 'hidden', cursor: 'pointer',
  },
  expandBtn: {
    background: 'none', border: 'none', color: T.brand,
    cursor: 'pointer', fontSize: 12, padding: '4px 0',
  },
  propActions: { display: 'flex', gap: 10, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.border}` },
  acceptBtn: {
    background: `linear-gradient(135deg, ${T.success}, #059669)`,
    border: 'none', color: '#fff', borderRadius: 8,
    padding: '10px 24px', cursor: 'pointer', fontSize: 14, fontWeight: 700,
  },
  rejectBtn: {
    background: 'transparent', border: `1px solid ${T.border}`,
    color: T.danger, borderRadius: 8, padding: '10px 20px',
    cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },

  tinyBtn: {
    background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.textSecond,
    borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  tinyLinkBtn: {
    background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.textSecond,
    borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600,
    textDecoration: 'none', display: 'inline-block',
  },
  ghostBtn: {
    background: 'transparent', border: `1px solid ${T.border}`,
    color: T.brand, borderRadius: 8, padding: '10px 20px',
    cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
};