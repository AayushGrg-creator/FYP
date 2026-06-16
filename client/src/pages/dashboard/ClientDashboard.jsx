import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { getMyJobs, updateJobStatus } from '../../services/jobService';
import { getJobProposals, acceptProposal, rejectProposal } from '../../services/proposalService';

const TABS = ['Overview', 'My Jobs', 'Proposals'];

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]             = useState('Overview');
  const [jobs, setJobs]           = useState([]);
  const [jobsLoading, setJobsL]   = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setPropL] = useState(false);
  const [stats, setStats]         = useState({ open: 0, inProgress: 0, completed: 0 });
  const [actionLoading, setActionL] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // ── Load jobs ──────────────────────────────────────────────────────────────
  const loadJobs = useCallback(async () => {
    setJobsL(true);
    try {
      const data = await getMyJobs({ status: statusFilter });
      setJobs(data.jobs);
      // Compute stats from all jobs (no status filter)
      const all = await getMyJobs({});
      setStats({
        open:       all.jobs.filter(j => j.status === 'open').length,
        inProgress: all.jobs.filter(j => j.status === 'in-progress').length,
        completed:  all.jobs.filter(j => j.status === 'completed').length,
        total:      all.total,
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
      setProposals(data);
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
      await acceptProposal(proposalId);
      await loadProposals(selectedJob._id);
      await loadJobs();
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

  const handleCloseJob = async (jobId) => {
    if (!window.confirm('Cancel this job listing?')) return;
    try {
      await updateJobStatus(jobId, 'cancelled');
      await loadJobs();
    } catch {}
  };

  return (
    <div style={styles.page}>
      {/* Welcome header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>
            Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={styles.pageSub}>Manage your job listings and review incoming proposals</p>
        </div>
        <Link to="/jobs/post" style={styles.postBtn}>+ Post a Job</Link>
      </div>

      {/* Stats row */}
      <div style={styles.statsRow}>
        <StatCard label="Open Jobs"     value={stats.open}       accent="#0EA5E9" icon="📂" />
        <StatCard label="In Progress"   value={stats.inProgress} accent="#F59E0B" icon="⚡" />
        <StatCard label="Completed"     value={stats.completed}  accent="#22C55E" icon="✅" />
        <StatCard label="Total Posted"  value={stats.total || 0} accent="#8B5CF6" icon="📋" />
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
          {/* Recent jobs */}
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
                        {job.budget?.min?.toLocaleString()} – {job.budget?.max?.toLocaleString()} NPR · {(job.category || '').replace(/-/g, ' ')}
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

          {/* Quick tips */}
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
            {['', 'open', 'in-progress', 'completed', 'cancelled'].map(s => (
              <button
                key={s}
                style={{ ...styles.filterBtn, ...(statusFilter === s ? styles.filterActive : {}) }}
                onClick={() => setStatusFilter(s)}
              >
                {s === '' ? 'All' : s.replace('-', ' ')}
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
                    <div style={styles.tableJobSub}>{(job.category || '').replace(/-/g, ' ')}</div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <StatusBadge status={job.status} />
                  </div>
                  <div style={{ flex: 1, color: '#0EA5E9', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>
                    {job.budget?.max?.toLocaleString()} NPR
                  </div>
                  <div style={{ flex: 1, color: '#64748B', fontSize: 13, textAlign: 'center' }}>
                    {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ flex: 2, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button style={styles.tinyBtn} onClick={() => selectJob(job)}>Proposals</button>
                    <Link to={`/jobs/${job._id}`} style={styles.tinyLinkBtn}>View</Link>
                    {job.status === 'open' && (
                      <Link to={`/jobs/${job._id}/edit`} style={styles.tinyLinkBtn}>Edit</Link>
                    )}
                    {['open', 'in-progress'].includes(job.status) && (
                      <button
                        style={{ ...styles.tinyBtn, background: '#450A0A', color: '#F87171', borderColor: '#7F1D1D' }}
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
              <p style={{ color: '#94A3B8', marginTop: 16 }}>Select a job from "My Jobs" to view its proposals.</p>
              <button style={styles.ghostBtn} onClick={() => setTab('My Jobs')}>Go to My Jobs</button>
            </div>
          ) : (
            <>
              <div style={styles.proposalHeader}>
                <div>
                  <div style={styles.proposalJobTitle}>Proposals for: <span style={{ color: '#0EA5E9' }}>{selectedJob.title}</span></div>
                  <div style={styles.proposalCount}>{proposals.length} proposal{proposals.length !== 1 ? 's' : ''} received</div>
                </div>
                <button style={styles.ghostBtn} onClick={() => setSelectedJob(null)}>← Back to job list</button>
              </div>

              {proposalsLoading ? (
                <LoadingRows n={3} />
              ) : proposals.length === 0 ? (
                <div style={styles.emptyProposals}>
                  <span style={{ fontSize: 40 }}>📬</span>
                  <p style={{ color: '#64748B' }}>No proposals yet. Share your job to get applications.</p>
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
  const fl = proposal.freelancerId || {};
  const STATUS_COLORS = {
    pending:   { color: '#F59E0B', bg: '#451A03' },
    accepted:  { color: '#34D399', bg: '#022C22' },
    rejected:  { color: '#F87171', bg: '#1C0A0A' },
    withdrawn: { color: '#94A3B8', bg: '#1E293B' },
  };
  const sc = STATUS_COLORS[proposal.status] || STATUS_COLORS.pending;

  return (
    <div style={styles.proposalCard}>
      <div style={styles.proposalTop}>
        <div style={styles.proposalFreelancer}>
          <div style={styles.propAvatar}>
            {fl.avatar
              ? <img src={fl.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: '#0EA5E9', fontWeight: 700, fontSize: 18 }}>{(fl.name || 'F')[0].toUpperCase()}</span>
            }
          </div>
          <div>
            <div style={styles.propName}>{fl.name}</div>
            <div style={styles.propMeta}>
              {fl.trustScore !== undefined && (
                <span style={styles.trustScore}>⭐ {fl.trustScore}/100</span>
              )}
            </div>
          </div>
        </div>
        <div style={styles.proposalRight}>
          <div style={styles.propBid}>NPR {proposal.bidAmount?.toLocaleString()}</div>
          <div style={styles.propDays}>{proposal.estimatedDays} days</div>
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
    open:          { bg: '#022C22', color: '#34D399' },
    'in-progress': { bg: '#0C1A4E', color: '#60A5FA' },
    completed:     { bg: '#1C1917', color: '#A78BFA' },
    cancelled:     { bg: '#1C0A0A', color: '#F87171' },
  };
  const s = MAP[status] || MAP.open;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {status?.replace('-', ' ')}
    </span>
  );
}

function StatusDot({ status }) {
  const COLORS = { open: '#22C55E', 'in-progress': '#60A5FA', completed: '#A78BFA', cancelled: '#F87171' };
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[status] || '#94A3B8', flexShrink: 0, marginTop: 6 }} />;
}

function Empty({ message, cta, href }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748B', fontSize: 14 }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🗂</div>
      <p style={{ margin: '0 0 16px' }}>{message}</p>
      <Link to={href} style={{ color: '#0EA5E9', fontWeight: 600, textDecoration: 'none' }}>{cta} →</Link>
    </div>
  );
}

function LoadingRows({ n }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ height: 64, background: '#1E293B', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
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
  page: { minHeight: '100vh', background: '#0B1120', fontFamily: "'DM Sans', sans-serif", padding: '36px 32px 80px', maxWidth: 1100, margin: '0 auto' },
  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 },
  pageTitle: { margin: 0, fontSize: 28, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.02em' },
  pageSub: { margin: '6px 0 0', color: '#64748B', fontSize: 15 },
  postBtn: {
    background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
    color: '#fff', borderRadius: 10, padding: '12px 24px',
    fontWeight: 700, textDecoration: 'none', fontSize: 15,
    boxShadow: '0 0 20px rgba(14,165,233,0.3)',
    whiteSpace: 'nowrap',
  },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 },
  statCard: {
    background: '#111827', border: '1px solid',
    borderRadius: 14, padding: '20px',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em' },
  statLabel: { color: '#64748B', fontSize: 13 },

  tabs: { display: 'flex', gap: 4, borderBottom: '1px solid #1E293B', marginBottom: 24 },
  tab: {
    background: 'none', border: 'none', color: '#64748B', cursor: 'pointer',
    padding: '10px 20px', fontSize: 15, fontWeight: 600,
    borderBottom: '2px solid transparent', marginBottom: -1, transition: 'all 0.15s',
  },
  tabActive: { color: '#0EA5E9', borderBottomColor: '#0EA5E9' },

  overviewGrid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 },
  overviewCard: { background: '#111827', border: '1px solid #1E293B', borderRadius: 14, padding: '24px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { color: '#E2E8F0', fontWeight: 700, fontSize: 16 },
  viewAllBtn: { background: 'none', border: 'none', color: '#0EA5E9', cursor: 'pointer', fontSize: 13, fontWeight: 600 },

  jobRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #1E293B' },
  jobRowLeft: { display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 },
  jobRowTitle: { color: '#E2E8F0', fontWeight: 600, fontSize: 14 },
  jobRowSub: { color: '#475569', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  jobRowActions: { flexShrink: 0, marginLeft: 12 },

  tipRow: { display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #1E293B' },
  tipIcon: { fontSize: 20, flexShrink: 0 },
  tipTitle: { color: '#CBD5E1', fontWeight: 600, fontSize: 14 },
  tipText: { color: '#64748B', fontSize: 13, marginTop: 2 },

  filterRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterBtn: {
    background: '#111827', border: '1px solid #1E293B', color: '#64748B',
    borderRadius: 20, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    textTransform: 'capitalize', transition: 'all 0.15s',
  },
  filterActive: { background: '#0F2235', border: '1px solid #0EA5E9', color: '#0EA5E9' },

  jobsTable: { background: '#111827', border: '1px solid #1E293B', borderRadius: 14, overflow: 'hidden' },
  tableHeader: {
    display: 'flex', gap: 16, padding: '12px 20px',
    color: '#475569', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    borderBottom: '1px solid #1E293B',
  },
  tableRow: {
    display: 'flex', gap: 16, padding: '16px 20px',
    borderBottom: '1px solid #0F172A', alignItems: 'center',
    transition: 'background 0.15s',
  },
  tableJobTitle: { color: '#E2E8F0', fontWeight: 600, fontSize: 14 },
  tableJobSub: { color: '#475569', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },

  selectJobPrompt: { textAlign: 'center', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  proposalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  proposalJobTitle: { color: '#E2E8F0', fontWeight: 700, fontSize: 18 },
  proposalCount: { color: '#64748B', fontSize: 14, marginTop: 4 },
  emptyProposals: { textAlign: 'center', padding: '60px', color: '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  proposalList: { display: 'flex', flexDirection: 'column', gap: 16 },

  proposalCard: { background: '#111827', border: '1px solid #1E293B', borderRadius: 14, padding: '20px 24px' },
  proposalTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  proposalFreelancer: { display: 'flex', gap: 12, alignItems: 'center' },
  propAvatar: {
    width: 48, height: 48, borderRadius: '50%', background: '#0F2235',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0,
  },
  propName: { color: '#E2E8F0', fontWeight: 700, fontSize: 15 },
  propMeta: { display: 'flex', gap: 8, marginTop: 3 },
  trustScore: { color: '#F59E0B', fontSize: 12, fontWeight: 600 },
  proposalRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  propBid: { color: '#0EA5E9', fontWeight: 800, fontSize: 18 },
  propDays: { color: '#64748B', fontSize: 12 },
  propCover: {
    color: '#94A3B8', fontSize: 14, lineHeight: 1.7,
    display: '-webkit-box', WebkitBoxOrient: 'vertical',
    overflow: 'hidden', cursor: 'pointer',
  },
  expandBtn: {
    background: 'none', border: 'none', color: '#0EA5E9',
    cursor: 'pointer', fontSize: 12, padding: '4px 0',
  },
  propActions: { display: 'flex', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid #1E293B' },
  acceptBtn: {
    background: 'linear-gradient(135deg, #059669, #047857)',
    border: 'none', color: '#fff', borderRadius: 8,
    padding: '10px 24px', cursor: 'pointer', fontSize: 14, fontWeight: 700,
  },
  rejectBtn: {
    background: 'transparent', border: '1px solid #1E293B',
    color: '#F87171', borderRadius: 8, padding: '10px 20px',
    cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },

  tinyBtn: {
    background: '#0F172A', border: '1px solid #1E293B', color: '#94A3B8',
    borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
  tinyLinkBtn: {
    background: '#0F172A', border: '1px solid #1E293B', color: '#94A3B8',
    borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600,
    textDecoration: 'none', display: 'inline-block',
  },
  ghostBtn: {
    background: 'transparent', border: '1px solid #1E293B',
    color: '#0EA5E9', borderRadius: 8, padding: '10px 20px',
    cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
};