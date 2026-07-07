import React from 'react';

/**
 * ProfileStrengthMeter Component
 * Path: client/src/components/profile/ProfileStrengthMeter.jsx
 * * Programmatically evaluates user profile parameters to generate an absolute completion score.
 * Maps remaining missing requirements to optimize alignment with the AI matchmaking matrix.
 */
export default function ProfileStrengthMeter({ profileData = {} }) {
  
  // ── Core Metric Weight Calculation Engine ──
  const evaluateProfileMetrics = () => {
    let score = 0;
    const missingItems = [];

    // 1. Identity Asset Vector (20%)
    if (profileData.avatarUrl && profileData.avatarUrl.trim() !== '') {
      score += 20;
    } else {
      missingItems.push({ id: 'avatar', label: 'Upload a professional profile identity photo', impact: 20 });
    }

    // 2. Professional Bio Summary Vector (25%)
    const bioLength = profileData.bio ? profileData.bio.trim().length : 0;
    if (bioLength >= 150) {
      score += 25;
    } else if (bioLength > 0) {
      score += 10;
      missingItems.push({ id: 'bio', label: 'Expand your bio summary to 150+ characters for better AI indexing', impact: 15 });
    } else {
      missingItems.push({ id: 'bio', label: 'Write a professional statement or bio breakdown', impact: 25 });
    }

    // 3. Technical Skill Cloud Vector (25%)
    const skillCount = Array.isArray(profileData.skills) ? profileData.skills.length : 0;
    if (skillCount >= 5) {
      score += 25;
    } else if (skillCount > 0) {
      score += 15;
      missingItems.push({ id: 'skills', label: 'Add at least 5 target skill tags to optimize search relevance', impact: 10 });
    } else {
      missingItems.push({ id: 'skills', label: 'Map your specialized tech stacks in the Skill Selector', impact: 25 });
    }

    // 4. Financial Rates & Meta Configuration (15%)
    if (Number(profileData.hourlyRate) > 0) {
      score += 15;
    } else {
      missingItems.push({ id: 'rate', label: 'Set your target base hourly rate (NPR/USD)', impact: 15 });
    }

    // 5. External Portfolios & Social Links (15%)
    const hasGitHub = profileData.githubUrl && profileData.githubUrl.trim() !== '';
    const hasLinkedIn = profileData.linkedinUrl && profileData.linkedinUrl.trim() !== '';
    if (hasGitHub && hasLinkedIn) {
      score += 15;
    } else if (hasGitHub || hasLinkedIn) {
      score += 8;
      missingItems.push({ id: 'links', label: 'Link both GitHub and LinkedIn for maximum trust rating', impact: 7 });
    } else {
      missingItems.push({ id: 'links', label: 'Connect your GitHub or digital portfolio links', impact: 15 });
    }

    return { score, missingItems };
  };

  const { score, missingItems } = evaluateProfileMetrics();

  // Pick running indicator shades depending on percentage completion bounds
  const getProgressColor = (currentScore) => {
    if (currentScore >= 85) return '#10B981'; // Green (Excellent)
    if (currentScore >= 50) return '#F59E0B'; // Amber (Average)
    return '#EF4444'; // Red (Critical Gaps)
  };

  const progressColor = getProgressColor(score);

  return (
    <div style={styles.card}>
      {/* ── Top Score Metric Track ── */}
      <div style={styles.headerRow}>
        <div style={styles.titleBlock}>
          <span style={styles.metaLabel}>Profile Optimization</span>
          <h4 style={styles.title}>Strength Matrix Index</h4>
        </div>
        <div style={styles.scoreBadge}>
          <span style={{ ...styles.scoreValue, color: progressColor }}>{score}%</span>
        </div>
      </div>

      {/* ── Core Linear Progress Indicator ── */}
      <div style={styles.progressContainer}>
        <div style={styles.progressBarBg}>
          <div style={{ 
            ...styles.progressBarFill, 
            width: `${score}%`, 
            background: progressColor 
          }} />
        </div>
      </div>

      <div style={styles.divider} />

      {/* ── Dynamic Optimization Checklist ── */}
      <div style={styles.checklistSection}>
        <h5 style={styles.sectionTitle}>Required Steps to Maximize Matches</h5>
        
        {missingItems.length === 0 ? (
          <div style={styles.completeState}>
            <span style={styles.completeIcon}></span>
            <div style={styles.completeTextBlock}>
              <span style={styles.completeTitle}>Profile 100% Optimized</span>
              <p style={styles.completeDesc}>Your professional data vectors are perfectly tuned for our recommendation engine algorithms.</p>
            </div>
          </div>
        ) : (
          <div style={styles.todoList}>
            {missingItems.map((item) => (
              <div key={item.id} style={styles.todoItem}>
                <span style={styles.todoBullet}>○</span>
                <div style={styles.todoContent}>
                  <span style={styles.todoLabel}>{item.label}</span>
                  <span style={styles.impactBadge}>+{item.impact}% Score</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  card: {
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 14,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxSizing: 'border-box',
    width: '100%',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metaLabel: {
    color: '#64748B',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 700,
    color: '#0F172A',
  },
  scoreBadge: {
    background: '#F8FAFC',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: '10px',
    padding: '6px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scoreValue: {
    fontSize: '18px',
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
  },
  progressContainer: {
    marginBottom: '20px',
    width: '100%',
  },
  progressBarBg: {
    height: '6px',
    background: 'rgba(0,0,0,0.08)',
    borderRadius: '3px',
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  divider: {
    height: '1px',
    background: 'rgba(0,0,0,0.08)',
    marginBottom: '20px',
  },
  checklistSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    margin: 0,
    color: '#64748B',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  todoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  todoItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    background: '#F8FAFC',
    border: '1px solid rgba(0,0,0,0.08)',
    padding: '12px 14px',
    borderRadius: '8px',
  },
  todoBullet: {
    color: '#64748B',
    fontWeight: 700,
    fontSize: '14px',
    lineHeight: 1,
    marginTop: '2px',
  },
  todoContent: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  todoLabel: {
    fontSize: '13px',
    color: '#475569',
    fontWeight: 500,
    lineHeight: '1.4',
  },
  impactBadge: {
    color: '#2563EB',
    background: '#DBEAFE',
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
  },
  completeState: {
    display: 'flex',
    gap: '14px',
    background: '#DCFCE7',
    border: '1px solid #86EFAC',
    padding: '16px',
    borderRadius: '10px',
    alignItems: 'center',
  },
  completeIcon: {
    fontSize: '24px',
  },
  completeTextBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  completeTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#16A34A',
  },
  completeDesc: {
    margin: 0,
    fontSize: '12.5px',
    color: '#166534',
    lineHeight: '1.4',
  },
};