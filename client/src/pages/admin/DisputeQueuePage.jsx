import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import styles from './admin.module.css';

const STATUS_COLORS = {
  open:          '#ef4444',
  under_review:  '#f59e0b',
  awaiting_info: '#3b82f6',
  resolved:      '#10b981',
  closed:        '#6b7280',
};

const PRIORITY_COLORS = {
  low:      '#6b7280',
  medium:   '#3b82f6',
  high:     '#f59e0b',
  critical: '#ef4444',
};

/* ─── Dispute row ────────────────────────────────────────────────── */
function DisputeRow({ d, onSelect }) {
  return (
    <tr
      className={`${styles.clickableRow} ${d.isEscalated ? styles.escalatedRow : ''}`}
      onClick={() => onSelect(d)}
    >
      <td>
        <span style={{ fontWeight: 600, color: '#e8eaf2' }}>
          {d.project?.title || '—'}
        </span>
        {d.isEscalated && <span className={styles.escalatedTag}>🔴 Escalated</span>}
      </td>
      <td>{d.initiator ? `${d.initiator.firstName} ${d.initiator.lastName}` : '—'}</td>
      <td>{d.respondent ? `${d.respondent.firstName} ${d.respondent.lastName}` : '—'}</td>
      <td>
        <span
          className={styles.statusBadge}
          style={{ background: `${STATUS_COLORS[d.status]}22`, color: STATUS_COLORS[d.status] }}
        >
          {d.status.replace('_', ' ')}
        </span>
      </td>
      <td>
        <span
          className={styles.statusBadge}
          style={{ background: `${PRIORITY_COLORS[d.priority]}22`, color: PRIORITY_COLORS[d.priority] }}
        >
          {d.priority}
        </span>
      </td>
      <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>
        {new Date(d.createdAt).toLocaleDateString()}
      </td>
      <td>
        <span style={{ color: '#10b981', fontWeight: 600 }}>
          {d.currency} {d.escrowAmount?.toLocaleString() || 0}
        </span>
      </td>
    </tr>
  );
}

/* ─── Resolve modal ──────────────────────────────────────────────── */
function ResolveModal({ dispute, onClose, onResolved }) {
  const [resolution,     setResolution]     = useState('release_to_freelancer');
  const [resolutionNote, setResolutionNote] = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.patch(`/admin/disputes/${dispute._id}/resolve`, {
        resolution,
        resolutionNote,
        amountNPR: dispute.escrowAmount,
      });
      onResolved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resolve dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Resolve Dispute</h3>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: 20 }}>
          Project: <strong style={{ color: '#e8eaf2' }}>{dispute.project?.title}</strong><br />
          Escrow amount: <strong style={{ color: '#10b981' }}>
            {dispute.currency} {dispute.escrowAmount?.toLocaleString()}
          </strong>
        </p>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Resolution</label>
            <select
              className={styles.filterSelect}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="release_to_freelancer">Release to Freelancer</option>
              <option value="refund_to_client">Refund to Client</option>
              <option value="split">Split 50/50</option>
              <option value="no_action">No Action — Close Dispute</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Resolution Note</label>
            <textarea
              className={styles.reasonInput}
              placeholder="Explain the ruling…"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.resolveBtn} disabled={submitting}>
              {submitting ? 'Resolving…' : 'Confirm Resolution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Dispute detail panel ───────────────────────────────────────── */
function DisputeDetail({ dispute, onClose, onRefresh }) {
  const [actionForm, setActionForm] = useState({ action: 'request_more_info', note: '' });
  const [submitting, setSub]        = useState(false);
  const [showResolve,setShowResolve]= useState(false);
  const [msg,        setMsg]        = useState('');

  const submitAction = async (e) => {
    e.preventDefault();
    setSub(true);
    try {
      await api.post(`/admin/disputes/${dispute._id}/action`, actionForm);
      setMsg('Action recorded');
      onRefresh();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed');
    } finally {
      setSub(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const isSettled = ['resolved', 'closed'].includes(dispute.status);

  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <h2>Dispute Detail</h2>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      {msg && <div className={styles.toast} style={{ position: 'static', marginBottom: 12 }}>{msg}</div>}

      {/* Parties */}
      <div className={styles.partiesRow}>
        <div className={styles.partyCard}>
          <div className={styles.partyLabel}>Initiator</div>
          <div className={styles.partyName}>
            {dispute.initiator?.firstName} {dispute.initiator?.lastName}
          </div>
          <div className={styles.partyEmail}>{dispute.initiator?.email}</div>
          <span className={`${styles.badge} ${styles[`role_${dispute.initiator?.role}`]}`}>
            {dispute.initiator?.role}
          </span>
        </div>
        <div className={styles.vsLabel}>vs</div>
        <div className={styles.partyCard}>
          <div className={styles.partyLabel}>Respondent</div>
          <div className={styles.partyName}>
            {dispute.respondent?.firstName} {dispute.respondent?.lastName}
          </div>
          <div className={styles.partyEmail}>{dispute.respondent?.email}</div>
          <span className={`${styles.badge} ${styles[`role_${dispute.respondent?.role}`]}`}>
            {dispute.respondent?.role}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className={styles.metaGrid}>
        <div><span className={styles.metaKey}>Project</span><span>{dispute.project?.title}</span></div>
        <div><span className={styles.metaKey}>Reason</span><span>{dispute.reason?.replace(/_/g, ' ')}</span></div>
        <div>
          <span className={styles.metaKey}>Status</span>
          <span style={{ color: STATUS_COLORS[dispute.status] }}>{dispute.status.replace('_', ' ')}</span>
        </div>
        <div>
          <span className={styles.metaKey}>Priority</span>
          <span style={{ color: PRIORITY_COLORS[dispute.priority] }}>{dispute.priority}</span>
        </div>
        <div>
          <span className={styles.metaKey}>Escrow</span>
          <span style={{ color: '#10b981' }}>
            {dispute.currency} {dispute.escrowAmount?.toLocaleString()}
          </span>
        </div>
        <div>
          <span className={styles.metaKey}>Opened</span>
          <span>{new Date(dispute.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Description */}
      <div className={styles.descBox}>
        <div className={styles.descLabel}>Claim Description</div>
        <p>{dispute.description}</p>
      </div>

      {/* Evidence */}
      {dispute.evidence?.length > 0 && (
        <div className={styles.evidenceSection}>
          <div className={styles.descLabel}>Evidence ({dispute.evidence.length})</div>
          {dispute.evidence.map((ev) => (
            <div key={ev._id} className={styles.evidenceItem}>
              <span className={styles.evidenceType}>{ev.fileType}</span>
              <span>{ev.caption || 'No caption'}</span>
              {ev.fileUrl && (
                <a href={ev.fileUrl} target="_blank" rel="noreferrer" className={styles.inlineLink}>
                  View →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Admin action log */}
      {dispute.adminActions?.length > 0 && (
        <div className={styles.actionLog}>
          <div className={styles.descLabel}>Action Log</div>
          {dispute.adminActions.map((act) => (
            <div key={act._id} className={styles.actionItem}>
              <span className={styles.actionType}>{act.action.replace(/_/g, ' ')}</span>
              <span className={styles.actionAdmin}>
                by {act.admin?.firstName} {act.admin?.lastName}
              </span>
              {act.note && <p className={styles.actionNote}>{act.note}</p>}
              <span className={styles.actionDate}>{new Date(act.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Resolution display */}
      {isSettled && (
        <div className={styles.resolutionBox}>
          <div className={styles.descLabel}>Resolution</div>
          <p style={{ color: '#10b981', fontWeight: 600 }}>
            {dispute.resolution?.replace(/_/g, ' ')}
          </p>
          {dispute.resolutionNote && <p style={{ color: '#9ca3af' }}>{dispute.resolutionNote}</p>}
        </div>
      )}

      {/* Action form */}
      {!isSettled && (
        <form className={styles.actionForm} onSubmit={submitAction}>
          <div className={styles.descLabel}>Log Action</div>
          <select
            className={styles.filterSelect}
            style={{ width: '100%', marginBottom: 10 }}
            value={actionForm.action}
            onChange={(e) => setActionForm((p) => ({ ...p, action: e.target.value }))}
          >
            <option value="request_more_info">Request More Information</option>
            <option value="escalate">Escalate to Critical</option>
            <option value="close_no_action">Close — No Action</option>
          </select>
          <textarea
            className={styles.reasonInput}
            placeholder="Add a note…"
            rows={3}
            value={actionForm.note}
            onChange={(e) => setActionForm((p) => ({ ...p, note: e.target.value }))}
          />
          <div className={styles.modalActions} style={{ marginTop: 10 }}>
            <button type="submit" className={styles.actionBtn} disabled={submitting}>
              {submitting ? 'Saving…' : 'Log Action'}
            </button>
            <button
              type="button"
              className={styles.resolveBtn}
              onClick={() => setShowResolve(true)}
            >
              ⚖️ Resolve Dispute
            </button>
          </div>
        </form>
      )}

      {showResolve && (
        <ResolveModal
          dispute={dispute}
          onClose={() => setShowResolve(false)}
          onResolved={onRefresh}
        />
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */
export default function DisputeQueuePage() {
  const [disputes,  setDisputes]  = useState([]);
  const [total,     setTotal]     = useState(0);
  const [selected,  setSelected]  = useState(null);
  const [statusF,   setStatusF]   = useState('');
  const [priorityF, setPriorityF] = useState('');
  const [loading,   setLoading]   = useState(true);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (statusF)   params.set('status', statusF);
      if (priorityF) params.set('priority', priorityF);
      const res = await api.get(`/admin/disputes?${params}`);
      setDisputes(res.data.disputes || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusF, priorityF]);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const handleRefresh = () => {
    fetchDisputes();
    setSelected(null);
  };

  return (
    <div className={styles.page}>
      {/* Minimal sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <Link to="/" className={styles.logo}>Task<span>Tide</span></Link>
          <span className={styles.adminTag}>ADMIN</span>
        </div>
        <nav className={styles.sidebarNav}>
          <Link to="/admin"          className={styles.navLink}><span>📊</span>Overview</Link>
          <Link to="/admin/disputes" className={`${styles.navLink} ${styles.navActive}`}>
            <span>⚖️</span>Disputes
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className={styles.main} style={{ display: 'flex', gap: 24, padding: 32 }}>
        {/* Queue */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.pageHeader}>
            <div>
              <h1>Dispute Queue</h1>
              <p>{total} total · {disputes.filter(d => d.status === 'open').length} open</p>
            </div>
            <div className={styles.filters}>
              <select
                className={styles.filterSelect}
                value={statusF}
                onChange={(e) => setStatusF(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="under_review">Under Review</option>
                <option value="awaiting_info">Awaiting Info</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                className={styles.filterSelect}
                value={priorityF}
                onChange={(e) => setPriorityF(e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading disputes…</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Project</th><th>Initiator</th><th>Respondent</th>
                    <th>Status</th><th>Priority</th><th>Opened</th><th>Escrow</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((d) => (
                    <DisputeRow
                      key={d._id}
                      d={d}
                      onSelect={setSelected}
                    />
                  ))}
                  {disputes.length === 0 && (
                    <tr>
                      <td colSpan={7} className={styles.emptyCell}>
                        No disputes found matching filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ width: 420, flexShrink: 0 }}>
            <DisputeDetail
              dispute={selected}
              onClose={() => setSelected(null)}
              onRefresh={handleRefresh}
            />
          </div>
        )}
      </main>
    </div>
  );
}