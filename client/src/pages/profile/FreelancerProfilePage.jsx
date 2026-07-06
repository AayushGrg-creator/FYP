import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// ── Skill tag suggestions ─────────────────────────────────────────────────────
const SKILL_SUGGESTIONS = [
  'React', 'Node.js', 'Python', 'JavaScript', 'TypeScript', 'MongoDB',
  'PostgreSQL', 'GraphQL', 'Next.js', 'Vue.js', 'Flutter', 'Swift',
  'Figma', 'UI/UX', 'Tailwind CSS', 'Docker', 'AWS', 'Firebase',
];

// ── Profile strength bar ──────────────────────────────────────────────────────
function StrengthBar({ value }) {
  const color = value < 40 ? '#e74c3c' : value < 80 ? '#f1c40f' : '#00e5a0';
  const label = value < 40 ? 'Weak' : value < 80 ? 'Good' : 'Strong';
  return (
    <div style={s.strengthWrap}>
      <div style={s.strengthHeader}>
        <span style={s.strengthTitle}>Profile Strength</span>
        <span style={{ ...s.strengthLabel, color }}>{value}% — {label}</span>
      </div>
      <div style={s.strengthTrack}>
        <div style={{ ...s.strengthBar, width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Portfolio item card ───────────────────────────────────────────────────────
function PortfolioCard({ item, index, onChange, onRemove }) {
  return (
    <div style={s.portfolioCard}>
      <div style={s.portfolioCardHeader}>
        <span style={s.portfolioIndex}>#{index + 1}</span>
        <button type="button" style={s.removeBtn} onClick={() => onRemove(index)}>✕</button>
      </div>
      <input
        style={s.input}
        placeholder="Project title"
        value={item.title}
        onChange={e => onChange(index, 'title', e.target.value)}
        maxLength={120}
      />
      <textarea
        style={{ ...s.input, ...s.textarea }}
        placeholder="Project description"
        value={item.description}
        onChange={e => onChange(index, 'description', e.target.value)}
        maxLength={500}
        rows={3}
      />
      <input
        style={s.input}
        placeholder="Project URL (https://...)"
        value={item.url}
        onChange={e => onChange(index, 'url', e.target.value)}
      />
      <input
        style={s.input}
        placeholder="Tech stack (comma separated, e.g. React, Node.js)"
        value={item.techStack.join(', ')}
        onChange={e => onChange(index, 'techStack', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FreelancerProfilePage() {
  const { user, updateUser } = useAuth();

  const [profile, setProfile] = useState({
    bio:        '',
    hourlyRate: 0,
    skills:     [],
    portfolio:  [],
    avatarUrl:  '',
    location:   '',
  });

  const [skillInput, setSkillInput]   = useState('');
  const [saving, setSaving]           = useState(false);
  const [loading, setLoading]         = useState(true);
  const [success, setSuccess]         = useState('');
  const [error, setError]             = useState('');
  const [strength, setStrength]       = useState(0);
  const [activeTab, setActiveTab]     = useState('basic'); // basic | skills | portfolio
  const fileInputRef                  = useRef(null);

  // ── Load existing profile ─────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/profile/freelancer');
        const p   = res.profile ?? res;
        setProfile({
          bio:        p.bio        || '',
          hourlyRate: p.hourlyRate || 0,
          skills:     p.skills     || [],
          portfolio:  p.portfolio  || [],
          avatarUrl:  p.avatarUrl  || user?.avatarUrl || '',
          location:   p.location   || '',
        });
        setStrength(p.profileStrength || 0);
      } catch {
        // Profile may not exist yet — defaults are fine
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/profile/freelancer', profile);
      const updated = res.profile ?? res;
      setStrength(updated.profileStrength || 0);
      setSuccess('Profile saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  // ── Skills ────────────────────────────────────────────────────────────────
  const addSkill = (skill) => {
    const trimmed = skill.trim();
    if (!trimmed || profile.skills.includes(trimmed) || profile.skills.length >= 20) return;
    setProfile(p => ({ ...p, skills: [...p.skills, trimmed] }));
    setSkillInput('');
  };

  const removeSkill = (skill) => {
    setProfile(p => ({ ...p, skills: p.skills.filter(s => s !== skill) }));
  };

  const handleSkillKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillInput);
    }
  };

  // ── Portfolio ─────────────────────────────────────────────────────────────
  const addPortfolioItem = () => {
    if (profile.portfolio.length >= 10) return;
    setProfile(p => ({
      ...p,
      portfolio: [...p.portfolio, { title: '', description: '', url: '', techStack: [] }],
    }));
  };

  const updatePortfolioItem = (index, field, value) => {
    setProfile(p => {
      const updated = [...p.portfolio];
      updated[index] = { ...updated[index], [field]: value };
      return { ...p, portfolio: updated };
    });
  };F

  const removePortfolioItem = (index) => {
    setProfile(p => ({ ...p, portfolio: p.portfolio.filter((_, i) => i !== index) }));
  };

  if (loading) {
    return (
      <div style={s.loadingWrap}>
        <div style={s.spinner} />
        <p style={s.loadingText}>Loading your profile…</p>
      </div>
    );
  }

  const tabs = [
    { key: 'basic',     label: 'Basic Info',  icon: '👤' },
    { key: 'skills',    label: 'Skills',      icon: '⚡' },
    { key: 'portfolio', label: 'Portfolio',   icon: '🗂️' },
  ];

  return (
    <div style={s.page}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div>
          <h1 style={s.pageTitle}>My Profile</h1>
          <p style={s.pageSubtitle}>Build a compelling profile to attract top clients</p>
        </div>
        <button
          style={{ ...s.saveBtn, opacity: saving ? 0.65 : 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <span style={s.btnSpinner} /> : '💾  Save Profile'}
        </button>
      </div>

      {/* ── Alerts ── */}
      {success && <div style={s.successBanner}>✓ {success}</div>}
      {error   && <div style={s.errorBanner}>⚠ {error}</div>}

      {/* ── Strength bar ── */}
      <StrengthBar value={strength} />

      {/* ── Avatar + name card ── */}
      <div style={s.avatarCard}>
        <div style={s.avatarWrap}>
          <img
            src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'F')}&background=7c6ff7&color=fff&size=128`}
            alt="avatar"
            style={s.avatar}
          />
          <button style={s.avatarEditBtn} onClick={() => fileInputRef.current?.click()}>✎</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = ev => setProfile(p => ({ ...p, avatarUrl: ev.target.result }));
              reader.readAsDataURL(file);
            }}
          />
        </div>
        <div style={s.avatarInfo}>
          <p style={s.avatarName}>{user?.name || 'Freelancer'}</p>
          <p style={s.avatarEmail}>{user?.email}</p>
          <div style={s.badge}>Freelancer</div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={s.tabs}>
        {tabs.map(t => (
          <button
            key={t.key}
            style={{ ...s.tab, ...(activeTab === t.key ? s.tabActive : {}) }}
            onClick={() => setActiveTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Basic Info ── */}
      {activeTab === 'basic' && (
        <div style={s.section}>

          <div style={s.fieldGroup}>
            <label style={s.label}>Location</label>
            <div style={s.inputWrap}>
              <span style={s.inputIcon}>📍</span>
              <input
                style={s.inputWithIcon}
                placeholder="e.g. Kathmandu, Nepal"
                value={profile.location}
                onChange={e => setProfile(p => ({ ...p, location: e.target.value }))}
              />
            </div>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Hourly Rate (USD)</label>
            <div style={s.inputWrap}>
              <span style={s.inputIcon}>$</span>
              <input
                style={s.inputWithIcon}
                type="number"
                min={0}
                placeholder="e.g. 25"
                value={profile.hourlyRate || ''}
                onChange={e => setProfile(p => ({ ...p, hourlyRate: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div style={s.fieldGroup}>
            <div style={s.labelRow}>
              <label style={s.label}>Bio</label>
              <span style={s.charCount}>{profile.bio.length}/500</span>
            </div>
            <textarea
              style={{ ...s.input, ...s.textarea }}
              placeholder="Tell clients about your experience, expertise, and what makes you unique..."
              value={profile.bio}
              onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
              maxLength={500}
              rows={5}
            />
          </div>

        </div>
      )}

      {/* ── Tab: Skills ── */}
      {activeTab === 'skills' && (
        <div style={s.section}>

          <div style={s.fieldGroup}>
            <div style={s.labelRow}>
              <label style={s.label}>Skills</label>
              <span style={s.charCount}>{profile.skills.length}/20</span>
            </div>
            <div style={s.skillInputWrap}>
              <input
                style={s.input}
                placeholder="Type a skill and press Enter or comma..."
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKey}
              />
              <button
                type="button"
                style={s.addSkillBtn}
                onClick={() => addSkill(skillInput)}
              >
                Add
              </button>
            </div>

            {/* Current skills */}
            {profile.skills.length > 0 && (
              <div style={s.skillTags}>
                {profile.skills.map(skill => (
                  <span key={skill} style={s.skillTag}>
                    {skill}
                    <button style={s.skillRemove} onClick={() => removeSkill(skill)}>✕</button>
                  </span>
                ))}
              </div>
            )}

            {/* Suggestions */}
            <div style={s.suggestionsWrap}>
              <p style={s.suggestionsLabel}>Suggestions:</p>
              <div style={s.suggestions}>
                {SKILL_SUGGESTIONS.filter(s => !profile.skills.includes(s)).map(skill => (
                  <button
                    key={skill}
                    type="button"
                    style={s.suggestionChip}
                    onClick={() => addSkill(skill)}
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── Tab: Portfolio ── */}
      {activeTab === 'portfolio' && (
        <div style={s.section}>

          <div style={s.portfolioHeader}>
            <div>
              <p style={s.label}>Portfolio Projects</p>
              <p style={s.portfolioSubtitle}>{profile.portfolio.length}/10 projects added</p>
            </div>
            <button
              type="button"
              style={s.addPortfolioBtn}
              onClick={addPortfolioItem}
              disabled={profile.portfolio.length >= 10}
            >
              + Add Project
            </button>
          </div>

          {profile.portfolio.length === 0 && (
            <div style={s.emptyPortfolio}>
              <p style={s.emptyIcon}>🗂️</p>
              <p style={s.emptyTitle}>No projects yet</p>
              <p style={s.emptyDesc}>Add your best work to impress clients</p>
            </div>
          )}

          {profile.portfolio.map((item, index) => (
            <PortfolioCard
              key={index}
              item={item}
              index={index}
              onChange={updatePortfolioItem}
              onRemove={removePortfolioItem}
            />
          ))}

        </div>
      )}

      {/* ── Bottom save ── */}
      <button
        style={{ ...s.saveBtn, ...s.saveBtnBottom, opacity: saving ? 0.65 : 1 }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? <span style={s.btnSpinner} /> : '💾  Save Profile'}
      </button>

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    background: '#1a1a1a',
    padding: '32px 16px 60px',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    maxWidth: 720,
    margin: '0 auto',
    color: '#fff',
    WebkitFontSmoothing: 'antialiased',
  },

  // Loading
  loadingWrap: { minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#1a1a1a' },
  spinner: { width: 36, height: 36, border: '3px solid #333', borderTopColor: '#00e5a0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingText: { color: '#888', fontSize: 15 },

  // Header
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' },
  pageTitle: { margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' },
  pageSubtitle: { margin: '4px 0 0', fontSize: 14, color: '#888' },

  // Alerts
  successBanner: { background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)', color: '#00e5a0', borderRadius: 12, padding: '12px 16px', fontSize: 14, marginBottom: 16 },
  errorBanner:   { background: 'rgba(255,92,92,0.1)', border: '1px solid rgba(255,92,92,0.3)', color: '#ff5c5c', borderRadius: 12, padding: '12px 16px', fontSize: 14, marginBottom: 16 },

  // Strength
  strengthWrap:   { background: '#222', borderRadius: 14, padding: '16px 20px', marginBottom: 20 },
  strengthHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 10 },
  strengthTitle:  { fontSize: 14, fontWeight: 600, color: '#ccc' },
  strengthLabel:  { fontSize: 14, fontWeight: 700 },
  strengthTrack:  { height: 6, background: '#333', borderRadius: 99, overflow: 'hidden' },
  strengthBar:    { height: '100%', borderRadius: 99, transition: 'width 0.5s ease, background 0.5s ease' },

  // Avatar card
  avatarCard: { display: 'flex', alignItems: 'center', gap: 20, background: '#222', borderRadius: 16, padding: '20px 24px', marginBottom: 24 },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar:     { width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #333' },
  avatarEditBtn: { position: 'absolute', bottom: 0, right: 0, background: '#7c6ff7', border: 'none', borderRadius: '50%', width: 26, height: 26, color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarInfo:  { flex: 1 },
  avatarName:  { margin: 0, fontSize: 18, fontWeight: 700 },
  avatarEmail: { margin: '2px 0 8px', fontSize: 13, color: '#888' },
  badge:       { display: 'inline-block', background: 'rgba(124,111,247,0.15)', border: '1px solid rgba(124,111,247,0.4)', color: '#7c6ff7', borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 600 },

  // Tabs
  tabs:      { display: 'flex', gap: 8, marginBottom: 24, background: '#222', borderRadius: 14, padding: 6 },
  tab:       { flex: 1, padding: '10px 16px', background: 'none', border: 'none', borderRadius: 10, color: '#888', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' },
  tabActive: { background: '#2e2e2e', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },

  // Section
  section: { background: '#222', borderRadius: 16, padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 },

  // Fields
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  label:      { fontSize: 14, fontWeight: 700, color: '#ccc' },
  labelRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  charCount:  { fontSize: 12, color: '#555' },
  inputWrap:  { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon:  { position: 'absolute', left: 14, fontSize: 15, pointerEvents: 'none' },
  input: {
    width: '100%',
    padding: '13px 16px',
    background: '#2a2a2a',
    border: '1.5px solid #333',
    borderRadius: 12,
    fontSize: 15,
    color: '#fff',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  inputWithIcon: {
    width: '100%',
    padding: '13px 16px 13px 40px',
    background: '#2a2a2a',
    border: '1.5px solid #333',
    borderRadius: 12,
    fontSize: 15,
    color: '#fff',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: { resize: 'vertical', minHeight: 100, lineHeight: 1.6 },

  // Skills
  skillInputWrap: { display: 'flex', gap: 8 },
  addSkillBtn: { padding: '13px 20px', background: '#7c6ff7', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  skillTags:   { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  skillTag:    { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(124,111,247,0.15)', border: '1px solid rgba(124,111,247,0.35)', color: '#a89fff', borderRadius: 99, padding: '5px 12px', fontSize: 13, fontWeight: 600 },
  skillRemove: { background: 'none', border: 'none', color: '#7c6ff7', cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1 },
  suggestionsWrap:  { marginTop: 8 },
  suggestionsLabel: { fontSize: 12, color: '#555', marginBottom: 8 },
  suggestions:      { display: 'flex', flexWrap: 'wrap', gap: 6 },
  suggestionChip:   { background: '#2a2a2a', border: '1px solid #333', color: '#888', borderRadius: 99, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' },

  // Portfolio
  portfolioHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  portfolioSubtitle: { margin: '2px 0 0', fontSize: 12, color: '#555' },
  addPortfolioBtn:   { padding: '10px 18px', background: '#00e5a0', border: 'none', borderRadius: 10, color: '#111', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  emptyPortfolio:    { textAlign: 'center', padding: '40px 0', color: '#555' },
  emptyIcon:         { fontSize: 40, margin: '0 0 12px' },
  emptyTitle:        { margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#666' },
  emptyDesc:         { margin: 0, fontSize: 13 },
  portfolioCard:     { background: '#2a2a2a', border: '1.5px solid #333', borderRadius: 14, padding: '18px', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 },
  portfolioCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  portfolioIndex:    { fontSize: 12, fontWeight: 700, color: '#7c6ff7', background: 'rgba(124,111,247,0.1)', padding: '3px 10px', borderRadius: 99 },
  removeBtn:         { background: 'rgba(255,92,92,0.1)', border: '1px solid rgba(255,92,92,0.2)', color: '#ff5c5c', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },

  // Save button
  saveBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 28px', background: '#00e5a0', border: 'none', borderRadius: 50, color: '#111', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' },
  saveBtnBottom: { width: '100%', marginTop: 8 },
  btnSpinner: { width: 18, height: 18, border: '2.5px solid rgba(0,0,0,0.2)', borderTopColor: '#111', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' },
};