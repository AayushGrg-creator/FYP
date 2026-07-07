import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

/**
 * Navbar Component
 * Path: client/src/components/common/Navbar.jsx
 * * Provides responsive global header actions, role-specific navigational pathways,
 * and profile dropdown states matching TaskTide's core architectural layout.
 */
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout operation encountered an unexpected error:', err);
    }
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        
        {/* ── Brand Layout Left Segment ── */}
        <Link to="/" style={styles.logoLink}>
          <img src="/logo.png" alt="TaskTide logo" style={styles.logoImg} />
          <div style={styles.brand}>
            Task <span style={styles.brandAccent}>Tide</span>
          </div>
        </Link>

        {/* ── Central Nav Elements (Contextual Links) ── */}
        <div style={styles.navLinks}>
          <Link to="/jobs" style={styles.navLink}>Browse Jobs</Link>
          <Link to="/leaderboards" style={styles.navLink}>Leaderboard</Link>
          {user && (
            <Link 
              to={user.role === 'client' ? '/dashboard/client' : '/dashboard/freelancer'} 
              style={styles.navLink}
            >
              Dashboard
            </Link>
          )}
        </div>

        {/* ── Right System Actions Segment ── */}
        <div style={styles.actions}>
          {user ? (
            <div style={styles.authActions}>
              
              {/* Notification Badge Indicator */}
              <Link to="/workspace" style={styles.iconBtn} title="Project Workspace">
                <span style={styles.icon}>💬</span>
              </Link>

              {/* User Dynamic Interface Module Toggle */}
              <div style={styles.profileMenuWrap}>
                <button 
                  onClick={() => setShowDropdown(!showDropdown)} 
                  style={styles.profileToggleBtn}
                >
                  <div style={styles.avatarPlaceholder}>
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span style={styles.userName}>{user.name || 'Account'}</span>
                  <span style={styles.chevron}>▾</span>
                </button>

                {/* Dropdown Menu Overlay */}
                {showDropdown && (
                  <>
                    <div style={styles.backdrop} onClick={() => setShowDropdown(false)} />
                    <div style={styles.dropdown}>
                      <div style={styles.dropdownHeader}>
                        <div style={styles.userEmail}>{user.email}</div>
                        <span style={styles.roleBadge}>{user.role?.toUpperCase()}</span>
                      </div>
                      
                      <div style={styles.divider} />
                      
                      <Link 
                        to="/profile" 
                        style={styles.dropdownItem}
                        onClick={() => setShowDropdown(false)}
                      >
                        👤 My Profile
                      </Link>
                      <Link 
                        to="/payments" 
                        style={styles.dropdownItem}
                        onClick={() => setShowDropdown(false)}
                      >
                        💳 Wallet & Escrow
                      </Link>
                      
                      <div style={styles.divider} />
                      
                      <button 
                        onClick={() => { setShowDropdown(false); handleLogout(); }} 
                        style={styles.logoutBtn}
                      >
                        🚪 Log Out
                      </button>
                    </div>
                  </>
                )}
              </div>

            </div>
          ) : (
            // Unauthenticated Link Blocks
            <div style={styles.guestActions}>
              <Link to="/login" style={styles.loginLink}>Sign In</Link>
              <Link to="/register" style={styles.registerBtn}>Join</Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  nav: {
    height: '70px',
    background: '#ffffff',
    borderBottom: '1px solid #E5E7EB',
    display: 'flex',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxSizing: 'border-box',
    width: '100%',
  },
  container: {
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoLink: {
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoImg: {
    height: '32px',
    width: 'auto',
    display: 'block',
  },
  brand: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#1E1B4B',
    letterSpacing: '-0.03em',
    userSelect: 'none',
  },
  brandAccent: {
    color: '#F59E0B',
  },
  navLinks: {
    display: 'flex',
    gap: '28px',
    alignItems: 'center',
  },
  navLink: {
    textDecoration: 'none',
    color: '#4B5563',
    fontSize: '15px',
    fontWeight: 500,
    transition: 'color 0.2s',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
  },
  guestActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  loginLink: {
    textDecoration: 'none',
    color: '#4B5563',
    fontWeight: 600,
    fontSize: '15px',
  },
  registerBtn: {
    textDecoration: 'none',
    color: '#7C3AED',
    border: '1.5px solid #7C3AED',
    padding: '8px 18px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '15px',
    transition: 'all 0.2s',
  },
  authActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  iconBtn: {
    textDecoration: 'none',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  },
  profileMenuWrap: {
    position: 'relative',
  },
  profileToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    fontFamily: 'inherit',
  },
  avatarPlaceholder: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '15px',
  },
  userName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#374151',
  },
  chevron: {
    color: '#9CA3AF',
    fontSize: '12px',
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    marginTop: '12px',
    width: '220px',
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    border: '1px solid #E5E7EB',
    padding: '8px 0',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
  },
  dropdownHeader: {
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  userEmail: {
    fontSize: '13px',
    color: '#6B7280',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  roleBadge: {
    fontSize: '10px',
    fontWeight: 700,
    background: '#F3F4F6',
    color: '#374151',
    padding: '2px 6px',
    borderRadius: '4px',
    alignSelf: 'flex-start',
    letterSpacing: '0.03em',
  },
  divider: {
    height: '1px',
    background: '#E5E7EB',
    margin: '6px 0',
  },
  dropdownItem: {
    padding: '10px 16px',
    color: '#4B5563',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  logoutBtn: {
    padding: '10px 16px',
    color: '#DC2626',
    background: 'none',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    textAlign: 'left',
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'inherit',
    transition: 'background 0.2s',
  },
};