import React, { useState } from 'react';

// Pre-defined popular tech skills matching your platform's core target audience
const SUGGESTED_SKILLS = [
  'React', 'Node.js', 'Python', 'JavaScript', 'TypeScript',
  'MongoDB', 'AWS', 'Docker', 'Figma', 'Tailwind CSS', 'Next.js',
  'PostgreSQL', 'GraphQL', 'Vue.js', 'C++', 'CUDA'
];

/**
 * SkillSelector Component
 * Path: client/src/components/common/SkillSelector.jsx
 * * Provides an intuitive tag-cloud generation panel for forms and profiles.
 * Includes interactive quick-selection suggestions and custom item binding.
 */
export default function SkillSelector({ selectedSkills = [], onChange, maxSkills = 12 }) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  // ── Tag Core Mutations ──
  const addSkill = (skillName) => {
    const cleanSkill = skillName.trim();
    
    if (!cleanSkill) return;
    
    if (selectedSkills.length >= maxSkills) {
      setError(`You have reached the maximum allowance of ${maxSkills} validation skill tags.`);
      return;
    }

    // Check for duplicates case-insensitively but preserve user formatting
    const isDuplicate = selectedSkills.some(
      s => s.toLowerCase() === cleanSkill.toLowerCase()
    );

    if (isDuplicate) {
      setError(`"${cleanSkill}" is already mapped within your selection array.`);
      return;
    }

    const updated = [...selectedSkills, cleanSkill];
    onChange(updated);
    setInputValue('');
    setError('');
  };

  const removeSkill = (skillToRemove) => {
    const updated = selectedSkills.filter(s => s !== skillToRemove);
    onChange(updated);
    setError('');
  };

  // ── Keyboard Interceptor ──
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Lock form bubble resets
      addSkill(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && selectedSkills.length > 0) {
      // Intuitively pop the last tag if input is completely empty
      removeSkill(selectedSkills[selectedSkills.length - 1]);
    }
  };

  return (
    <div style={styles.container}>
      {error && <span style={styles.errorText}>⚠️ {error}</span>}

      {/* ── Main Interactive Input Box ── */}
      <div style={{
        ...styles.inputWrapper,
        borderColor: error ? '#EF4444' : '#1E293B'
      }}>
        <div style={styles.tagGrid}>
          {selectedSkills.map(skill => (
            <span key={skill} style={styles.badge}>
              {skill}
              <button
                type="button"
                style={styles.removeBtn}
                onClick={() => removeSkill(skill)}
              >
                ×
              </button>
            </span>
          ))}
          
          <input
            type="text"
            placeholder={selectedSkills.length === 0 ? "e.g., React, CUDA, Figma..." : ""}
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={handleKeyDown}
            style={styles.inputField}
          />
        </div>
      </div>
      <span style={styles.hintText}>Press <kbd style={styles.kbd}>Enter</kbd> or use commas to separate custom keywords.</span>

      {/* ── Popular Quick-Selection Triggers ── */}
      <div style={styles.suggestionsContainer}>
        <span style={styles.suggestionTitle}>Popular Recommendations:</span>
        <div style={styles.suggestionCloud}>
          {SUGGESTED_SKILLS.map(skill => {
            const isSelected = selectedSkills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                disabled={isSelected}
                onClick={() => addSkill(skill)}
                style={{
                  ...styles.suggestBtn,
                  ...(isSelected ? styles.suggestDisabled : {})
                }}
              >
                {isSelected ? `✓ ${skill}` : `+ ${skill}`}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxSizing: 'border-box',
  },
  errorText: {
    color: '#F87171',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  inputWrapper: {
    background: '#0B1120',
    border: '1px solid #1E293B',
    borderRadius: '10px',
    padding: '10px 14px',
    minHeight: '48px',
    display: 'flex',
    alignItems: 'center',
    transition: 'border-color 0.15s ease',
  },
  tagGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    width: '100%',
    alignItems: 'center',
  },
  badge: {
    background: '#0F2235',
    border: '1px solid #0EA5E9',
    color: '#7DD3FC',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#38BDF8',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 700,
    padding: 0,
    lineHeight: 1,
  },
  inputField: {
    flex: 1,
    minWidth: '140px',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#F1F5F9',
    fontSize: '14px',
    fontFamily: 'inherit',
    padding: '4px 0',
  },
  hintText: {
    color: '#64748B',
    fontSize: '12px',
    marginTop: '6px',
    fontWeight: 500,
  },
  kbd: {
    background: '#1E293B',
    border: '1px solid #334155',
    color: '#94A3B8',
    borderRadius: '4px',
    padding: '1px 5px',
    fontSize: '11px',
    fontFamily: 'monospace',
  },
  suggestionsContainer: {
    marginTop: '18px',
  },
  suggestionTitle: {
    color: '#64748B',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block',
    marginBottom: '10px',
  },
  suggestionCloud: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  suggestBtn: {
    background: '#111827',
    border: '1px solid #1E293B',
    color: '#94A3B8',
    borderRadius: '20px',
    padding: '5px 12px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  },
  suggestDisabled: {
    background: '#0B1120',
    borderColor: '#1E293B',
    color: '#475569',
    cursor: 'not-allowed',
  },
};