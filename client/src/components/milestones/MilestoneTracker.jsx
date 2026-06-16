import React from 'react';

/**
 * MilestoneTracker Component
 * Path: client/src/components/projects/MilestoneTracker.jsx
 * * Tracks real-time completion stages for contracted freelance projects.
 * Features an integrated milestone pipeline and budget verification markers.
 */
export default function MilestoneTracker({ milestones = [], onUpdateStatus, isClient = false }) {
  
  // Localized currency utility formatting values directly into NPR structures
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate global pipeline metrics safely
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const totalBudget = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const releasedBudget = milestones
    .filter(m => m.status === 'completed')
    .reduce((sum, m) => sum + (m.amount || 0), 0);

  // Compute percentage progress metrics
  const progressPercentage = totalMilestones > 0 
    ? Math.round((completedMilestones / totalMilestones) * 100) 
    : 0;

  // Status badge style mapper helper
  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed':
        return { bg: '#0F2F21', text: '#10B981', label: 'Released & Paid' };
      case 'in_review':
        return { bg: '#3B2A12', text: '#F59E0B', label: 'Pending Review' };
      case 'active':
        return { bg: '#0F2235', text: '#0EA5E9', label: 'In Progress' };
      default:
        return { bg: '#1E293B', text: '#94A3B8', label: 'Escrow Locked' };
    }
  };

  return (
    <div style={styles.trackerContainer}>
      {/* ── Top Metric Track Dashboard ── */}
      <div style={styles.metricsDashboard}>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Overall Progress</span>
          <div style={styles.progressRow}>
            <span style={styles.mainMetricValue}>{progressPercentage}%</span>
            <span style={styles.subMetricLabel}>{completedMilestones} of {totalMilestones} cleared</span>
          </div>
          <div style={styles.overallBarBg}>
            <div style={{ ...styles.overallBarFill, width: `${progressPercentage}%` }} />
          </div>
        </div>

        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Escrow Budget Distribution</span>
          <span style={styles.mainMetricValue}>{formatCurrency(releasedBudget)}</span>
          <span style={styles.subMetricLabel}>Total contract size: {formatCurrency(totalBudget)}</span>
        </div>
      </div>

      {/* ── Milestone Timeline Stack ── */}
      <div style={styles.timelineList}>
        <h3 style={styles.sectionTitle}>Project Execution Roadmap</h3>
        
        {milestones.length === 0 ? (
          <div style={styles.emptyState}>No milestones have been attached to this project pipeline yet.</div>
        ) : (
          milestones.map((milestone, idx) => {
            const currentStyle = getStatusStyle(milestone.status);
            return (
              <div key={milestone._id || idx} style={styles.timelineItem}>
                {/* Visual Connector Stem */}
                <div style={styles.connectorContainer}>
                  <div style={{ 
                    ...styles.bulletPoint, 
                    backgroundColor: milestone.status === 'completed' ? '#10B981' : '#1E293B',
                    borderColor: milestone.status === 'in_review' ? '#F59E0B' : 'transparent'
                  }} />
                  {idx !== milestones.length - 1 && <div style={styles.connectorLine} />}
                </div>

                {/* Content Payload Block */}
                <div style={styles.milestoneContent}>
                  <div style={styles.milestoneHeader}>
                    <div style={styles.titleGroup}>
                      <h4 style={styles.milestoneTitle}>{milestone.title}</h4>
                      <span style={styles.dueDate}>Target: {milestone.dueDate || 'Flexible'}</span>
                    </div>
                    <div style={styles.valueGroup}>
                      <span style={styles.milestoneAmount}>{formatCurrency(milestone.amount)}</span>
                      <span style={{ 
                        ...styles.statusBadge, 
                        backgroundColor: currentStyle.bg, 
                        color: currentStyle.text 
                      }}>
                        {currentStyle.label}
                      </span>
                    </div>
                  </div>

                  <p style={styles.milestoneDesc}>{milestone.description}</p>

                  {/* Contextual Action Control Blocks */}
                  {onUpdateStatus && (
                    <div style={styles.actionRow}>
                      {milestone.status === 'active' && !isClient && (
                        <button
                          type="button"
                          style={{ ...styles.actionBtn, ...styles.submitBtn }}
                          onClick={() => onUpdateStatus(milestone._id, 'in_review')}
                        >
                          Submit Deliverables for Review
                        </button>
                      )}
                      
                      {milestone.status === 'in_review' && isClient && (
                        <div style={styles.btnGroup}>
                          <button
                            type="button"
                            style={{ ...styles.actionBtn, ...styles.approveBtn }}
                            onClick={() => onUpdateStatus(milestone._id, 'completed')}
                          >
                            Approve Work & Release Funds
                          </button>
                          <button
                            type="button"
                            style={{ ...styles.actionBtn, ...styles.revisionBtn }}
                            onClick={() => onUpdateStatus(milestone._id, 'active')}
                          >
                            Request Revision
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  trackerContainer: {
    width: '100%',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  metricsDashboard: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: '1 1 300px',
    background: '#111827',
    border: '1px solid #1E293B',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxSizing: 'border-box',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  progressRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: '4px',
  },
  mainMetricValue: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#F1F5F9',
    fontVariantNumeric: 'tabular-nums',
  },
  subMetricLabel: {
    color: '#94A3B8',
    fontSize: '13px',
    fontWeight: 500,
  },
  overallBarBg: {
    height: '6px',
    background: '#1E293B',
    borderRadius: '3px',
    marginTop: '10px',
    width: '100%',
    overflow: 'hidden',
  },
  overallBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #0EA5E9, #10B981)',
    borderRadius: '3px',
    transition: 'width 0.4s ease',
  },
  timelineList: {
    background: '#111827',
    border: '1px solid #1E293B',
    borderRadius: '12px',
    padding: '24px',
    boxSizing: 'border-box',
  },
  sectionTitle: {
    margin: '0 0 20px 0',
    color: '#F1F5F9',
    fontSize: '16px',
    fontWeight: 700,
  },
  emptyState: {
    color: '#64748B',
    fontSize: '14px',
    textAlign: 'center',
    padding: '24px 0',
  },
  timelineItem: {
    display: 'flex',
    gap: '16px',
  },
  connectorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
  },
  bulletPoint: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    borderWidth: '2px',
    borderStyle: 'solid',
    marginTop: '6px',
    zIndex: 2,
  },
  connectorLine: {
    width: '2px',
    flexGrow: 1,
    background: '#1E293B',
    marginTop: '4px',
    marginBottom: '4px',
  },
  milestoneContent: {
    flexGrow: 1,
    paddingBottom: '28px',
    boxSizing: 'border-box',
  },
  milestoneHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '8px',
  },
  titleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  milestoneTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 700,
    color: '#E2E8F0',
  },
  dueDate: {
    fontSize: '12px',
    color: '#64748B',
    fontWeight: 500,
  },
  valueGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px',
  },
  milestoneAmount: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#F1F5F9',
    fontVariantNumeric: 'tabular-nums',
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  milestoneDesc: {
    margin: 0,
    fontSize: '13.5px',
    color: '#94A3B8',
    lineHeight: '1.5',
  },
  actionRow: {
    marginTop: '14px',
  },
  btnGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  actionBtn: {
    border: 'none',
    borderRadius: '6px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s ease',
  },
  submitBtn: {
    background: '#0EA5E9',
    color: '#ffffff',
  },
  approveBtn: {
    background: '#10B981',
    color: '#ffffff',
  },
  revisionBtn: {
    background: '#1E293B',
    border: '1px solid #334155',
    color: '#94A3B8',
  },
};