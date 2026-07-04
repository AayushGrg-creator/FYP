import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

export default function EditJobPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [fetching, setFetching] = useState(true);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [notFound, setNotFound] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  const [form, setForm] = useState({
    title:              '',
    description:        '',
    category:           '',
    skillsRequired:     [],
    budgetType:         'fixed',
    budgetAmount:       '',
    deliveryTimeframe:  '', // days, matches schema directly (no date conversion needed on edit)
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // ── Load existing job on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // api.js interceptor already unwraps response.data, so response here
        // is the body itself. Controller responds { success, message, job }.
        const response = await jobService.getById(id);
        const job = response.job;

        if (!job) {
          if (!cancelled) setNotFound(true);
          return;
        }

        if (!cancelled) {
          setForm({
            title:             job.title ?? '',
            description:       job.description ?? '',
            category:          job.category ?? '',
            skillsRequired:    job.skillsRequired ?? [],
            budgetType:        job.budgetType ?? 'fixed',
            budgetAmount:      job.budgetAmount ?? '',
            deliveryTimeframe: job.deliveryTimeframe ?? '',
          });
        }
      } catch (e) {
        if (!cancelled) {
          setNotFound(true);
          setError(e.message || 'Failed to load job.');
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  // ── Skill helpers ──────────────────────────────────────────────────────
  const addSkill = (skill) => {
    const s = skill.trim();
    if (!s || form.skillsRequired.includes(s) || form.skillsRequired.length >= 15) return;
    set('skillsRequired', [...form.skillsRequired, s]);
    setSkillInput('');
  };

  const removeSkill = (s) =>
    set('skillsRequired', form.skillsRequired.filter(x => x !== s));

  // ── Validation ───────────────────────────────────────────────────────────
  const isValid =
    form.title.trim().length >= 5 &&
    form.description.trim().length >= 20 &&
    form.category &&
    form.skillsRequired.length > 0 &&
    form.budgetAmount;

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        title:             form.title,
        description:       form.description,
        category:          form.category,
        skillsRequired:    form.skillsRequired,
        budgetType:        form.budgetType,
        budgetAmount:      parseFloat(form.budgetAmount),
        ...(form.deliveryTimeframe
          ? { deliveryTimeframe: parseInt(form.deliveryTimeframe, 10) }
          : {}),
      };

      const response = await jobService.update(id, payload);
      const job = response.job;
      navigate(`/jobs/${job?._id ?? id}`);
    } catch (e) {
      setError(e.message || 'Failed to update job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render: loading / not found states ────────────────────────────────
  if (fetching) {
    return (
      <div style={styles.page}>
        <div style={styles.centeredMsg}>Loading job…</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={styles.page}>
        <div style={styles.centeredMsg}>
          <p>{error || 'Job not found.'}</p>
          <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Edit Job</h1>
        <p style={styles.subtitle}>Update your job posting details</p>
      </div>

      <div style={styles.card}>
        {error && <div style={styles.errorBox}>{error}</div>}

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
              placeholder="Describe what you need in detail..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              maxLength={5000}
            />
            <span style={styles.hint}>{form.description.length}/5000</span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Category <span style={styles.req}>*</span></label>
            <select style={styles.input} value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">Select a category</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

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

          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
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
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Delivery Timeframe (days, optional)</label>
              <input
                type="number"
                style={styles.input}
                placeholder="e.g. 14"
                value={form.deliveryTimeframe}
                onChange={e => set('deliveryTimeframe', e.target.value)}
                min="1"
              />
            </div>
          </div>
        </div>

        <div style={styles.nav}>
          <button style={styles.backBtnInline} onClick={() => navigate(-1)}>Cancel</button>
          <div style={{ flex: 1 }} />
          <button
            style={{ ...styles.nextBtn, opacity: (isValid && !loading) ? 1 : 0.5 }}
            disabled={!isValid || loading}
            onClick={handleSubmit}
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Styles (mirrors PostJobPage.jsx) ────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: '#0B1120',
    padding: '40px 24px 80px',
    fontFamily: "'DM Sans', sans-serif",
  },
  centeredMsg: {
    maxWidth: 480,
    margin: '80px auto',
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    alignItems: 'center',
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
  },
  backBtnInline: {
    background: 'transparent',
    border: '1px solid #1E293B',
    color: '#94A3B8',
    borderRadius: 8,
    padding: '12px 24px',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
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