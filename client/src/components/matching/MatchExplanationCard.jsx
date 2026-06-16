import React from 'react';

/**
 * MatchExplanationCard Component
 * Path: client/src/components/marketplace/MatchExplanationCard.jsx
 * * Provides clear natural language justification interfaces explaining why the match engine
 * recommendations align with project goals.
 */
export default function MatchExplanationCard({ matchData }) {
  if (!matchData) return null;

  // Destructure incoming data structure with defensive defaults
  const {
    overallScore = 0,
    insights = [],
    breakdown = {
      skills: 0,
      budget: 0,
      experience: 0,
      history: 0
    }
  } = matchData;

  // Helper utility to pick color thresholds depending on percentage tiers
  const getScoreColor = (score) => {
    if (score >= 85) return '#10B981'; // Green (Strong Match)
    if (score >= 70) return '#F59E0B'; // Amber (Moderate Match)
    return '#64748B'; // Slate (Neutral baseline)
  };

  const mainColor = getScoreColor(overallScore);

  return (
    <div style={styles.card}>
      {/* ── Top Header Track: AI Vector Score Metric ── */}
      <div style={styles.headerRow}>
        <div style={styles.titleBlock}>
          <div style={styles.aiBadge}>AI Match Tracker</div>
          <h4 style={styles.title}>Recommendation Details</h4>
        </div>
        <div style={{ ...styles.scoreRadial, borderColor: mainColor }}>
          <span style={{ ...styles.scoreNumber, color: mainColor }}>{overallScore}%</span>
          <span style={styles.scoreLabel}>Match</span>
        </div>
      </div>

      {/* ── Textual Explanations ── */}
      {insights.length > 0 && (
        <div style={styles.insightSection}>
          {insights.map((insight, idx) => (
            <p key={idx} style={styles.insightParagraph}>
              💡 {insight}
            </p>
          ))}
        </div>
      )}

      <div style={styles.divider} />

      {/* ── Sub-Vector Metric Progress Bars ── */}
      <div style={styles.breakdownSection}>
        <h5 style={styles.sectionTitle}>Engine Calculation Vectors</h5>
        
        {/* Skill Matrix Vector */}
        <div style={styles.progressGroup}>
          <div style={styles.progressLabelRow}>
            <span style={styles.vectorName}>Skill Cloud Relevance</span>
            <span style={styles.vectorValue}>{breakdown.skills}%</span>
          </div>
          <div style={styles.progressBarBg}>
            <div style={{ ...styles.progressBarFill, width: `${breakdown.skills}%`, background: '#0EA5E9' }} />
          </div>
        </div>

        {/* Financial Agreement Terms Vector */}
        <div style={styles.progressGroup}>
          <div style={styles.progressLabelRow}>
            <span style={styles.vectorName}>Budget Alignment</span>
            <span style={styles.vectorValue}>{breakdown.budget}%</span>
          </div>
          <div style={styles.progressBarBg}>
            <div style={{ ...styles.progressBarFill, width: `${breakdown.budget}%`, background: '#10B981' }} />
          </div>
        </div>

        {/* Experience Tier Vector */}
        <div style={styles.progressGroup}>
          <div style={styles.progressLabelRow}>
            <span style={styles.vectorName}>Experience Level Matching</span>
            <span style={styles.vectorValue}>{breakdown.experience}%</span>
          </div>
          <div style={styles.progressBarBg}>
            <div style={{ ...styles.progressBarFill, width: `${breakdown.experience}%`, background: '#F59E0B' }} />
          </div>
        </div>

        {/* Historic Operational Record Vector */}
        <div style={styles.progressGroup}>
          <div style={styles.progressLabelRow}>
            <span style={styles.vectorName}>Historical Trust Rating</span>
            <span style={styles.vectorValue}>{breakdown.history}%</span>
          </div>
          <div style={styles.progressBarBg}>
            <div style={{ ...styles.progressBarFill, width: `${breakdown.history}%`, background: '#8B5CF6' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  card: {
    background: '#111827',
    border: '1px solid #1E293B',
    borderRadius: 14,
    padding: '24px',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxSizing: 'border-box',
    width: '100%',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  aiBadge: {
    background: '#0F2235',
    color: '#0EA5E9',
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '3px 8px',
    borderRadius: '4px',
    width: 'fit-content',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 700,
    color: '#F1F5F9',
  },
  scoreRadial: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    border: '3px solid #1E293B',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0B1120',
    flexShrink: 0,
  },
  scoreNumber: {
    fontSize: '16px',
    fontWeight: 800,
    lineHeight: 1.1,
    fontVariantNumeric: 'tabular-nums',
  },
  scoreLabel: {
    fontSize: '9px',
    color: '#64748B',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  insightSection: {
    background: '#0B1120',
    border: '1px solid #1E293B',
    borderRadius: '10px',
    padding: '14px 16px',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  insightParagraph: {
    margin: 0,
    fontSize: '13.5px',
    color: '#94A3B8',
    lineHeight: '1.5',
  },
  divider: {
    height: '1px',
    background: '#1E293B',
    marginBottom: '20px',
  },
  breakdownSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  sectionTitle: {
    margin: '0 0 4px 0',
    color: '#64748B',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  progressGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  progressLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
  },
  vectorName: {
    color: '#E2E8F0',
    fontWeight: 500,
  },
  vectorValue: {
    color: '#F1F5F9',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  progressBarBg: {
    height: '6px',
    background: '#1E293B',
    borderRadius: '3px',
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  },
};