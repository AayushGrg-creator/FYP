/**
 * client/src/pages/workspace/ProjectWorkspacePage.jsx
 *
 * Unified project workspace for Task Tide.
 *
 * Route: /workspace/:projectId
 */

import {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext }  from '../../context/AuthContext';
import { useSocket }    from '../../hooks/useSocket';
import ChatPanel        from '../../components/chat/ChatPanel';
import api              from '../../services/api';
import projectFileService from '../../services/projectFileService';
import milestoneService from '../../services/milestoneService';
import DisputeForm from '../../components/disputes/DisputeForm';
import { getDisputeByMilestone } from '../../services/disputeService';
import reviewService from '../../services/reviewService';
import RateFreelancerModal from '../../components/reviews/RateFreelancerModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function handleDownload(url, filename) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('Download failed:', err);
    alert('Failed to download file.');
  }
}

function formatNPR(amount) {
  if (typeof amount !== 'number') return '—';
  return 'NPR ' + amount.toLocaleString('en-IN');
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return '—'; }
}

function formatBytes(bytes) {
  if (typeof bytes !== 'number' || bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function daysLeft(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}
const ARCHIVED_STATUSES = ['released', 'cancelled', 'resolved', 'refunded'];
// ─── Status pill (project-level escrow status) ────────────────────────────────
function StatusPill({ status }) {
  const map = {
    active:    { label: 'Active',    bg:'#052e16', color:'#4ade80', border:'#166534' },
    funded:    { label: 'Funded',    bg:'#0c1a4a', color:'#60a5fa', border:'#1d4ed8' },
    completed: { label: 'Completed', bg:'#0f172a', color:'#94a3b8', border:'#334155' },
    disputed:  { label: 'Disputed',  bg:'#450a0a', color:'#f87171', border:'#7f1d1d' },
    pending:   { label: 'Pending',   bg:'#1c1917', color:'#fbbf24', border:'#854d0e' },
  };
  const s = map[status] || map.pending;
  return (
    <span
      style={{
        fontSize:    11,
        fontWeight:  600,
        padding:     '3px 10px',
        borderRadius:20,
        background:  s.bg,
        color:       s.color,
        border:      `1px solid ${s.border}`,
        fontFamily:  'monospace',
        letterSpacing:'0.5px',
        textTransform:'uppercase',
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Milestone row ────────────────────────────────────────────────────────────
// FIXED against the real Milestone.js schema:
//   - field is `name`, not `title`
//   - real status enum: created | funded | pending_approval | released |
//     disputed | resolved | refunded | cancelled  (NOT pending/submitted/approved)
// ADDED: onRate / isRated — lets the client rate the freelancer once a
// milestone is released or resolved (see RateFreelancerModal).
function MilestoneRow({ milestone, role, onFund, onSubmit, onApprove, onDispute, onViewDispute, onDelete, onCancel, onRate, isRated, busy }) {
  const statusStyles = {
    created:          { color:'#64748b', icon:'○', label: 'Created' },
    funded:           { color:'#60a5fa', icon:'◉', label: 'Funded' },
    pending_approval: { color:'#fbbf24', icon:'◎', label: 'Pending Approval' },
    released:         { color:'#4ade80', icon:'✓', label: 'Released' },
    disputed:         { color:'#f87171', icon:'!', label: 'Disputed' },
    resolved:         { color:'#a78bfa', icon:'✓', label: 'Resolved' },
    refunded:         { color:'#94a3b8', icon:'↩', label: 'Refunded' },
    cancelled:        { color:'#475569', icon:'✕', label: 'Cancelled' },
  };
  const s = statusStyles[milestone.status] || statusStyles.created;
  const days = daysLeft(milestone.dueDate);

  return (
    <div
      style={{
        padding:      '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display:      'flex',
        flexDirection:'column',
        gap:          10,
      }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ color:s.color, fontFamily:'monospace', fontSize:14, flexShrink:0 }}>
          {s.icon}
        </span>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:500, color:'#e2e8f0', marginBottom:3 }}>
            {milestone.name}
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:s.color, fontFamily:'monospace' }}>
              {s.label}
            </span>
            <span style={{ fontSize:11, color:'#64748b', fontFamily:'monospace' }}>
              Due {formatDate(milestone.dueDate)}
            </span>
            {days !== null && !['released','refunded','resolved','cancelled'].includes(milestone.status) && (
              <span
                style={{
                  fontSize:11,
                  fontFamily:'monospace',
                  color: days < 0 ? '#f87171' : days < 3 ? '#fbbf24' : '#4ade80',
                }}
              >
                {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
              </span>
            )}
          </div>
        </div>

        <span style={{ fontSize:13, color:'#a3e635', fontFamily:'monospace', flexShrink:0 }}>
          {formatNPR(milestone.amount)}
        </span>
      </div>

      {/* ── Client: mark as funded (placeholder for real payment) ── */}
{role === 'client' && milestone.status === 'created' && (
  <div style={{ display: 'flex', gap: 6 }}>
    <button
      onClick={() => onFund(milestone._id)}
      disabled={busy}
      style={{
        background:   '#0c1a4a', border: '1px solid #1d4ed8', borderRadius: 6,
        color: '#60a5fa', fontSize: 11, padding: '5px 12px',
        cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'monospace', opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? 'Working…' : '💰 Mark as Funded'}
    </button>
    <button
      onClick={() => onDelete(milestone._id)}
      disabled={busy}
      style={{
        background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6,
        color: '#f87171', fontSize: 11, padding: '5px 12px',
        cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'monospace', opacity: busy ? 0.6 : 1,
      }}
    >
      🗑 Delete
    </button>
  </div>
)}
{role === 'client' && milestone.status === 'cancelled' && (
  <button
    onClick={() => onDelete(milestone._id)}
    disabled={busy}
    style={{
      alignSelf: 'flex-start',
      background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6,
      color: '#f87171', fontSize: 11, padding: '5px 12px',
      cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'monospace', opacity: busy ? 0.6 : 1,
    }}
  >
    🗑 Delete
  </button>
)}
{/* ── Client: cancel a funded (not-yet-submitted) milestone ── */}
{role === 'client' && milestone.status === 'funded' && (
  <button
    onClick={() => onCancel(milestone._id)}
    disabled={busy}
    style={{
      alignSelf: 'flex-start',
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
      color: '#94a3b8', fontSize: 11, padding: '5px 12px',
      cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'monospace', opacity: busy ? 0.6 : 1,
    }}
  >
    {busy ? 'Working…' : '✕ Cancel Milestone'}
  </button>
)}
<div
  style={{
    padding:      '14px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    display:      'flex',
    flexDirection:'column',
    gap:          10,
    opacity:      milestone.status === 'cancelled' ? 0.45 : 1,
  }}
></div>
      {/* ── Freelancer: submit work ── */}
      {role === 'freelancer' && milestone.status === 'funded' && (
        <button
          onClick={() => onSubmit(milestone._id)}
          disabled={busy}
          style={{
            alignSelf: 'flex-start',
            background:   '#0c1a4a', border: '1px solid #1d4ed8', borderRadius: 6,
            color: '#60a5fa', fontSize: 11, padding: '5px 12px',
            cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'monospace', opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Working…' : '📤 Submit Work'}
        </button>
      )}

      {/* ── Client: approve / dispute submitted work ── */}
      {role === 'client' && milestone.status === 'pending_approval' && (
        <div style={{ display:'flex', gap:6 }}>
          {milestone.submission?.deliverableUrl && (
            <a
              href={milestone.submission.deliverableUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: '#60a5fa', fontFamily: 'monospace', alignSelf: 'center', marginRight: 6 }}
            >
              View submission →
            </a>
          )}
          <button
            onClick={() => onApprove(milestone._id)}
            disabled={busy}
            style={{
              background:   '#052e16', border: '1px solid #166534', borderRadius: 6,
              color: '#4ade80', fontSize: 11, padding: '4px 10px',
              cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'monospace', opacity: busy ? 0.6 : 1,
            }}
          >
            Approve
          </button>
          <button
            onClick={() => onDispute(milestone._id)}
            disabled={busy}
            style={{
              background:   '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6,
              color: '#f87171', fontSize: 11, padding: '4px 10px',
              cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'monospace', opacity: busy ? 0.6 : 1,
            }}
          >
            Dispute
          </button>
        </div>
      )}
      {/* ── Freelancer: dispute a milestone the client hasn't approved ── */}
      {role === 'freelancer' && milestone.status === 'pending_approval' && (
        <button
          onClick={() => onDispute(milestone._id)}
          disabled={busy}
          style={{
            alignSelf: 'flex-start',
            background:   '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6,
            color: '#f87171', fontSize: 11, padding: '5px 12px',
            cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'monospace', opacity: busy ? 0.6 : 1,
          }}
        >
          ⚠ Dispute
        </button>
      )}

      {/* ── Both parties: view the report once a dispute exists on this milestone ── */}
      {milestone.status === 'disputed' && (
        <button
          onClick={() => onViewDispute(milestone._id)}
          style={{
            alignSelf: 'flex-start',
            background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6,
            color: '#f87171', fontSize: 11, padding: '5px 12px',
            cursor: 'pointer', fontFamily: 'monospace',
          }}
        >
          📄 View Dispute Report
        </button>
      )}

      {/* ── Client: rate the freelancer once this milestone is done ── */}
      {role === 'client' && ['released', 'resolved'].includes(milestone.status) && (
        isRated ? (
          <span style={{ alignSelf: 'flex-start', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
            ✓ Rated
          </span>
        ) : (
          <button
            onClick={() => onRate(milestone._id, milestone.name)}
            style={{
              alignSelf: 'flex-start',
              background: '#422006', border: '1px solid #92400e', borderRadius: 6,
              color: '#fbbf24', fontSize: 11, padding: '5px 12px',
              cursor: 'pointer', fontFamily: 'monospace',
            }}
          >
            ⭐ Rate Freelancer
          </button>
        )
      )}
    </div>
  );
}
function MilestoneTimeline({ milestones }) {
  if (!milestones || milestones.length === 0) return null;

  const sorted = milestones.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const dotStyles = {
    created:          { fill: 'transparent', border: '#64748b', glow: 'none' },
    funded:           { fill: '#60a5fa', border: '#60a5fa', glow: '0 0 8px rgba(96,165,250,0.5)' },
    pending_approval: { fill: '#fbbf24', border: '#fbbf24', glow: '0 0 8px rgba(251,191,36,0.5)' },
    released:         { fill: '#4ade80', border: '#4ade80', glow: '0 0 8px rgba(74,222,128,0.4)' },
    disputed:         { fill: '#f87171', border: '#f87171', glow: '0 0 8px rgba(248,113,113,0.5)' },
    resolved:         { fill: '#a78bfa', border: '#a78bfa', glow: 'none' },
    refunded:         { fill: '#94a3b8', border: '#94a3b8', glow: 'none' },
    cancelled:        { fill: 'transparent', border: '#334155', glow: 'none' },
  };

  const lineColor = (status) =>
    ['released', 'resolved'].includes(status) ? '#4ade80' : 'rgba(255,255,255,0.1)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        overflowX: 'auto',
        padding: '18px 4px 22px',
        marginBottom: 4,
      }}
    >
      {sorted.map((m, i) => {
        const s = dotStyles[m.status] || dotStyles.created;
        const isLast = i === sorted.length - 1;

        return (
          <div
            key={m._id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              flex: isLast ? '0 0 auto' : '1 1 0',
              minWidth: 90,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90 }}>
              <div
                title={m.status.replace('_', ' ')}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: s.fill,
                  border: `2px solid ${s.border}`,
                  boxShadow: s.glow,
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#e2e8f0',
                  marginTop: 8,
                  textAlign: 'center',
                  maxWidth: 88,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#64748b',
                  fontFamily: 'monospace',
                  marginTop: 2,
                  textTransform: 'capitalize',
                }}
              >
                {m.status.replace('_', ' ')}
              </div>
            </div>

            {!isLast && (
              <div
                style={{
                  height: 2,
                  flex: 1,
                  background: lineColor(m.status),
                  marginTop: 7,
                  minWidth: 20,
                  transition: 'background 0.2s ease',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Archived milestones (released / cancelled) — collapsed by default ───────
// ADDED: onRate / ratedMilestoneIds passed through — released/resolved
// milestones live here, so the rating button has to work in this list too.
function ArchivedMilestones({ milestones, role, onDelete, onRate, ratedMilestoneIds, busy }) {
  const [open, setOpen] = useState(false);
  if (!milestones || milestones.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
          fontSize: 11, fontFamily: 'monospace', padding: '4px 0', display: 'flex',
          alignItems: 'center', gap: 6,
        }}
      >
        <span>{open ? '▾' : '▸'}</span>
        Archived ({milestones.length})
      </button>

      {open && (
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10,
            overflow: 'hidden',
            marginTop: 8,
          }}
        >
          {milestones.map((m) => (
            <MilestoneRow
              key={m._id}
              milestone={m}
              role={role}
              onFund={() => {}}
              onSubmit={() => {}}
              onApprove={() => {}}
              onDispute={() => {}}
              onDelete={onDelete}
              onCancel={() => {}}
              onRate={onRate}
              isRated={ratedMilestoneIds?.has(String(m._id))}
              busy={busy === m._id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
// ─── Create Milestone form (client-only) ──────────────────────────────────────
function CreateMilestoneForm({ projectId, nextOrder, onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', amount: '', dueDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await milestoneService.create({
        project:     projectId,
        name:        form.name,
        description: form.description,
        amount:      Number(form.amount),
        currency:    'NPR',
        order:       nextOrder,
        dueDate:     form.dueDate,
      });
      setForm({ name: '', description: '', amount: '', dueDate: '' });
      setOpen(false);
      await onCreated();
    } catch (err) {
      setError(err.message || 'Failed to create milestone.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'transparent', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8,
          color: '#94a3b8', fontSize: 12, padding: '8px 16px', cursor: 'pointer',
          fontFamily: 'monospace', marginTop: 8,
        }}
      >
        + Add Milestone
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12,
      padding: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10,
    }}>
      {error && <div style={{ fontSize: 11, color: '#f87171', fontFamily: 'monospace' }}>{error}</div>}
      <input
        placeholder="Milestone name"
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
        required
        minLength={3}
        style={inputStyle}
      />
      <textarea
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        rows={2}
        style={{ ...inputStyle, resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="number"
          placeholder="Amount (NPR)"
          value={form.amount}
          onChange={(e) => set('amount', e.target.value)}
          required
          min={1}
          style={{ ...inputStyle, flex: 1 }}
        />
        <input
          type="date"
          value={form.dueDate}
          onChange={(e) => set('dueDate', e.target.value)}
          required
          style={{ ...inputStyle, flex: 1 }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="submit" disabled={saving} style={{
          background: '#166534', border: 'none', borderRadius: 6, color: '#e2e8f0',
          padding: '7px 16px', fontSize: 12, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'monospace',
        }}>
          {saving ? 'Creating…' : 'Create'}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#94a3b8',
          padding: '7px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
        }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputStyle = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
  padding: '8px 10px', color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%',
  boxSizing: 'border-box',
};

// ─── File row ─────────────────────────────────────────────────────────────────
function FileRow({ file, currentUserId, isAdmin, onDelete, deleting }) {
  const uploaderId = file.uploadedBy?._id || file.uploadedBy;
  const canDelete = isAdmin || uploaderId?.toString() === currentUserId?.toString();

  return (
    <div
      style={{
        padding:      '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display:      'flex',
        alignItems:   'center',
        gap:          12,
      }}
    >
      <span style={{ fontSize:16, flexShrink:0 }}></span>

      <div style={{ flex:1, minWidth:0 }}>
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 13, fontWeight: 500, color: '#e2e8f0',
            textDecoration: 'none', display: 'block',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {file.originalName}
        </a>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop: 2 }}>
          <span style={{ fontSize:11, color:'#64748b', fontFamily:'monospace' }}>
            {formatBytes(file.size)}
          </span>
          <span style={{ fontSize:11, color:'#64748b', fontFamily:'monospace' }}>
            {file.uploadedBy?.name || 'Unknown'} · {formatDate(file.uploadedAt)}
          </span>
        </div>
      </div>

      <button
        onClick={() => handleDownload(file.url, file.originalName)}
        style={{
          fontSize: 11, color: '#60a5fa', fontFamily: 'monospace',
          textDecoration: 'none', flexShrink: 0,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}
      >
        Download
      </button>

      {canDelete && (
        <button
          onClick={() => onDelete(file._id)}
          disabled={deleting}
          style={{
            background: 'none', border: 'none', color: '#f87171',
            cursor: deleting ? 'not-allowed' : 'pointer', fontSize: 13,
            fontFamily: 'monospace', flexShrink: 0, opacity: deleting ? 0.5 : 1,
          }}
          title="Delete file"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Files panel ──────────────────────────────────────────────────────────────
function FilesPanel({ projectId, files, onFilesChanged }) {
  const { user } = useContext(AuthContext);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await projectFileService.upload(projectId, file);
      await onFilesChanged();
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

 

  const handleDelete = async (fileId) => {
    if (!window.confirm('Delete this file? This cannot be undone.')) return;
    setDeletingId(fileId);
    try {
      await projectFileService.delete(projectId, fileId);
      await onFilesChanged();
    } catch (err) {
      setError(err.message || 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {error && (
        <div style={{ fontSize: 12, color: '#f87171', fontFamily: 'monospace', marginBottom: 10 }}>
          {error}
        </div>
      )}

      {files?.length > 0 ? (
        <div
          style={{
            border:      '1px solid rgba(255,255,255,0.07)',
            borderRadius:10,
            overflow:    'hidden',
            marginBottom: 12,
          }}
        >
          {files.map((f) => (
            <FileRow
              key={f._id}
              file={f}
              currentUserId={user?.userId}
              isAdmin={user?.role === 'admin'}
              onDelete={handleDelete}
              deleting={deletingId === f._id}
            />
          ))}
        </div>
      ) : (
        <p style={{ fontSize:13, color:'#334155', fontFamily:'monospace', marginBottom: 12 }}>
          No files uploaded yet.
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
        style={{ display: 'none' }}
        id="project-file-input"
      />
      <label
        htmlFor="project-file-input"
        style={{
          display: 'inline-block',
          background:   uploading ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.04)',
          border:       '1px dashed rgba(255,255,255,0.15)',
          borderRadius: 8,
          color:        uploading ? '#334155' : '#94a3b8',
          fontSize:     12,
          padding:      '8px 16px',
          cursor:       uploading ? 'not-allowed' : 'pointer',
          fontFamily:   'monospace',
        }}
      >
        {uploading ? 'Uploading…' : '+ Upload File'}
      </label>
    </div>
  );
}

// ─── Participant card ─────────────────────────────────────────────────────────
function ParticipantCard({ participant, label }) {
  return (
    <div
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         10,
        padding:     '10px 14px',
        background:  'rgba(255,255,255,0.02)',
        borderRadius:8,
        border:      '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {participant?.avatar ? (
        <img
          src={participant.avatar}
          alt={participant.name}
          style={{ width:34, height:34, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}
        />
      ) : (
        <div
          style={{
            width:34, height:34, borderRadius:'50%', flexShrink:0,
            background:'linear-gradient(135deg,#1e3a5f,#0f2a47)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:13, fontWeight:700, color:'#7dd3fc', fontFamily:'monospace',
          }}
        >
          {participant?.name?.[0]?.toUpperCase() || '?'}
        </div>
      )}
      <div>
        <div style={{ fontSize:13, fontWeight:500, color:'#e2e8f0' }}>
          {participant?.name || 'Unknown'}
        </div>
        <div style={{ fontSize:11, color:'#475569', fontFamily:'monospace' }}>
          {label} · {participant?.email || ''}
        </div>
      </div>
      {label === 'Freelancer' && participant?.trustScore !== undefined && (
        <div style={{ marginLeft:'auto', textAlign:'right' }}>
          <div style={{ fontSize:12, color:'#a3e635', fontFamily:'monospace' }}>
            {participant.trustScore}
          </div>
          <div style={{ fontSize:10, color:'#334155', fontFamily:'monospace' }}>
            trust
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom:24 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display:     'flex',
          alignItems:  'center',
          gap:         8,
          background:  'none',
          border:      'none',
          cursor:      'pointer',
          padding:     '0 0 10px',
          width:       '100%',
          textAlign:   'left',
        }}
      >
        <span style={{ fontSize:14 }}>{icon}</span>
        <span
          style={{
            fontSize:     12,
            fontWeight:   600,
            color:        '#64748b',
            fontFamily:   'monospace',
            letterSpacing:'0.6px',
            textTransform:'uppercase',
            flex:         1,
          }}
        >
          {title}
        </span>
        <span style={{ fontSize:10, color:'#334155', fontFamily:'monospace' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && children}
    </div>
  );
}

// ─── LEFT PANEL ───────────────────────────────────────────────────────────────
function ContractPanel({
  project, projectId, onFilesChanged,
  onFundMilestone, onSubmitMilestone, onApproveMilestone, onDisputeMilestone, onViewDispute, onDeleteMilestone, onCancelMilestone,
  onRateMilestone, ratedMilestoneIds,
  onMilestoneCreated, milestoneActionBusyId,
}) {
  const { user } = useContext(AuthContext);
  if (!project) return null;

  // FIXED: real Project.js field is `agreedAmount`, not `totalAmount`.
  // FIXED: real "paid out" status is `released`, not `approved`.
  const totalAmount  = project.agreedAmount || 0;
  const released     = project.milestones?.filter((m) => m.status === 'released')
                         .reduce((acc, m) => acc + m.amount, 0) || 0;
  const progress     = project.progressPercent ?? (totalAmount > 0 ? Math.round((released / totalAmount) * 100) : 0);
  const nextOrder     = (project.milestones?.length || 0) + 1;

  return (
    <div
      style={{
        flex:        1,
        overflowY:   'auto',
        padding:     '20px 20px',
        scrollbarWidth:'thin',
        scrollbarColor:'#1e293b transparent',
      }}
    >
      {/* ── Overview ── */}
      <Section title="Overview" icon="">
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:                 10,
            marginBottom:        16,
          }}
        >
          {[
            { label:'Total Value',  value: formatNPR(totalAmount) },
            { label:'Released',     value: formatNPR(released) },
            { label:'Escrow Status',value: project.escrowStatus || '—' },
            { label:'Started',      value: formatDate(project.createdAt) },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding:     '10px 12px',
                background:  'rgba(255,255,255,0.025)',
                borderRadius:8,
                border:      '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ fontSize:10, color:'#475569', fontFamily:'monospace', marginBottom:4 }}>
                {item.label.toUpperCase()}
              </div>
              <div style={{ fontSize:14, color:'#e2e8f0', fontWeight:500 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom:4 }}>
          <div
            style={{
              display:        'flex',
              justifyContent: 'space-between',
              marginBottom:   6,
            }}
          >
            <span style={{ fontSize:11, color:'#475569', fontFamily:'monospace' }}>
              Payment progress
            </span>
            <span style={{ fontSize:11, color:'#a3e635', fontFamily:'monospace' }}>
              {progress}%
            </span>
          </div>
          <div
            style={{
              height:      5,
              background:  'rgba(255,255,255,0.06)',
              borderRadius:4,
              overflow:    'hidden',
            }}
          >
            <div
              style={{
                height:      '100%',
                width:       `${progress}%`,
                background:  'linear-gradient(90deg,#4ade80,#a3e635)',
                borderRadius:4,
                transition:  'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </Section>

      {/* ── Milestones ── */}
      <Section title="Milestones" icon="">
        <MilestoneTimeline milestones={project.milestones} />
        {(() => {
  const sorted = project.milestones?.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) || [];
  const active = sorted.filter((m) => !ARCHIVED_STATUSES.includes(m.status));
  const archived = sorted.filter((m) => ARCHIVED_STATUSES.includes(m.status));

  return (
    <>
      {active.length > 0 ? (
        <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
          {active.map((m) => (
            <MilestoneRow
              key={m._id}
              milestone={m}
              role={user?.role}
              onFund={onFundMilestone}
              onSubmit={onSubmitMilestone}
              onApprove={onApproveMilestone}
              onDispute={onDisputeMilestone}
              onViewDispute={onViewDispute}
              onDelete={onDeleteMilestone}
              onCancel={onCancelMilestone}
              onRate={onRateMilestone}
              isRated={ratedMilestoneIds?.has(String(m._id))}
              busy={milestoneActionBusyId === m._id}
            />
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: '#334155', fontFamily: 'monospace' }}>
          No active milestones.
        </p>
      )}

      <ArchivedMilestones
        milestones={archived}
        role={user?.role}
        onDelete={onDeleteMilestone}
        onRate={onRateMilestone}
        ratedMilestoneIds={ratedMilestoneIds}
        busy={milestoneActionBusyId}
      />
    </>
  );
})()}
 

        {user?.role === 'client' && (
          <CreateMilestoneForm
            projectId={projectId}
            nextOrder={nextOrder}
            onCreated={onMilestoneCreated}
          />
        )}
      </Section>

      {/* ── Files ── */}
      <Section title="Files" icon="">
        <FilesPanel
          projectId={projectId}
          files={project.files}
          onFilesChanged={onFilesChanged}
        />
      </Section>

      {/* ── Participants ── */}
      <Section title="Participants" icon="">
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <ParticipantCard participant={project.client}     label="Client" />
          <ParticipantCard participant={project.freelancer} label="Freelancer" />
        </div>
      </Section>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProjectWorkspacePage() {
  const { projectId }        = useParams();
  const navigate             = useNavigate();
  const { user }             = useContext(AuthContext);
  const { joinRoom, leaveRoom } = useSocket();

  const [project,   setProject]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [activeTab, setActiveTab] = useState('contract'); // mobile tab: 'contract' | 'chat'
  const [isMobile,  setIsMobile]  = useState(window.innerWidth < 900);
  const [milestoneActionBusyId, setMilestoneActionBusyId] = useState(null);
  // Milestone currently being disputed via the modal (null = modal closed)
  const [disputeMilestoneId, setDisputeMilestoneId] = useState(null);
  // Milestone currently being rated via the modal (null = modal closed)
  const [rateModal, setRateModal] = useState(null); // { milestoneId, milestoneName } | null
  // Milestone IDs that already have a review on this project (Set of strings)
  const [ratedMilestoneIds, setRatedMilestoneIds] = useState(new Set());

  // ── Responsive ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ── Join socket room ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    joinRoom(projectId);
    return () => leaveRoom(projectId);
  }, [projectId, joinRoom, leaveRoom]);

  // ── Fetch project ────────────────────────────────────────────────────────
  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.get(`/projects/${projectId}`);
      setProject(data.project);

      // Non-fatal: if this fails, the "Rate Freelancer" button just won't
      // be pre-hidden for milestones already rated in a previous session.
      try {
        const reviewData = await reviewService.getByProject(projectId);
        setRatedMilestoneIds(new Set((reviewData.reviews || []).map((r) => String(r.milestone))));
      } catch {
        // ignore — non-critical
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  // ── Milestone actions ────────────────────────────────────────────────────
  // FIXED: previously called /payments/milestones/:id/approve|dispute, which
  // pointed at payment.controller.js's singular-path, differently-shaped
  // milestone flow — mismatched with the real Milestone.js model entirely.
  // Now uses the new dedicated milestone.routes.js endpoints.
 const handleFundMilestone = useCallback(async (milestoneId) => {
    setMilestoneActionBusyId(milestoneId);
    try {
      const data = await milestoneService.fund(milestoneId);
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl; // redirect to Khalti checkout
      } else {
        alert('Payment could not be started.');
        setMilestoneActionBusyId(null);
      }
    } catch (err) {
      alert(err.message || 'Failed to start payment.');
      setMilestoneActionBusyId(null);
    }
  }, []);

  const handleSubmitMilestone = useCallback(async (milestoneId) => {
    const deliverableUrl = window.prompt('Link to your completed work (e.g. GitHub, Google Drive, Figma):');
    if (!deliverableUrl?.trim()) return;
    const notes = window.prompt('Any notes for the client? (optional)') || '';
    setMilestoneActionBusyId(milestoneId);
    try {
      await milestoneService.submit(milestoneId, { deliverableUrl: deliverableUrl.trim(), notes });
      await fetchProject();
    } catch (err) {
      alert(err.message || 'Failed to submit work.');
    } finally {
      setMilestoneActionBusyId(null);
    }
  }, [fetchProject]);

  const handleApproveMilestone = useCallback(async (milestoneId) => {
    setMilestoneActionBusyId(milestoneId);
    try {
      await milestoneService.approve(milestoneId);
      await fetchProject();
    } catch (err) {
      alert(err.message || 'Approval failed');
    } finally {
      setMilestoneActionBusyId(null);
    }
  }, [fetchProject]);

  // CHANGED: previously prompted for a plain-text reason and called
  // milestoneService.dispute() directly — that path sets Milestone.status
  // to 'disputed' but never creates a Dispute document, so no report could
  // ever be generated. Now opens the DisputeForm modal, which goes through
  // dispute.service.js (creates the Dispute doc AND raises the milestone
  // dispute internally).
  const handleDisputeMilestone = useCallback((milestoneId) => {
    setDisputeMilestoneId(milestoneId);
  }, []);

  // Looks up the Dispute doc for this milestone, then navigates to its report.
  const handleViewDispute = useCallback(async (milestoneId) => {
    try {
      const dispute = await getDisputeByMilestone(milestoneId);
      navigate(`/disputes/${dispute._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not find a dispute for this milestone.');
    }
  }, [navigate]);

  const handleDeleteMilestone = useCallback(async (milestoneId) => {
  if (!window.confirm('Delete this milestone? This cannot be undone.')) return;
  setMilestoneActionBusyId(milestoneId);
  try {
    await milestoneService.delete(milestoneId);
    await fetchProject();
  } catch (err) {
    alert(err.message || 'Failed to delete milestone.');
  } finally {
    setMilestoneActionBusyId(null);
  }
}, [fetchProject]);

const handleCancelMilestone = useCallback(async (milestoneId) => {
  if (!window.confirm('Cancel this milestone? It will be marked cancelled and grayed out, but its record is kept.')) return;
  setMilestoneActionBusyId(milestoneId);
  try {
    await milestoneService.cancel(milestoneId);
    await fetchProject();
  } catch (err) {
    alert(err.message || 'Failed to cancel milestone.');
  } finally {
    setMilestoneActionBusyId(null);
  }
}, [fetchProject]);

  // ── Rating actions ───────────────────────────────────────────────────────
  const handleRateMilestone = useCallback((milestoneId, milestoneName) => {
    setRateModal({ milestoneId, milestoneName });
  }, []);

  const handleRatingSubmitted = useCallback((milestoneId) => {
    setRatedMilestoneIds((prev) => {
      const next = new Set(prev);
      next.add(String(milestoneId));
      return next;
    });
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          height:         '100vh',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          background:     '#080c12',
          color:          '#334155',
          fontFamily:     'monospace',
          fontSize:       13,
        }}
      >
        <span style={{ animation:'pulse 1.2s infinite' }}>Loading workspace…</span>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          height:         '100vh',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          background:     '#080c12',
          gap:            16,
        }}
      >
        <span style={{ fontSize:32 }}></span>
        <p style={{ color:'#f87171', fontFamily:'monospace', fontSize:14 }}>{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background:   'none',
            border:       '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            color:        '#94a3b8',
            fontSize:     13,
            padding:      '8px 18px',
            cursor:       'pointer',
            fontFamily:   'monospace',
          }}
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        height:        '100vh',
        background:    '#080c12',
        fontFamily:    "'DM Sans', system-ui, sans-serif",
        overflow:      'hidden',
      }}
    >
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px}
        .tab-btn:hover{background:rgba(255,255,255,0.05)!important}
        .back-btn:hover{color:#94a3b8!important}
      `}</style>

      {/* ── Top header bar ── */}
      <header
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            12,
          padding:        '0 20px',
          height:         56,
          borderBottom:   '1px solid rgba(255,255,255,0.07)',
          background:     '#0d1117',
          flexShrink:     0,
        }}
      >
        <button
          className="back-btn"
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'none',
            border:     'none',
            color:      '#475569',
            cursor:     'pointer',
            fontSize:   14,
            padding:    '4px 6px',
            fontFamily: 'monospace',
            transition: 'color 0.15s',
          }}
          aria-label="Back to Dashboard"
        >
          ←
        </button>

        <div style={{ width:'1px', height:20, background:'rgba(255,255,255,0.07)' }} />

        <div style={{ flex:1, minWidth:0 }}>
          <h1
            style={{
              margin:      0,
              fontSize:    15,
              fontWeight:  600,
              color:       '#e2e8f0',
              overflow:    'hidden',
              textOverflow:'ellipsis',
              whiteSpace:  'nowrap',
            }}
          >
            {project?.title || `Project #${projectId?.slice(-6)}`}
          </h1>
          <div style={{ fontSize:11, color:'#475569', fontFamily:'monospace' }}>
            ID: {projectId?.slice(-10)}
          </div>
        </div>

        {project?.escrowStatus && <StatusPill status={project.escrowStatus} />}

        {isMobile && (
          <div
            style={{
              display:     'flex',
              background:  'rgba(255,255,255,0.04)',
              borderRadius:8,
              padding:     2,
            }}
          >
            {['contract', 'chat'].map((tab) => (
              <button
                key={tab}
                className="tab-btn"
                onClick={() => setActiveTab(tab)}
                style={{
                  background:   activeTab === tab ? 'rgba(255,255,255,0.08)' : 'none',
                  border:       'none',
                  borderRadius: 6,
                  color:        activeTab === tab ? '#e2e8f0' : '#475569',
                  fontSize:     12,
                  padding:      '5px 12px',
                  cursor:       'pointer',
                  fontFamily:   'monospace',
                  transition:   'background 0.15s, color 0.15s',
                  textTransform:'capitalize',
                }}
              >
                {tab === 'chat' ? '' : ''} {tab}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Main body ── */}
      <div
        style={{
          flex:     1,
          display:  'flex',
          overflow: 'hidden',
          gap:      0,
        }}
      >
        {(!isMobile || activeTab === 'contract') && (
          <div
            style={{
              width:       isMobile ? '100%' : '42%',
              minWidth:    isMobile ? 'unset' : 320,
              maxWidth:    isMobile ? 'unset' : 480,
              display:     'flex',
              flexDirection:'column',
              borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
              overflow:    'hidden',
            }}
          ><ContractPanel
  project={project}
  projectId={projectId}
  onFilesChanged={fetchProject}
  onFundMilestone={handleFundMilestone}
  onSubmitMilestone={handleSubmitMilestone}
  onApproveMilestone={handleApproveMilestone}
  onDisputeMilestone={handleDisputeMilestone}
  onViewDispute={handleViewDispute}
  onDeleteMilestone={handleDeleteMilestone}
   onCancelMilestone={handleCancelMilestone}
  onRateMilestone={handleRateMilestone}
  ratedMilestoneIds={ratedMilestoneIds}
  onMilestoneCreated={fetchProject}
  milestoneActionBusyId={milestoneActionBusyId}
/>
           
          </div>
        )}

        {(!isMobile || activeTab === 'chat') && (
          <div
            style={{
              flex:    1,
              display: 'flex',
              padding: '12px',
              overflow:'hidden',
              minWidth:0,
            }}
          >
            <ChatPanel
              projectId={projectId}
              height="100%"
            />
          </div>
        )}
      </div>

      {/* ── Raise Dispute modal ── */}
      {disputeMilestoneId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setDisputeMilestoneId(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <DisputeForm
              projectId={projectId}
              milestoneId={disputeMilestoneId}
              onClose={() => setDisputeMilestoneId(null)}
            />
          </div>
        </div>
      )}

      {/* ── Rate Freelancer modal ── */}
      {rateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setRateModal(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <RateFreelancerModal
              milestoneId={rateModal.milestoneId}
              milestoneName={rateModal.milestoneName}
              onClose={() => setRateModal(null)}
              onSubmitted={handleRatingSubmitted}
            />
          </div>
        </div>
      )}
    </div>
  );
}