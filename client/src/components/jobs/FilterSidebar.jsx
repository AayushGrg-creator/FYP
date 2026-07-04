import React from 'react';

const CATEGORIES = [
  { value: '',                   label: 'All Categories' },
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

export default function FilterSidebar({ filters = {}, onChange, onReset }) {
  const set = (key, val) => onChange({ ...filters, [key]: val });

  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>Filters</span>
        <button style={styles.resetBtn} onClick={onReset} type="button">
          Reset all
        </button>
      </div>

      {/* Category Selection Section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Category</div>
        {CATEGORIES.map(c => {
          const isChecked = (filters.category || '') === c.value;
          return (
            <label key={c.value} style={styles.radioLabel}>
              <input
                type="radio"
                name="category"
                value={c.value}
                checked={isChecked}
                onChange={() => set('category', c.value)}
                style={styles.radio}
              />
              <span style={{
                ...styles.radioText,
                color: isChecked ? '#0EA5E9' : '#94A3B8',
                fontWeight: isChecked ? 600 : 400,
              }}>
                {c.label}
              </span>
            </label>
          );
        })}
      </div>

      {/* Financial Target Parameter Inputs */}
      <div style={{ ...styles.section, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
        <div style={styles.sectionTitle}>Budget (NPR)</div>
        <div style={styles.budgetRow}>
          <input
            type="number"
            placeholder="Min"
            value={filters.minBudget || ''}
            onChange={e => set('minBudget', e.target.value)}
            style={styles.budgetInput}
            min="0"
          />
          <span style={{ color: '#475569', fontWeight: 600 }}>—</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.maxBudget || ''}
            onChange={e => set('maxBudget', e.target.value)}
            style={styles.budgetInput}
            min="0"
          />
        </div>

        {/* Project Terms Switchers */}
        <div style={styles.typeBtnWrapper}>
          {['', 'fixed', 'hourly'].map(t => {
            const isTypeActive = filters.budgetType === t;
            return (
              <button
                key={t}
                type="button"
                style={{
                  ...styles.typeBtn,
                  ...(isTypeActive ? styles.typeActive : {}),
                }}
                onClick={() => set('budgetType', t)}
              >
                {t === '' ? 'Any' : t === 'fixed' ? 'Fixed' : 'Hourly'}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

// ── Enhanced Styles ───────────────────────────────────────────────────────────
const styles = {
  sidebar: {
    width: 250,
    flexShrink: 0,
    background: '#111827',
    border: '1px solid #1E293B',
    borderRadius: 14,
    padding: '22px 20px',
    height: 'fit-content',
    position: 'sticky',
    top: 24,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex', 
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottom: '1px solid #1E293B',
  },
  headerTitle: { color: '#F1F5F9', fontWeight: 700, fontSize: 16 },
  resetBtn: {
    background: 'none', 
    border: 'none',
    color: '#0EA5E9', 
    cursor: 'pointer',
    fontSize: 13, 
    fontWeight: 600,
    padding: 0,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottom: '1px solid #1E293B',
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 14,
  },
  radioLabel: {
    display: 'flex', 
    alignItems: 'center',
    gap: 10, 
    cursor: 'pointer',
    marginBottom: 12,
  },
  radio: { 
    accentColor: '#0EA5E9', 
    cursor: 'pointer',
    width: '15px',
    height: '15px',
  },
  radioText: { 
    fontSize: '13.5px', 
    transition: 'all 0.15s ease',
  },
  budgetRow: { display: 'flex', alignItems: 'center', gap: 8 },
  budgetInput: {
    flex: 1, 
    background: '#0B1120',
    border: '1px solid #1E293B',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#F1F5F9',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums',
  },
  typeBtnWrapper: { 
    display: 'flex', 
    gap: 8, 
    marginTop: 12 
  },
  typeBtn: {
    flex: 1,
    background: '#0B1120',
    border: '1px solid #1E293B',
    color: '#64748B',
    borderRadius: 6,
    padding: '7px 0',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    transition: 'all 0.15s ease',
  },
  typeActive: {
    background: '#0F2235',
    border: '1px solid #0EA5E9',
    color: '#0EA5E9',
  },
};