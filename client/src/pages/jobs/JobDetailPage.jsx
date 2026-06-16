import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { getJob } from '../../services/jobService';
import { submitProposal } from '../../services/proposalService';

export default function JobDetailPage() {
  const { id }       = useParams();
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const [job, setJob]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getJob(id)
      .then(setJob)
      .catch(() => setError('Job not found or could not be loaded.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Skeleton />;
  if (error)   return <ErrorState message={error} />;
  if (!job)    return null;

  const isClient     = user?.role === 'client';
  const isFreelancer = user?.role === 'freelancer';
  const isOwner      = isClient && String(job.clientId?._id || job.clientId) === user?._id;

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        {/* Back */}
        <Link to="/jobs" style={styles.back}>← Back to Job Board</Link>

        <div style={styles.layout}>
          {/* ─── Main Column ─── */}
          <div style={styles.main}>
            <div style={styles.card}>
              {/* Status badge + meta */}
              <div style={styles.topRow}>
                <StatusBadge status={job.status} />
                <span style={styles.timeAgo}>{getTimeAgo(job.createdAt)}</span>
              </div>

              <h1 style={styles.title}>{job.title}</h1>

              <div style={styles.metaRow}>
                <Meta label="Category"   value={(job.category || '').replace(/-/g, ' ')} />
                <Meta label="Experience" value={job.experienceLevel} />
                <Meta label="Budget Type" value={job.budget?.type} />
                {job.location && <Meta label="Location" value={job.location} />}
                {job.deadline && <Meta label="Deadline" value={new Date(job.deadline).toLocaleDateString()} />}
              </div>

              <Divider />

              <Section title="Project Description">
                <p style={styles.desc}>{job.description}</p>
              </Section>

              {job.deliverables?.length > 0 && (
                <Section title="Deliverables">
                  <ul style={styles.list}>
                    {job.deliverables.map((d, i) => <li key={i} style={styles.listItem}>{d}</li>)}
                  </ul>
                </Section>
              )}

              <Section title="Required Skills">
                <div style={styles.skillRow}>
                  {(job.skillsRequired || []).map(s => (
                    <span key={s} style={styles.skillPill}>{s}</span>
                  ))}
                </div>
              </Section>

              {/* Proposal form (freelancers only) */}
              {isFreelancer && job.status === 'open' && (
                <div style={styles.proposalSection}>
                  {!showForm ? (
                    <button style={styles.applyBtn} onClick={() => setShowForm(true)}>
                      ✍ Submit a Proposal
                    </button>
                  ) : (
                    <ProposalForm
                      jobId={id}
                      onSuccess={() => navigate('/dashboard')}
                      onCancel={() => setShowForm(false)}
                    />
                  )}
                </div>
              )}

              {!user && (
                <div style={styles.loginPrompt}>
                  <Link to="/login" style={styles.loginLink}>Log in</Link> or{' '}
                  <Link to="/register" style={styles.loginLink}>register</Link> as a freelancer to apply.
                </div>
              )}
            </div>
          </div>

          {/* ─── Sidebar ─── */}
          <div style={styles.sidebar}>
            {/* Budget Card */}
            <div style={styles.sideCard}>
              <div style={styles.sideLabel}>Budget</div>
              <div style={styles.budgetDisplay}>
                NPR {job.budget?.min?.toLocaleString()} – {job.budget?.max?.toLocaleString()}
              </div>
              <div style={styles.budgetType}>{job.budget?.type === 'fixed' ? 'Fixed Price' : 'Hourly Rate'}</div>
            </div>

            {/* Client Card */}
            {job.clientId && (
              <div style={styles.sideCard}>
                <div style={styles.sideLabel}>Client</div>
                <div style={styles.clientRow}>
                  <div style={styles.avatar}>
                    {job.clientId.avatar
                      ? <img src={job.clientId.avatar} alt="" style={styles.avatarImg} />
                      : <span style={styles.avatarInitial}>{(job.clientId.name || 'C')[0].toUpperCase()}</span>
                    }
                  </div>
                  <div>
                    <div style={styles.clientName}>{job.clientId.name}</div>
                    <div style={styles.clientSub}>Client</div>
                  </div>
                </div>
              </div>
            )}

            {/* Owner controls */}
            {isOwner && (
              <div style={styles.sideCard}>
                <div style={styles.sideLabel}>Manage</div>
                <div style={styles.manageLinks}>
                  <Link to={`/jobs/${id}/edit`} style={styles.manageLink}>✏ Edit Job</Link>
                  <Link to={`/jobs/${id}/proposals`} style={styles.manageLink}>📋 View Proposals</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Proposal Form ─────────────────────────────────────────────────────────────
function ProposalForm({ jobId, onSuccess, onCancel }) {
  const [form, setForm]     = useState({ coverLetter: '', bidAmount: '', estimatedDays: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await submitProposal({
        jobId,
        coverLetter:   form.coverLetter,
        bidAmount:     parseFloat(form.bidAmount),
        estimatedDays: parseInt(form.estimatedDays, 10),
      });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not submit proposal. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.formCard}>
      <h3 style={styles.formTitle}>Your Proposal</h3>
      {error && <div style={styles.formError}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={styles.formField}>
          <label style={styles.formLabel}>Cover Letter <span style={{ color: '#0EA5E9' }}>*</span></label>
          <textarea
            style={styles.formInput}
            placeholder="Introduce yourself, explain why you're a great fit, and outline your approach to this project (min 50 characters)…"
            value={form.coverLetter}
            onChange={e => set('coverLetter', e.target.value)}
            rows={6}
            required
            minLength={50}
            maxLength={3000}
          />
          <span style={styles.formHint}>{form.coverLetter.length}/3000</span>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formField}>
            <label style={styles.formLabel}>Your Bid (NPR) <span style={{ color: '#0EA5E9' }}>*</span></label>
            <input
              type="number"
              style={styles.formInputSm}
              placeholder="e.g. 15000"
              value={form.bidAmount}
              onChange={e => set('bidAmount', e.target.value)}
              min="1"
              required
            />
          </div>
          <div style={styles.formField}>
            <label style={styles.formLabel}>Estimated Days <span style={{ color: '#0EA5E9' }}>*</span></label>
            <input
              type="number"
              style={styles.formInputSm}
              placeholder="e.g. 14"
              value={form.estimatedDays}
              onChange={e => set('estimatedDays', e.target.value)}
              min="1"
              max="365"
              required
            />
          </div>
        </div>

        <div style={styles.formActions}>
          <button type="button" style={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button
            type="submit"
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Submitting…' : '🚀 Submit Proposal'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </div>
  );
}
function Meta({ label, value }) {
  return (
    <div style={styles.metaItem}>
      <span style={styles.metaLabel}>{label}</span>
      <span style={styles.metaValue}>{value}</span>
    </div>
  );
}
function Divider() {
  return <div style={{ height: 1, background: '#1E293B', margin: '24px 0' }} />;
}
function StatusBadge({ status }) {
  const MAP = {
    open:        { bg: '#022C22', color: '#34D399', border: '#065F46', label: 'Open' },
    'in-progress':{ bg: '#0C1A4E', color: '#60A5FA', border: '#1D4ED8', label: 'In Progress' },
    completed:   { bg: '#1C1917', color: '#A78BFA', border: '#5B21B6', label: 'Completed' },
    cancelled:   { bg: '#1C0A0A', color: '#F87171', border: '#7F1D1D', label: 'Cancelled' },
  };
  const s = MAP[status] || MAP.open;
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}
function Skeleton() {
  return (
    <div style={{ ...styles.page, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ color: '#64748B' }}>Loading…</div>
    </div>
  );
}
function ErrorState({ message }) {
  return (
    <div style={{ ...styles.page, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <p style={{ color: '#94A3B8' }}>{message}</p>
        <Link to="/jobs" style={{ color: '#0EA5E9', textDecoration: 'none' }}>← Back to jobs</Link>
      </div>
    </div>
  );
}
function getTimeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: { minHeight: '100vh', background: '#0B1120', fontFamily: "'DM Sans', sans-serif", padding: '32px 24px 80px' },
  inner: { maxWidth: 1060, margin: '0 auto' },
  back: { color: '#64748B', fontSize: 14, textDecoration: 'none', display: 'inline-block', marginBottom: 24 },
  layout: { display: 'flex', gap: 24, alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0 },
  card: { background: '#111827', border: '1px solid #1E293B', borderRadius: 16, padding: '32px 36px' },
  topRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  timeAgo: { color: '#475569', fontSize: 13 },
  title: { margin: '0 0 20px', color: '#F1F5F9', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.3 },
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: 16 },
  metaItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  metaLabel: { color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' },
  metaValue: { color: '#CBD5E1', fontSize: 14, fontWeight: 500, textTransform: 'capitalize' },
  sectionTitle: { color: '#E2E8F0', fontSize: 15, fontWeight: 700, margin: '0 0 12px', letterSpacing: '0.01em' },
  desc: { color: '#94A3B8', fontSize: 15, lineHeight: 1.75, margin: 0 },
  list: { margin: '0', paddingLeft: 20 },
  listItem: { color: '#94A3B8', fontSize: 15, lineHeight: 1.7, marginBottom: 4 },
  skillRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  skillPill: {
    background: '#0F2235', border: '1px solid #1E4976', color: '#7DD3FC',
    borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 500,
  },
  proposalSection: { marginTop: 32, paddingTop: 28, borderTop: '1px solid #1E293B' },
  applyBtn: {
    background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
    border: 'none', color: '#fff', borderRadius: 10,
    padding: '14px 32px', fontSize: 16, fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.02em',
    boxShadow: '0 0 24px rgba(14,165,233,0.35)',
  },
  loginPrompt: { marginTop: 24, color: '#64748B', fontSize: 14 },
  loginLink: { color: '#0EA5E9', textDecoration: 'none' },

  // Form
  formCard: { background: '#0B1120', border: '1px solid #1E293B', borderRadius: 14, padding: '28px 24px' },
  formTitle: { margin: '0 0 20px', color: '#F1F5F9', fontSize: 18, fontWeight: 700 },
  formError: { background: '#450A0A', border: '1px solid #7F1D1D', color: '#FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 14 },
  formField: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  formLabel: { color: '#CBD5E1', fontSize: 14, fontWeight: 600 },
  formInput: {
    background: '#111827', border: '1px solid #1E293B', borderRadius: 8,
    padding: '11px 14px', color: '#F1F5F9', fontSize: 15, outline: 'none',
    fontFamily: 'inherit', resize: 'vertical',
  },
  formInputSm: {
    background: '#111827', border: '1px solid #1E293B', borderRadius: 8,
    padding: '11px 14px', color: '#F1F5F9', fontSize: 15, outline: 'none',
    fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
  },
  formHint: { color: '#475569', fontSize: 11 },
  formRow: { display: 'flex', gap: 16 },
  formActions: { display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: {
    background: 'transparent', border: '1px solid #1E293B', color: '#64748B',
    borderRadius: 8, padding: '12px 24px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', border: 'none', color: '#fff',
    borderRadius: 8, padding: '12px 28px', cursor: 'pointer', fontSize: 15, fontWeight: 700,
    boxShadow: '0 0 16px rgba(14,165,233,0.3)',
  },

  // Sidebar
  sidebar: { width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 },
  sideCard: { background: '#111827', border: '1px solid #1E293B', borderRadius: 14, padding: '20px' },
  sideLabel: { color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 },
  budgetDisplay: { color: '#0EA5E9', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' },
  budgetType: { color: '#475569', fontSize: 13, marginTop: 4, textTransform: 'capitalize' },
  clientRow: { display: 'flex', gap: 12, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: '50%', background: '#0F2235', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInitial: { color: '#0EA5E9', fontWeight: 700, fontSize: 18 },
  clientName: { color: '#E2E8F0', fontWeight: 600, fontSize: 15 },
  clientSub: { color: '#475569', fontSize: 12 },
  manageLinks: { display: 'flex', flexDirection: 'column', gap: 8 },
  manageLink: { color: '#0EA5E9', fontSize: 14, fontWeight: 500, textDecoration: 'none' },
};