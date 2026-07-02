import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function ProtectedRoute({ roles = [] }) {
  const { user, loading } = useAuth();

  // ── Still checking auth state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.spinnerWrap}>
          <div style={styles.spinner} />
          <p style={styles.spinnerText}>Loading…</p>
        </div>
      </div>
    );
  }

  // ── Not logged in → send to login ──────────────────────────────────────────
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ── Logged in but wrong role → send back to their dashboard ───────────────
  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── All checks passed → render the child route ────────────────────────────
  return <Outlet />;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  spinnerWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  spinner: {
    width: 44,
    height: 44,
    border: '4px solid rgba(255,255,255,0.25)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.75s linear infinite',
  },
  spinnerText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: 500,
    margin: 0,
  },
};