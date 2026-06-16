import React, { useState } from 'react';

/**
 * JobForm Component
 * Path: client/src/components/jobs/JobForm.jsx
 * * Provides an administrative entry interface for clients to publish project milestones.
 * Includes defensive input checking, tag management, and clean submission handling.
 */
export default function JobForm({ onSubmit, initialData = {}, isSubmitting = false }) {
  // ── Component State Management ──
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    category: initialData.category || '',
    minBudget: initialData.minBudget || '',
    maxBudget: initialData.maxBudget || '',
    budgetType: initialData.budgetType || 'fixed',
    experienceLevel: initialData.experienceLevel || 'intermediate',
    ...initialData
  });

  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState(initialData.skills || []);
  const [error, setError] = useState('');

  // Universal text input state mutation helper
  const set = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  // ── Cloud Tag Multi-Select Logic ──
  const handleAddSkill = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault();
      const cleanSkill = skillInput.trim();
      
      if (cleanSkill && !skills.includes(cleanSkill)) {
        const updatedSkills = [...skills, cleanSkill];
        setSkills(updatedSkills);
        setSkillInput('');
      }
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    const updatedSkills = skills.filter(s => s !== skillToRemove);
    setSkills(updatedSkills);
  };

  // ── Form Validation & Submission Interceptor ──
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Core structural integrity checks
    if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
      setError('Please populate all primary mandatory registration segments.');
      return;
    }

    const min = Number(formData.minBudget);
    const max = Number(formData.maxBudget);

    if (isNaN(min) || min < 0 || isNaN(max) || max < 0) {
      setError('Budget calculations must evaluate to valid non-negative parameters.');
      return;
    }

    if (max < min) {
      setError('Maximum budget boundary metrics cannot sit below baseline min rates.');
      return;
    }

    if (skills.length === 0) {
      setError('Please map at least one specialized validation skill tag to this contract.');
      return;
    }

    // Pass valid payload up to the parent controller handler hook
    onSubmit({
      ...formData,
      minBudget: min,
      maxBudget: max,
      skills
    });
  };

  return (
    <form style={styles.form} onSubmit={handleSubmit}>
      <h2 style={styles.formTitle}>{initialData._id ? 'Modify Contract Details' : 'Post a New Project'}</h2>
      
      {error && <div style={styles.errorBanner}>⚠️ {error}</div>}

      {/* Contract Title Input */}
      <div style={styles.formGroup}>
        <label style={styles.label} htmlFor="title">Project Contract Title</label>
        <input
          id="title"
          type="text"
          placeholder="e.g., Build a production-ready React.js frontend for Task Tide"
          value={formData.title}
          onChange={e => set('title', e.target.value)}
          style={styles.input}
          disabled={isSubmitting}
        />
      </div>

      {/* Category Picker Segment */}
      <div style={styles.formGroup}>
        <label style={styles.label} htmlFor="category">Core Category Taxonomy</label>
        <select
          id="category"
          value={formData.category}
          onChange={e => set('category', e.target.value)}
          style={styles.select}
          disabled={isSubmitting}
        >
          <option value="" disabled style={styles.option}>Select an engineering domain...</option>
          <option value="web-development" style={styles.option}>Web Development</option>
          <option value="mobile-development" style={styles.option}>Mobile Development</option>
          <option value="graphic-design" style={styles.option}>Graphic Design</option>
          <option value="content-writing" style={styles.option}>Content Writing</option>
          <option value="digital-marketing" style={styles.option}>Digital Marketing</option>
          <option value="data-science" style={styles.option}>Data Science</option>
          <option value="video-editing" style={styles.option}>Video Editing</option>
          <option value="ui-ux-design" style={styles.option}>UI / UX Design</option>
          <option value="devops" style={styles.option}>DevOps</option>
        </select>
      </div>

      {/* Contract Description Textarea */}
      <div style={styles.formGroup}>
        <label style={styles.label} htmlFor="description">Detailed Technical Requirements</label>
        <textarea
          id="description"
          rows="6"
          placeholder="Outline the explicit scope of execution, technical tech-stack layers, delivery timelines, and milestone expectations clearly..."
          value={formData.description}
          onChange={e => set('description', e.target.value)}
          style={styles.textarea}
          disabled={isSubmitting}
        />
      </div>

      {/* Budget Matrix Properties Segment */}
      <div style={styles.gridRow}>
        <div style={{ ...styles.formGroup, flex: 1 }}>
          <label style={styles.label}>Financial Terms Agreement</label>
          <div style={styles.toggleRow}>
            {['fixed', 'hourly'].map(t => {
              const active = formData.budgetType === t;
              return (
                <button
                  key={t}
                  type="button"
                  style={{ ...styles.toggleBtn, ...(active ? styles.toggleActive : {}) }}
                  onClick={() => set('budgetType', t)}
                  disabled={isSubmitting}
                >
                  {t === 'fixed' ? '💼 Fixed Price' : '⏳ Hourly Rate'}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ ...styles.formGroup, flex: 1 }}>
          <label style={styles.label}>Experience Tier Target</label>
          <select
            value={formData.experienceLevel}
            onChange={e => set('experienceLevel', e.target.value)}
            style={styles.select}
            disabled={isSubmitting}
          >
            <option value="entry" style={styles.option}>Entry Level</option>
            <option value="intermediate" style={styles.option}>Intermediate Level</option>
            <option value="expert" style={styles.option}>Expert / Advanced Level</option>
          </select>
        </div>
      </div>

      {/* Budget Numeric Entry Arrays */}
      <div style={styles.gridRow}>
        <div style={{ ...styles.formGroup, flex: 1 }}>
          <label style={styles.label} htmlFor="minBudget">Minimum Estimate (NPR)</label>
          <input
            id="minBudget"
            type="number"
            min="0"
            placeholder="Min Budget"
            value={formData.minBudget}
            onChange={e => set('minBudget', e.target.value)}
            style={styles.input}
            disabled={isSubmitting}
          />
        </div>

        <div style={{ ...styles.formGroup, flex: 1 }}>
          <label style={styles.label} htmlFor="maxBudget">Maximum Limit Boundary (NPR)</label>
          <input
            id="maxBudget"
            type="number"
            min="0"
            placeholder="Max Budget"
            value={formData.maxBudget}
            onChange={e => set('maxBudget', e.target.value)}
            style={styles.input}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Skill Input Module */}
      <div style={styles.formGroup}>
        <label style={styles.label} htmlFor="skills">Required Skills Tag Index</label>
        <div style={styles.skillInputWrapper}>
          <input
            id="skills"
            type="text"
            placeholder="Type a skill and press Enter..."
            value={skillInput}
            onChange={e => setSkillInput(e.target.value)}
            onKeyDown={handleAddSkill}
            style={{ ...styles.input, marginBottom: 0 }}
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={handleAddSkill}
            style={styles.addTagBtn}
            disabled={isSubmitting}
          >
            Add
          </button>
        </div>

        {/* Dynamic Skill Badge Row Rendering */}
        {skills.length > 0 && (
          <div style={styles.tagCloud}>
            {skills.map(s => (
              <span key={s} style={styles.tagBadge}>
                {s}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(s)}
                  style={styles.removeTagBtn}
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Submission Control Actions */}
      <button
        type="submit"
        style={{ ...styles.submitBtn, ...(isSubmitting ? styles.submitDisabled : {}) }}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Processing Pipeline Operations...' : initialData._id ? 'Update Contract Details' : 'Publish Live Marketplace Contract'}
      </button>
    </form>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  form: {
    background: '#111827',
    border: '1px solid #1E293B',
    borderRadius: 14,
    padding: '32px',
    maxWidth: '720px',
    width: '100%',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxSizing: 'border-box',
  },
  formTitle: {
    margin: '0 0 24px 0',
    fontSize: '22px',
    fontWeight: 800,
    color: '#F1F5F9',
    letterSpacing: '-0.02em',
  },
  errorBanner: {
    background: '#7F1D1D',
    border: '1px solid #F87171',
    color: '#FCA5A5',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 20,
  },
  gridRow: {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap',
  },
  label: {
    color: '#94A3B8',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    background: '#0B1120',
    border: '1px solid #1E293B',
    borderRadius: 8,
    padding: '12px 14px',
    color: '#F1F5F9',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s ease',
  },
  select: {
    background: '#0B1120',
    border: '1px solid #1E293B',
    borderRadius: 8,
    padding: '12px 14px',
    color: '#F1F5F9',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
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
    borderRadius: 8,
    padding: '12px 14px',
    color: '#F1F5F9',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical',
    lineHeight: '1.6',
  },
  toggleRow: {
    display: 'flex',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    background: '#0B1120',
    border: '1px solid #1E293B',
    color: '#64748B',
    borderRadius: 8,
    padding: '11px 0',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  toggleActive: {
    background: '#0F2235',
    border: '1px solid #0EA5E9',
    color: '#0EA5E9',
  },
  skillInputWrapper: {
    display: 'flex',
    gap: 10,
  },
  addTagBtn: {
    background: '#1E293B',
    color: '#F1F5F9',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '0 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  tagCloud: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    background: '#0B1120',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #1E293B',
  },
  tagBadge: {
    background: '#0F2235',
    border: '1px solid #0EA5E9',
    color: '#7DD3FC',
    padding: '4px 8px 4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  removeTagBtn: {
    background: 'none',
    border: 'none',
    color: '#38BDF8',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 700,
    padding: 0,
    lineHeight: 1,
  },
  submitBtn: {
    background: '#0EA5E9',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 0',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '10px',
    fontFamily: 'inherit',
    transition: 'background 0.15s ease',
  },
  submitDisabled: {
    background: '#1E293B',
    color: '#64748B',
    cursor: 'not-allowed',
  }
};