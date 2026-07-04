import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { jobService } from '../../services/jobService';
import FilterSidebar from '../../components/jobs/FilterSidebar';

// NOTE: sorting is limited to what the backend actually supports right now —
// newest-first (default) or a text-relevance sort when searching. "Oldest"
// and "Budget high/low" aren't implemented server-side yet, so they're left
// out here rather than shown as options that silently do nothing.
const SORT_OPTIONS = [
  { value: 'newest', label: '⬆ Newest First' },
];

// NOTE: experienceLevel and skills filters removed — the Job schema has no
// experienceLevel field, and the backend's getAllJobs doesn't support
// filtering by skills yet. Only send filters the backend actually reads.
const EMPTY_FILTERS = {
  category: '',
  minBudget: '',
  maxBudget: '',
  budgetType: '',
};

export default function JobBoardPage() {
  const [jobs, setJobs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState('newest');
  const [filters, setFilters]   = useState(EMPTY_FILTERS);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchJobs = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        search:     search,
        page,
        limit:      12,
        category:   filters.category,
        minBudget:  filters.minBudget,
        maxBudget:  filters.maxBudget,
        budgetType: filters.budgetType,
        ...overrides,
      };
      const data = await jobService.getAll(params);
      setJobs(data.jobs);
      setTotal(data.pagination.totalDocs);
      setPages(data.pagination.totalPages);
    } catch (e) {
      setError('Failed to load jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, sortBy, page, filters]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchJobs({ page: 1 });
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [search, sortBy, filters]);

  useEffect(() => {
    fetchJobs();
  }, [page]);

  const handleFilterChange = (updated) => {
    setFilters(updated);
    setPage(1);
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
    setSortBy('newest');
    setPage(1);
  };

  const activeFilterCount = Object.values(filters).reduce((n, v) => n + (v ? 1 : 0), 0);

  return (
    <div style={styles.page}>
      {/* Hero bar */}
      <div style={styles.heroBar}>
        <div style={styles.heroInner}>
          <div style={styles.heroText}>
            <h1 style={styles.heroTitle}>Find Work</h1>
            <p style={styles.heroSub}>{total.toLocaleString()} open jobs waiting for your skills</p>
          </div>
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              ref={searchRef}
              style={styles.searchInput}
              placeholder="Search by keyword, skill, or technology…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button style={styles.clearSearch} onClick={() => setSearch('')}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={styles.body}>
        {/* Sidebar toggle on mobile */}
        <div style={styles.mobileFilterToggle}>
          <button style={styles.filterToggleBtn} onClick={() => setSidebarOpen(o => !o)}>
            ⚙ Filters {activeFilterCount > 0 && <span style={styles.filterBadge}>{activeFilterCount}</span>}
          </button>
          <span style={{ color: '#64748B', fontSize: 13 }}>{total} results</span>
        </div>

        <div style={styles.layout}>
          {/* Sidebar */}
          {sidebarOpen && (
            <FilterSidebar
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleReset}
            />
          )}

          {/* Main */}
          <div style={styles.main}>
            {/* Toolbar */}
            <div style={styles.toolbar}>
              <span style={{ color: '#94A3B8', fontSize: 14 }}>
                {loading ? 'Loading…' : `${total} job${total !== 1 ? 's' : ''} found`}
              </span>
              <select
                style={styles.sortSelect}
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}

            {/* Grid */}
            {loading ? (
              <div style={styles.grid}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>🔎</div>
                <h3 style={{ color: '#F1F5F9', margin: '0 0 8px' }}>No jobs found</h3>
                <p style={{ color: '#64748B', margin: 0 }}>Try adjusting your filters or search terms.</p>
                <button style={styles.resetAllBtn} onClick={handleReset}>Clear all filters</button>
              </div>
            ) : (
              <div style={styles.grid}>
                {jobs.map(job => <JobCard key={job._id} job={job} />)}
              </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div style={styles.pagination}>
                <button style={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                {Array.from({ length: pages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === pages || Math.abs(p - page) <= 2)
                  .map((p, idx, arr) => (
                    <span key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: '#475569', padding: '0 4px' }}>…</span>}
                      <button
                        style={{ ...styles.pageBtn, ...(p === page ? styles.pageActive : {}) }}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    </span>
                  ))
                }
                <button style={styles.pageBtn} disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job }) {
  const CATEGORY_COLORS = {
    web_development:    '#0EA5E9',
    mobile_development: '#8B5CF6',
    graphic_design:     '#EC4899',
    content_writing:    '#F59E0B',
    digital_marketing:  '#10B981',
    video_editing:      '#F97316',
    data_science:       '#3B82F6',
    ui_ux_design:       '#06B6D4',
    seo:                '#6366F1',
    other:              '#94A3B8',
  };
  const color    = CATEGORY_COLORS[job.category] || '#94A3B8';
  const timeAgo  = getTimeAgo(job.createdAt);
  const category = (job.category || 'other').replace(/_/g, ' ');

  return (
    <Link to={`/jobs/${job._id}`} style={styles.cardLink}>
      <div style={styles.jobCard}>
        <div style={styles.cardTop}>
          <span style={{ ...styles.categoryPill, background: color + '18', color, border: `1px solid ${color}44` }}>
            {category}
          </span>
          <span style={styles.timeAgo}>{timeAgo}</span>
        </div>
        <h3 style={styles.jobTitle}>{job.title}</h3>
        <p style={styles.jobDesc}>{job.description?.slice(0, 120)}…</p>

        <div style={styles.skillRow}>
          {(job.skillsRequired || []).slice(0, 4).map(s => (
            <span key={s} style={styles.skillPill}>{s}</span>
          ))}
          {(job.skillsRequired || []).length > 4 && (
            <span style={{ ...styles.skillPill, background: 'transparent', color: '#475569' }}>
              +{job.skillsRequired.length - 4}
            </span>
          )}
        </div>

        <div style={styles.cardFooter}>
          <div style={styles.budget}>
            <span style={styles.budgetAmt}>
              NPR {job.budgetAmount?.toLocaleString()}
            </span>
            <span style={styles.budgetType}>{job.budgetType}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div style={{ ...styles.jobCard, cursor: 'default' }}>
      {[100, 80, 60, 40].map((w, i) => (
        <div key={i} style={{ ...styles.skeleton, width: `${w}%`, height: i === 1 ? 20 : 12, marginBottom: 10 }} />
      ))}
    </div>
  );
}

function getTimeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: { minHeight: '100vh', background: '#0B1120', fontFamily: "'DM Sans', sans-serif" },
  heroBar: { background: '#111827', borderBottom: '1px solid #1E293B', padding: '32px 24px' },
  heroInner: { maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' },
  heroText: { flexShrink: 0 },
  heroTitle: { margin: 0, fontSize: 28, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.02em' },
  heroSub: { margin: '4px 0 0', color: '#64748B', fontSize: 14 },
  searchWrap: {
    flex: 1, minWidth: 280,
    display: 'flex', alignItems: 'center',
    background: '#0B1120',
    border: '1px solid #1E293B',
    borderRadius: 10,
    padding: '0 14px',
    gap: 10,
  },
  searchIcon: { fontSize: 16, flexShrink: 0 },
  searchInput: {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    color: '#F1F5F9', fontSize: 15, padding: '13px 0',
    fontFamily: 'inherit',
  },
  clearSearch: { background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16 },

  body: { maxWidth: 1100, margin: '0 auto', padding: '24px 24px 80px' },
  mobileFilterToggle: { display: 'none', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  filterToggleBtn: {
    background: '#111827', border: '1px solid #1E293B', color: '#CBD5E1',
    borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14,
    display: 'flex', alignItems: 'center', gap: 6,
  },
  filterBadge: {
    background: '#0EA5E9', color: '#fff', borderRadius: 10,
    padding: '1px 6px', fontSize: 11, fontWeight: 700,
  },
  layout: { display: 'flex', gap: 24, alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0 },
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sortSelect: {
    background: '#111827', border: '1px solid #1E293B', color: '#CBD5E1',
    borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13,
    fontFamily: 'inherit', outline: 'none',
  },
  errorBox: { background: '#450A0A', border: '1px solid #7F1D1D', color: '#FCA5A5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  empty: { textAlign: 'center', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  resetAllBtn: {
    marginTop: 16, background: 'transparent', border: '1px solid #1E293B',
    color: '#0EA5E9', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14,
  },

  cardLink: { textDecoration: 'none' },
  jobCard: {
    background: '#111827',
    border: '1px solid #1E293B',
    borderRadius: 14,
    padding: '20px',
    cursor: 'pointer',
    transition: 'border-color 0.2s, transform 0.15s',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    ':hover': { borderColor: '#0EA5E9' },
  },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  categoryPill: { borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' },
  timeAgo: { color: '#475569', fontSize: 12 },
  jobTitle: { margin: 0, color: '#F1F5F9', fontSize: 16, fontWeight: 700, lineHeight: 1.3 },
  jobDesc: { margin: 0, color: '#64748B', fontSize: 13, lineHeight: 1.6 },
  skillRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  skillPill: {
    background: '#0F172A', border: '1px solid #1E293B',
    color: '#94A3B8', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 500,
  },
  cardFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  budget: { display: 'flex', flexDirection: 'column' },
  budgetAmt: { color: '#0EA5E9', fontSize: 14, fontWeight: 700 },
  budgetType: { color: '#475569', fontSize: 11, textTransform: 'capitalize' },

  skeleton: { background: '#1E293B', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' },

  pagination: { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 36, flexWrap: 'wrap', alignItems: 'center' },
  pageBtn: {
    background: '#111827', border: '1px solid #1E293B', color: '#94A3B8',
    borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 14,
    transition: 'all 0.15s',
    ':disabled': { opacity: 0.4, cursor: 'default' },
  },
  pageActive: { background: '#0EA5E9', border: '1px solid #0EA5E9', color: '#fff', fontWeight: 700 },
};