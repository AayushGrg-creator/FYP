import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobService } from '../../services/jobService';

const CATEGORIES = [
  { value: 'web_development',    label: 'Web Development' },
  { value: 'mobile_development', label: 'Mobile Development' },
  { value: 'graphic_design',     label: 'Graphic Design' },
  { value: 'content_writing',    label: 'Content Writing' },
  { value: 'digital_marketing',  label: 'Digital Marketing' },
  { value: 'video_editing',      label: 'Video Editing' },
  { value: 'data_science',       label: 'Data Science' },
  { value: 'ui_ux_design',       label: 'UI / UX Design' },
  { value: 'seo',                label: 'SEO' },
  { value: 'other',              label: 'Other' },
];

const POPULAR_SKILLS = [
  'React','Node.js','Python','JavaScript','TypeScript','MongoDB',
  'PostgreSQL','AWS','Docker','Figma','Tailwind CSS','GraphQL',
  'Vue.js','Next.js','Express','FastAPI','SEO','Copywriting',
];

const STEPS = ['Basic Info', 'Skills & Budget', 'Deliverables', 'Review'];

export default function PostJobPage() {
  const navigate = useNavigate();
  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [skillInput, setSkillInput] = useState('');

  const [form, setForm] = useState({
    title:           '',
    description:     '',
    category:        '',
    experienceLevel: 'entry',
    location:        '',
    skillsRequired:  [],
    budgetType:      'fixed',
    budgetAmount:    '',
    deadline:        '',
    deliverables:    [''],
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // ── Skill helpers ──────────────────────────────────────────────────────────
  const addSkill = (skill) => {
    const s = skill.trim();
    if (!s || form.skillsRequired.includes(s) || form.skillsRequired.length >= 15) return;
    set('skillsRequired', [...form.skillsRequired, s]);
    setSkillInput('');
  };

  const removeSkill = (s) =>
    set('skillsRequired', form.skillsRequired.filter(x => x !== s));

  // ── Deliverable helpers ────────────────────────────────────────────────────
  const addDeliverable = () =>
    set('deliverables', [...form.deliverables, '']);

  const setDeliverable = (i, v) => {
    const d = [...form.deliverables];
    d[i] = v;
    set('deliverables', d);
  };

  const removeDeliverable = (i) =>
    set('deliverables', form.deliverables.filter((_, idx) => idx !== i));

  // ── Step validation ────────────────────────────────────────────────────────
  const stepValid = () => {
    if (step === 0) return form.title.length >= 5 && form.description.length >= 20 && form.category;
    if (step === 1) return form.skillsRequired.length > 0 && form.budgetAmount;
    return true;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      // Backend stores deliveryTimeframe as a number of days, not a date —
      // convert the picked deadline into "days from now" if one was set.
      let deliveryTimeframe;
      if (form.deadline) {
        const daysLeft = Math.ceil(
          (new Date(form.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        deliveryTimeframe = daysLeft > 0 ? daysLeft : undefined;
      }

      // NOTE: experienceLevel, location, and deliverables are not part of the
      // current Job schema/backend and are not sent yet. They're kept in the
      // form for UI/UX now; wire them up once the backend supports them.
      const payload = {
        title:            form.title,
        description:      form.description,
        category:         form.category,
        skillsRequired:   form.skillsRequired,
        budgetType:       form.budgetType,
        budgetAmount:     parseFloat(form.budgetAmount),
        deliveryTimeframe,
      };

      const response = await jobService.create(payload);
      // Controller responds { success, message, job } and api.js's interceptor
      // unwraps response.data, so the created job is at response.job.
      const job = response.job;
      navigate(`/jobs/${job._id}`);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Post a Job</h1>
        <p style={styles.subtitle}>Find the perfect freelancer for your project</p>
      </div>

      {/* Stepper */}
      <div style={styles.stepper}>
        {STEPS.map((label, i) => (
          <div key={label} style={styles.stepItem}>
            <div style={{
              ...styles.stepCircle,
              background: i <= step ? '#0EA5E9' : '#1E293B',
              border: `2px solid ${i <= step ? '#0EA5E9' : '#334155'}`,
              color: i <= step ? '#fff' : '#64748B',
            }}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{ ...styles.stepLabel, color: i <= step ? '#0EA5E9' : '#64748B' }}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div style={{ ...styles.stepLine, background: i < step ? '#0EA5E9' : '#1E293B' }} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div style={styles.card}>
        {error && <div style={styles.errorBox}>{error}</div>}

        {/* ── Step 0: Basic Info ── */}
        {step === 0 && (
          <div style={styles.fields}>
            <div style={styles.field}>
              <label style={styles.label}>Job Title <span style={styles.req}>*</span></label>
              <input
                style={styles.input}
                placeholder="e.g. Build a React e-commerce site"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                maxLength={150}
              />
              <span style={styles.hint}>{form.title.length}/150</span>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Description <span style={styles.req}>*</span></label>
              <textarea
                style={{ ...styles.input, height: 160, resize: 'vertical' }}
                placeholder="Describe what you need in detail — project goals, technical requirements, timeline expectations..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
                maxLength={5000}
              />
              <span style={styles.hint}>{form.description.length}/5000</span>
            </div>

            <div style={styles.row}>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Category <span style={styles.req}>*</span></label>
                <select style={styles.input} value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">Select a category</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Experience Level</label>
                <select style={styles.input} value={form.experienceLevel} onChange={e => set('experienceLevel', e.target.value)}>
                  <option value="entry">Entry Level</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>

            <div style={styles.row}>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Location (optional)</label>
                <input style={styles.input} placeholder="e.g. Remote, Kathmandu" value={form.location} onChange={e => set('location', e.target.value)} />
              </div>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Deadline (optional)</label>
                <input type="date" style={styles.input} value={form.deadline} min={new Date().toISOString().split('T')[0]} onChange={e => set('deadline', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Skills & Budget ── */}
        {step === 1 && (
          <div style={styles.fields}>
            <div style={styles.field}>
              <label style={styles.label}>Required Skills <span style={styles.req}>*</span></label>
              <div style={styles.skillInput}>
                <input
                  style={{ ...styles.input, flex: 1, marginBottom: 0 }}
                  placeholder="Type a skill and press Enter"
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }}
                />
                <button style={styles.addBtn} onClick={() => addSkill(skillInput)}>Add</button>
              </div>
              <div style={styles.skillTags}>
                {form.skillsRequired.map(s => (
                  <span key={s} style={styles.tag}>
                    {s}
                    <button style={styles.tagRemove} onClick={() => removeSkill(s)}>×</button>
                  </span>
                ))}
              </div>
              <div style={styles.popularSkills}>
                <span style={styles.hint}>Popular: </span>
                {POPULAR_SKILLS.map(s => (
                  <button key={s} style={styles.pillBtn} onClick={() => addSkill(s)}>{s}</button>
                ))}
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Budget Type</label>
              <div style={styles.toggleGroup}>
                {['fixed', 'hourly'].map(t => (
                  <button
                    key={t}
                    style={{ ...styles.toggleBtn, ...(form.budgetType === t ? styles.toggleActive : {}) }}
                    onClick={() => set('budgetType', t)}
                  >
                    {t === 'fixed' ? '💰 Fixed Price' : '⏱ Hourly Rate'}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                {form.budgetType === 'fixed' ? 'Budget (NPR)' : 'Rate (NPR/hr)'} <span style={styles.req}>*</span>
              </label>
              <input
                type="number"
                style={styles.input}
                placeholder="e.g. 15000"
                value={form.budgetAmount}
                onChange={e => set('budgetAmount', e.target.value)}
                min="1"
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Deliverables ── */}
        {step === 2 && (
          <div style={styles.fields}>
            <div style={styles.field}>
              <label style={styles.label}>Deliverables (optional)</label>
              <p style={{ ...styles.hint, marginBottom: 12 }}>
                List the specific outputs you expect from the freelancer
              </p>
              {form.deliverables.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    style={{ ...styles.input, flex: 1, marginBottom: 0 }}
                    placeholder={`Deliverable ${i + 1}`}
                    value={d}
                    onChange={e => setDeliverable(i, e.target.value)}
                  />
                  {form.deliverables.length > 1 && (
                    <button style={styles.removeBtn} onClick={() => removeDeliverable(i)}>✕</button>
                  )}
                </div>
              ))}
              {form.deliverables.length < 10 && (
                <button style={styles.ghostBtn} onClick={addDeliverable}>+ Add Deliverable</button>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div style={styles.fields}>
            <h3 style={{ color: '#E2E8F0', marginTop: 0 }}>Review Your Job Posting</h3>
            <div style={styles.reviewGrid}>
              <ReviewRow label="Title"       value={form.title} />
              <ReviewRow label="Category"    value={CATEGORIES.find(c => c.value === form.category)?.label} />
              <ReviewRow label="Experience"  value={form.experienceLevel} />
              <ReviewRow label="Budget"      value={`NPR ${form.budgetAmount} (${form.budgetType})`} />
              {form.deadline && <ReviewRow label="Deadline" value={new Date(form.deadline).toLocaleDateString()} />}
              <div style={styles.reviewFull}>
                <span style={styles.reviewLabel}>Description</span>
                <p style={styles.reviewText}>{form.description}</p>
              </div>
              <div style={styles.reviewFull}>
                <span style={styles.reviewLabel}>Skills</span>
                <div style={styles.skillTags}>
                  {form.skillsRequired.map(s => <span key={s} style={styles.tag}>{s}</span>)}
                </div>
              </div>
              {form.deliverables.filter(Boolean).length > 0 && (
                <div style={styles.reviewFull}>
                  <span style={styles.reviewLabel}>Deliverables</span>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: '#CBD5E1' }}>
                    {form.deliverables.filter(Boolean).map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={styles.nav}>
          {step > 0 && (
            <button style={styles.backBtn} onClick={() => setStep(s => s - 1)}>← Back</button>
          )}
          <div style={{ flex: 1 }} />
          {step < STEPS.length - 1 ? (
            <button
              style={{ ...styles.nextBtn, opacity: stepValid() ? 1 : 0.5 }}
              disabled={!stepValid()}
              onClick={() => setStep(s => s + 1)}
            >
              Continue →
            </button>
          ) : (
            <button
              style={{ ...styles.nextBtn, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? 'Posting…' : '🚀 Post Job'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ color: '#E2E8F0', fontSize: 15 }}>{value}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: '#0B1120',
    padding: '40px 24px 80px',
    fontFamily: "'DM Sans', sans-serif",
  },
  header: { textAlign: 'center', marginBottom: 40 },
  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 700,
    color: '#F1F5F9',
    letterSpacing: '-0.02em',
  },
  subtitle: { margin: '8px 0 0', color: '#64748B', fontSize: 16 },

  stepper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
    marginBottom: 32,
    maxWidth: 600,
    margin: '0 auto 32px',
  },
  stepItem: { display: 'flex', alignItems: 'center', gap: 0 },
  stepCircle: {
    width: 32, height: 32,
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700,
    transition: 'all 0.25s',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: 500,
    marginLeft: 8,
    marginRight: 8,
    whiteSpace: 'nowrap',
  },
  stepLine: { height: 2, width: 32, transition: 'background 0.25s' },

  card: {
    maxWidth: 720,
    margin: '0 auto',
    background: '#111827',
    border: '1px solid #1E293B',
    borderRadius: 16,
    padding: '36px 40px',
  },
  errorBox: {
    background: '#450A0A',
    border: '1px solid #7F1D1D',
    color: '#FCA5A5',
    borderRadius: 8,
    padding: '12px 16px',
    marginBottom: 24,
    fontSize: 14,
  },
  fields: { display: 'flex', flexDirection: 'column', gap: 24 },
  field:  { display: 'flex', flexDirection: 'column', gap: 6 },
  row:    { display: 'flex', gap: 20 },
  label:  { color: '#CBD5E1', fontSize: 14, fontWeight: 600 },
  req:    { color: '#0EA5E9' },
  hint:   { color: '#475569', fontSize: 12, marginTop: 2 },
  input: {
    background: '#0B1120',
    border: '1px solid #1E293B',
    borderRadius: 8,
    padding: '11px 14px',
    color: '#F1F5F9',
    fontSize: 15,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: 0,
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  },
  skillInput: { display: 'flex', gap: 8 },
  addBtn: {
    background: '#0EA5E9',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '11px 20px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    whiteSpace: 'nowrap',
  },
  skillTags: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tag: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: '#0F2235',
    border: '1px solid #1E4976',
    color: '#7DD3FC',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: 13,
    fontWeight: 500,
  },
  tagRemove: {
    background: 'none', border: 'none',
    color: '#7DD3FC', cursor: 'pointer',
    padding: 0, fontSize: 16, lineHeight: 1,
  },
  popularSkills: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, alignItems: 'center' },
  pillBtn: {
    background: 'transparent',
    border: '1px solid #1E293B',
    color: '#64748B',
    borderRadius: 20,
    padding: '3px 10px',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  toggleGroup: { display: 'flex', gap: 12 },
  toggleBtn: {
    flex: 1,
    background: '#0B1120',
    border: '2px solid #1E293B',
    color: '#64748B',
    borderRadius: 10,
    padding: '14px 20px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  toggleActive: {
    border: '2px solid #0EA5E9',
    color: '#0EA5E9',
    background: '#0F2235',
  },
  removeBtn: {
    background: '#1E293B', border: 'none', borderRadius: 8,
    color: '#94A3B8', cursor: 'pointer', padding: '0 14px',
    fontSize: 16,
  },
  ghostBtn: {
    background: 'transparent',
    border: '1px dashed #1E293B',
    color: '#0EA5E9',
    borderRadius: 8,
    padding: '10px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    marginTop: 4,
  },
  reviewGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  reviewFull: { gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 },
  reviewLabel: { fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' },
  reviewText: { color: '#CBD5E1', fontSize: 15, margin: '4px 0 0', lineHeight: 1.6 },

  nav: {
    display: 'flex',
    alignItems: 'center',
    marginTop: 36,
    paddingTop: 24,
    borderTop: '1px solid #1E293B',
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid #1E293B',
    color: '#94A3B8',
    borderRadius: 8,
    padding: '12px 24px',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  nextBtn: {
    background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
    border: 'none',
    color: '#fff',
    borderRadius: 8,
    padding: '12px 32px',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.02em',
    boxShadow: '0 0 20px rgba(14,165,233,0.35)',
    transition: 'all 0.2s',
  },
};