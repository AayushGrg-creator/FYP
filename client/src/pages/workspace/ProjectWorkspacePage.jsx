/**
 * client/src/pages/workspace/ProjectWorkspacePage.jsx
 *
 * Unified project workspace for Task Tide.
 *
 * Layout (desktop — 1200px+)
 * ──────────────────────────
 *  ┌─────────────────────────────────────────────────────┐
 *  │  Header bar — project title, status pill, actions   │
 *  ├───────────────────────┬─────────────────────────────┤
 *  │                       │                             │
 *  │   LEFT PANEL          │   RIGHT PANEL               │
 *  │   Contract details    │   ChatPanel (real-time)     │
 *  │   • Overview          │                             │
 *  │   • Milestones        │                             │
 *  │   • Participants      │                             │
 *  │   • Files             │                             │
 *  │                       │                             │
 *  └───────────────────────┴─────────────────────────────┘
 *
 * Layout (mobile — collapses to tabs)
 *
 * Aesthetic: dark editorial — dark slate background, razor-thin borders,
 * monospace data labels, lime-green accent for active states.
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function daysLeft(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}

// ─── Status pill ──────────────────────────────────────────────────────────────
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
function MilestoneRow({ milestone, role, onApprove, onDispute }) {
  const statusStyles = {
    pending:   { color:'#fbbf24', icon:'○' },
    submitted: { color:'#60a5fa', icon:'◎' },
    approved:  { color:'#4ade80', icon:'✓' },
    disputed:  { color:'#f87171', icon:'!' },
  };
  const s = statusStyles[milestone.status] || statusStyles.pending;
  const days = daysLeft(milestone.dueDate);

  return (
    <div
      style={{
        padding:      '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display:      'flex',
        alignItems:   'center',
        gap:          12,
      }}
    >
      {/* Status icon */}
      <span style={{ color:s.color, fontFamily:'monospace', fontSize:14, flexShrink:0 }}>
        {s.icon}
      </span>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, color:'#e2e8f0', marginBottom:3 }}>
          {milestone.title}
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'#64748b', fontFamily:'monospace' }}>
            Due {formatDate(milestone.dueDate)}
          </span>
          {days !== null && milestone.status === 'pending' && (
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

      {/* Amount */}
      <span style={{ fontSize:13, color:'#a3e635', fontFamily:'monospace', flexShrink:0 }}>
        {formatNPR(milestone.amount)}
      </span>

      {/* Client actions on submitted milestones */}
      {role === 'client' && milestone.status === 'submitted' && (
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          <button
            onClick={() => onApprove(milestone._id)}
            style={{
              background:   '#052e16',
              border:       '1px solid #166534',
              borderRadius: 6,
              color:        '#4ade80',
              fontSize:     11,
              padding:      '4px 10px',
              cursor:       'pointer',
              fontFamily:   'monospace',
            }}
          >
            Approve
          </button>
          <button
            onClick={() => onDispute(milestone._id)}
            style={{
              background:   '#450a0a',
              border:       '1px solid #7f1d1d',
              borderRadius: 6,
              color:        '#f87171',
              fontSize:     11,
              padding:      '4px 10px',
              cursor:       'pointer',
              fontFamily:   'monospace',
            }}
          >
            Dispute
          </button>
        </div>
      )}
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
      {participant?.trustScore !== undefined && (
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
function ContractPanel({ project, onApproveMilestone, onDisputeMilestone }) {
  const { user } = useContext(AuthContext);
  if (!project) return null;

  const totalAmount  = project.totalAmount || 0;
  const released     = project.milestones?.filter((m) => m.status === 'approved')
                         .reduce((acc, m) => acc + m.amount, 0) || 0;
  const progress     = totalAmount > 0 ? Math.round((released / totalAmount) * 100) : 0;

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
      <Section title="Overview" icon="📋">
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

        {/* Progress bar */}
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
      <Section title="Milestones" icon="🎯">
        {project.milestones?.length > 0 ? (
          <div
            style={{
              border:      '1px solid rgba(255,255,255,0.07)',
              borderRadius:10,
              overflow:    'hidden',
            }}
          >
            {project.milestones.map((m) => (
              <MilestoneRow
                key={m._id}
                milestone={m}
                role={user?.role}
                onApprove={onApproveMilestone}
                onDispute={onDisputeMilestone}
              />
            ))}
          </div>
        ) : (
          <p style={{ fontSize:13, color:'#334155', fontFamily:'monospace' }}>
            No milestones defined yet.
          </p>
        )}
      </Section>

      {/* ── Participants ── */}
      <Section title="Participants" icon="👥">
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
      const { data } = await api.get(`/projects/${projectId}`);
      setProject(data.project);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  // ── Milestone actions ────────────────────────────────────────────────────
  const handleApproveMilestone = useCallback(async (milestoneId) => {
    try {
      await api.post(`/payments/milestones/${milestoneId}/approve`);
      await fetchProject();
    } catch (err) {
      alert(err.response?.data?.message || 'Approval failed');
    }
  }, [fetchProject]);

  const handleDisputeMilestone = useCallback(async (milestoneId) => {
    const reason = window.prompt('Describe the issue with this milestone:');
    if (!reason?.trim()) return;
    try {
      await api.post(`/payments/milestones/${milestoneId}/dispute`, { reason });
      await fetchProject();
    } catch (err) {
      alert(err.response?.data?.message || 'Dispute submission failed');
    }
  }, [fetchProject]);

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
        <span style={{ fontSize:32 }}>⚠️</span>
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
        {/* Back */}
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

        {/* Project name */}
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

        {/* Status pill */}
        {project?.escrowStatus && <StatusPill status={project.escrowStatus} />}

        {/* Mobile tab switcher */}
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
                {tab === 'chat' ? '💬' : '📋'} {tab}
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
        {/* LEFT — contract details */}
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
          >
            <ContractPanel
              project={project}
              onApproveMilestone={handleApproveMilestone}
              onDisputeMilestone={handleDisputeMilestone}
            />
          </div>
        )}

        {/* RIGHT — chat */}
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
    </div>
  );
}