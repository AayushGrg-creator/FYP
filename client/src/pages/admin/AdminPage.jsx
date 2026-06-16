import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import styles from './admin.module.css';

/* ─── Stat card ──────────────────────────────────────────────────── */
function StatCard({ label, value, sub, accent }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={accent ? { color: accent } : {}}>
        {value ?? '—'}
      </div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const [overview,  setOverview]  = useState(null);
  const [report,    setReport]    = useState(null);
  const [users,     setUsers]     = useState([]);
  const [search,    setSearch]    = useState('');
  const [roleFilter,setRole]      = useState('');
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('overview');
  const [banModal,  setBanModal]  = useState(null);   // { user, banned }
  const [banReason, setBanReason] = useState('');
  const [actionMsg, setMsg]       = useState('');

  /* ── Fetch data ── */
  const fetchOverview = useCallback(async () => {
    try {
      const [ovRes, rpRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/reports/summary'),
      ]);
      setOverview(ovRes.data.overview);
      setReport(rpRes.data.report);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: 30 });
      if (search)     params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const res = await api.get(`/admin/users?${params}`);
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOverview(), fetchUsers()]).finally(() => setLoading(false));
  }, [fetchOverview, fetchUsers]);

  /* ── Ban toggle ── */
  const confirmBan = async () => {
    if (!banModal) return;
    try {
      await api.patch(`/admin/users/${banModal.user._id}/ban`, {
        banned: !banModal.user.isBanned,
        reason: banReason,
      });
      setMsg(`User ${banModal.user.isBanned ? 'unbanned' : 'banned'} successfully`);
      setBanModal(null);
      setBanReason('');
      fetchUsers();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Action failed');
    }
    setTimeout(() => setMsg(''), 3500);
  };

  const ov = overview;

  return (
    <div className={styles.page}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <Link to="/" className={styles.logo}>Task<span>Tide</span></Link>
          <span className={styles.adminTag}>ADMIN</span>
        </div>
        <nav className={styles.sidebarNav}>
          {[
            { key: 'overview',  icon: '📊', label: 'Overview'    },
            { key: 'users',     icon: '👥', label: 'Users'       },
            { key: 'disputes',  icon: '⚖️', label: 'Disputes',   link: '/admin/disputes' },
            { key: 'escrow',    icon: '🔒', label: 'Escrow'      },
            { key: 'reports',   icon: '📈', label: 'Reports'     },
          ].map(({ key, icon, label, link }) => (
            link
              ? <Link key={key} to={link} className={styles.navLink}><span>{icon}</span>{label}</Link>
              : (
                <button
                  key={key}
                  className={`${styles.navLink} ${tab === key ? styles.navActive : ''}`}
                  onClick={() => setTab(key)}
                >
                  <span>{icon}</span>{label}
                </button>
              )
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <span className={styles.adminName}>{user?.firstName} {user?.lastName}</span>
          <button className={styles.logoutBtn} onClick={() => { logout(); navigate('/login'); }}>
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className={styles.main}>
        {/* Toast */}
        {actionMsg && <div className={styles.toast}>{actionMsg}</div>}

        {/* ══ OVERVIEW TAB ══ */}
        {tab === 'overview' && (
          <>
            <div className={styles.pageHeader}>
              <div>
                <h1>Admin Overview</h1>
                <p>Platform health at a glance</p>
              </div>
            </div>

            {loading ? (
              <div className={styles.loading}>Loading…</div>
            ) : (
              <>
                {/* Stats grid */}
                <div className={styles.statsGrid}>
                  <StatCard label="Total Users"    value={ov?.users?.total}       sub={`${ov?.users?.freelancers} freelancers · ${ov?.users?.clients} clients`} />
                  <StatCard label="Active Projects" value={ov?.projects?.active}  sub={`${ov?.projects?.total} total`} />
                  <StatCard label="Open Disputes"   value={ov?.disputes?.open}    accent="#ef4444" sub={`${ov?.disputes?.escalated} escalated`} />
                  <StatCard label="Escrow (NPR)"    value={ov?.escrowHeld?.NPR ? `NPR ${ov.escrowHeld.NPR.toLocaleString()}` : 'NPR 0'} accent="#10b981" />
                  <StatCard label="Banned Users"    value={ov?.users?.banned}     accent="#f59e0b" />
                  <StatCard label="Resolved Disputes" value={ov?.disputes?.resolved} />
                </div>

                {/* Report strip */}
                {report && (
                  <div className={styles.reportStrip}>
                    <div className={styles.reportCard}>
                      <div className={styles.reportLabel}>New Users (30d)</div>
                      <div className={styles.reportValue}>{report.newUsersThisMonth}</div>
                    </div>
                    <div className={styles.reportCard}>
                      <div className={styles.reportLabel}>Disputes (30d)</div>
                      <div className={styles.reportValue}>{report.disputesThisMonth}</div>
                    </div>
                    {report.transactionVolume?.map((tv) => (
                      <div key={tv._id} className={styles.reportCard}>
                        <div className={styles.reportLabel}>Volume {tv._id} (30d)</div>
                        <div className={styles.reportValue}>{tv._id} {tv.totalVolume?.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent signups */}
                <div className={styles.section}>
                  <div className={styles.sectionHead}>
                    <h3>Recent Signups</h3>
                    <button className={styles.viewAll} onClick={() => setTab('users')}>View all →</button>
                  </div>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Name</th><th>Email</th><th>Role</th>
                          <th>Trust</th><th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview?.recentSignups?.map((u) => (
                          <tr key={u._id}>
                            <td>{u.firstName} {u.lastName}</td>
                            <td>{u.email}</td>
                            <td><span className={`${styles.badge} ${styles[`role_${u.role}`]}`}>{u.role}</span></td>
                            <td>{u.trustScore ?? '—'}</td>
                            <td>
                              {u.isBanned
                                ? <span className={styles.bannedBadge}>Banned</span>
                                : <span className={styles.activeBadge}>Active</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top freelancers */}
                {report?.topFreelancers?.length > 0 && (
                  <div className={styles.section}>
                    <div className={styles.sectionHead}><h3>Top Freelancers by Trust Score</h3></div>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead><tr><th>Name</th><th>Email</th><th>Trust Score</th></tr></thead>
                        <tbody>
                          {report.topFreelancers.map((f) => (
                            <tr key={f._id}>
                              <td>{f.firstName} {f.lastName}</td>
                              <td>{f.email}</td>
                              <td>
                                <span style={{ color: '#10b981', fontWeight: 700 }}>{f.trustScore}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ══ USERS TAB ══ */}
        {tab === 'users' && (
          <>
            <div className={styles.pageHeader}>
              <div><h1>User Management</h1></div>
              <div className={styles.filters}>
                <input
                  className={styles.searchInput}
                  placeholder="Search name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  className={styles.filterSelect}
                  value={roleFilter}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="freelancer">Freelancer</option>
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Role</th>
                    <th>Trust</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className={u.isBanned ? styles.bannedRow : ''}>
                      <td>{u.firstName} {u.lastName}</td>
                      <td>{u.email}</td>
                      <td><span className={`${styles.badge} ${styles[`role_${u.role}`]}`}>{u.role}</span></td>
                      <td>{u.trustScore ?? '—'}</td>
                      <td>
                        {u.isBanned
                          ? <span className={styles.bannedBadge}>Banned</span>
                          : <span className={styles.activeBadge}>Active</span>}
                      </td>
                      <td>
                        {u.role !== 'admin' && (
                          <button
                            className={u.isBanned ? styles.unbanBtn : styles.banBtn}
                            onClick={() => setBanModal({ user: u })}
                          >
                            {u.isBanned ? 'Unban' : 'Ban'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} className={styles.emptyCell}>No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ══ REPORTS TAB ══ */}
        {tab === 'reports' && (
          <>
            <div className={styles.pageHeader}><h1>Reports &amp; Analytics</h1></div>
            {report ? (
              <div className={styles.statsGrid}>
                <StatCard label="New Users (30d)"       value={report.newUsersThisMonth} />
                <StatCard label="New Disputes (30d)"    value={report.disputesThisMonth} accent="#f59e0b" />
                {report.transactionVolume?.map((tv) => (
                  <StatCard
                    key={tv._id}
                    label={`Volume ${tv._id} (30d)`}
                    value={`${tv._id} ${tv.totalVolume?.toLocaleString()}`}
                    sub={`${tv.count} transactions`}
                    accent="#10b981"
                  />
                ))}
              </div>
            ) : (
              <div className={styles.loading}>Loading report…</div>
            )}
          </>
        )}

        {/* ══ ESCROW TAB ══ */}
        {tab === 'escrow' && (
          <>
            <div className={styles.pageHeader}><h1>Escrow Management</h1></div>
            <div className={styles.statsGrid}>
              <StatCard label="Total Held (NPR)"    value={`NPR ${ov?.escrowHeld?.NPR?.toLocaleString() ?? 0}`} accent="#10b981" />
              <StatCard label="Total Held (USD)"    value={`USD ${ov?.escrowHeld?.USD?.toLocaleString() ?? 0}`} accent="#3b82f6" />
            </div>
            <div className={styles.infoBox}>
              To release or refund escrow for a specific project, navigate to the{' '}
              <Link to="/admin/disputes" className={styles.inlineLink}>Dispute Queue</Link>{' '}
              and use the resolve action, or use the project detail page.
            </div>
          </>
        )}
      </main>

      {/* ── Ban confirmation modal ── */}
      {banModal && (
        <div className={styles.modalOverlay} onClick={() => setBanModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>{banModal.user.isBanned ? 'Unban' : 'Ban'} User</h3>
            <p>
              {banModal.user.isBanned
                ? `Restore access for ${banModal.user.firstName} ${banModal.user.lastName}?`
                : `Ban ${banModal.user.firstName} ${banModal.user.lastName}? This will prevent them from logging in.`}
            </p>
            {!banModal.user.isBanned && (
              <textarea
                className={styles.reasonInput}
                placeholder="Reason for ban (optional)…"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
              />
            )}
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setBanModal(null)}>Cancel</button>
              <button
                className={banModal.user.isBanned ? styles.unbanBtn : styles.banBtn}
                onClick={confirmBan}
              >
                Confirm {banModal.user.isBanned ? 'Unban' : 'Ban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}