import React, { useState, useEffect } from 'react';

/**
 * DisputeModal Component
 * Path: client/src/components/modals/DisputeModal.jsx
 * * Renders a secure overlay to handle formal project escalation procedures.
 * Manages Escape key drop-downs, defensive verification rules, and loading pipelines.
 */
export default function DisputeModal({ isOpen, onClose, contractData = {}, onSubmitDispute, isSubmitting = false }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceLink, setEvidenceLink] = useState('');
  const [error, setError] = useState('');

  // Trap focus and capture Escape key events to dismiss the overlay gracefully
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen) return null;

  const {
    _id: contractId,
    jobTitle = 'Active Project Contract',
    freelancerName = 'Contractor Specialist',
    clientName = 'Project Client Owner'
  } = contractData;

  // Intercept submit routine to enforce compliance requirements
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!reason) {
      setError('Please select an explicit category for this dispute escalation.');
      return;
    }

    if (description.trim().length < 50) {
      setError('Please provide a comprehensive summary (at least 50 characters) detailing the breakdown of execution.');
      return;
    }

    setError('');
    onSubmitDispute({
      contractId,
      reason,
      description: description.trim(),
      evidenceLink: evidenceLink.trim()
    });
  };

  return (
    <div style={styles.modalOverlay} onClick={!isSubmitting ? onClose : undefined}>
      {/* Click-propagation guard stops background trigger dismissals */}
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        
        {/* Header Block */}
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <span style={styles.alertBadge}>Arbitration Pipeline</span>
            <h3 style={styles.modalTitle}>File Formal Marketplace Dispute</h3>
          </div>
          <button 
            type="button" 
            style={styles.closeX} 
            onClick={onClose} 
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Short Summary Meta Context Card */}
        <div style={styles.metaCard}>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Project Target</span>
            <span style={styles.metaValue}>{jobTitle}</span>
          </div>
          <div style={styles.metaGrid}>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Client Owner</span>
              <span style={styles.metaValue}>{clientName}</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Freelancer Assigned</span>
              <span style={styles.metaValue}>{freelancerName}</span>
            </div>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>⚠️ {error}</div>}

        {/* Input Interface Track */}
        <form onSubmit={handleSubmit} style={styles.form}>
          
          {/* Reason Classification Selection Dropdown */}
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="dispute-reason">Dispute Reason Classification</label>
            <select
              id="dispute-reason"
              value={reason}
              onChange={e => { setReason(e.target.value); setError(''); }}
              style={styles.select}
              disabled={isSubmitting}
            >
              <option value="" disabled style={styles.option}>Select an escalation trigger category...</option>
              <option value="missed_milestone" style={styles.option}>Incomplete Milestones / Missed Delivery Timelines</option>
              <option value="poor_quality" style={styles.option}>Deliverable Quality Substantially Below Agreement Terms</option>
              <option value="unresponsive" style={styles.option}>Complete Communication Breakdown / Unresponsive Partner</option>
              <option value="scope_creep" style={styles.option}>Unreasonable Project Expansion / Scope Creep Demands</option>
              <option value="wrongful_termination" style={styles.option}>Unfair Project Cancellation / Escrow Withholding</option>
            </select>
          </div>

          {/* Description Detail Input Field */}
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="dispute-desc">Statement of Facts & Detailed Breakdown</label>
            <textarea
              id="dispute-desc"
              rows="5"
              placeholder="Provide an honest, objective record of milestones missed, interactions, and specific criteria breaches. System administrators review this statement directly to mediate funds..."
              value={description}
              onChange={e => { setDescription(e.target.value); if (error) setError(''); }}
              style={styles.textarea}
              disabled={isSubmitting}
            />
            <span style={styles.charCounter}>
              {description.length} / minimum 50 characters required
            </span>
          </div>

          {/* Supporting Materials Evidence Link */}
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="dispute-evidence">Supporting Documentation Link (Optional)</label>
            <input
              id="dispute-evidence"
              type="url"
              placeholder="e.g., Shared Cloud folders, repository commits, design assets link..."
              value={evidenceLink}
              onChange={e => setEvidenceLink(e.target.value)}
              style={styles.input}
              disabled={isSubmitting}
            />
          </div>

          {/* Warning Legal Notice */}
          <p style={styles.legalNotice}>
            🚨 <strong>Escrow Containment Notice:</strong> Launching a dispute locks active remaining milestones immediately. System administrators assess submitted parameters to process arbitration solutions fairly.
          </p>

          {/* Action Button Row */}
          <div style={styles.actionRow}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ ...styles.submitBtn, ...(isSubmitting ? styles.submitDisabled : {}) }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Escalating Dispute Request...' : 'Initiate Conflict Arbitration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(3, 7, 18, 0.85)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    background: '#111827',
    border: '1px solid #1E293B',
    borderRadius: '14px',
    width: '100%',
    maxWidth: '580px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxSizing: 'border-box',
    animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '24px 24px 16px 24px',
    borderBottom: '1px solid #1E293B',
  },
  titleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  alertBadge: {
    background: '#3B1212',
    color: '#F87171',
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '3px 8px',
    borderRadius: '4px',
    width: 'fit-content',
  },
  modalTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 800,
    color: '#F1F5F9',
  },
  closeX: {
    background: 'transparent',
    border: 'none',
    color: '#64748B',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 0.8,
    transition: 'color 0.15s ease',
  },
  metaCard: {
    background: '#0B1120',
    borderBottom: '1px solid #1E293B',
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  metaGrid: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  metaLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  metaValue: {
    fontSize: '13.5px',
    color: '#E2E8F0',
    fontWeight: 500,
  },
  errorBanner: {
    background: '#7F1D1D',
    border: '1px solid #F87171',
    color: '#FCA5A5',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13.5px',
    fontWeight: 600,
    margin: '20px 24px 0 24px',
  },
  form: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '18px',
  },
  label: {
    color: '#94A3B8',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  select: {
    background: '#0B1120',
    border: '1px solid #1E293B',
    borderRadius: '8px',
    padding: '12px',
    color: '#F1F5F9',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  option: {
    background: '#111827',
    color: '#F1F5F9',
  },
  textarea: {
    background: '#0B1120',
    border: '1px solid #1E293B',
    borderRadius: '8px',
    padding: '12px',
    color: '#F1F5F9',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'none',
    lineHeight: '1.5',
  },
  charCounter: {
    textAlign: 'right',
    fontSize: '11px',
    color: '#64748B',
    fontWeight: 500,
    marginTop: '4px',
  },
  input: {
    background: '#0B1120',
    border: '1px solid #1E293B',
    borderRadius: '8px',
    padding: '12px',
    color: '#F1F5F9',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  legalNotice: {
    margin: '0 0 24px 0',
    fontSize: '12.5px',
    color: '#94A3B8',
    lineHeight: '1.5',
    background: '#1C1616',
    borderLeft: '3px solid #EF4444',
    padding: '10px 12px',
    borderRadius: '0 6px 6px 0',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid #1E293B',
    color: '#94A3B8',
    borderRadius: '6px',
    padding: '10px 18px',
    fontSize: '13.5px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  submitBtn: {
    background: '#EF4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '13.5px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s ease',
  },
  submitDisabled: {
    background: '#1E293B',
    color: '#475569',
    cursor: 'not-allowed',
  }
};