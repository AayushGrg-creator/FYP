import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

/**
 * Sidebar Component
 * Path: client/src/components/common/Sidebar.jsx
 * * Provides context-aware quick navigation side-panels for specialized role interfaces.
 * Displays corresponding action sets for Clients (Post jobs, track milestones) and 
 * Freelancers (Smart-matching, leaderboard positions).
 */
export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  // ── Dynamic Navigation Configuration Base ──
  const clientLinks = [
    { path: '/dashboard/client', label: ' Overview', exact: true },
    { path: '/jobs/post', label: ' Post a New Job' },
    { path: '/jobs/manage', label: ' My Postings' },
    { path: '/workspace', label: ' Project Workspaces' },
    { path: '/payments', label: ' Escrow Wallet' },
    { path: '/admin/disputes', label: ' Conflict Log', roleGuard: 'admin' }
  ];

  const freelancerLinks = [
    { path: '/dashboard/freelancer', label: ' Dashboard Overview', exact: true },
    { path: '/matching/recommendations', label: ' AI Smart Match' },
    { path: '/jobs', label: ' Browse Live Jobs' },
    { path: '/workspace', label: ' Active Contracts' },
    { path: '/leaderboards', label: ' Platform Rankings' },
    { path: '/payments', label: ' Earnings & Wallet' }
  ];

  // Resolve which collection to loop over based on the user session context
  const targetLinks = user.role === 'client' ? clientLinks : freelancerLinks;

  // Helper utility to flag if a link navigation item matches the router track active state
  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <aside style={styles.sidebar}>
      
      {/* ── Contextual Profile Summary Widget ── */}
      <div style={styles.profileWidget}>
        <div style={styles.avatar}>
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div style={styles.metaData}>
          <div style={styles.nameLabel}>{user.name || 'User Profile'}</div>
          <div style={styles.roleTag}>
            {user.role === 'client' ? ' Client Account' : ' Freelancer'}
          </div>
        </div>
      </div>

      <div style={styles.divider} />

      {/* ── Navigational Link Lists ── */}
      <nav style={styles.navBlock}>
        {targetLinks.map((link) => {
          // Extra layer of safety check if specific options require elevated clearance
          if (link.roleGuard && user.role !== link.roleGuard) return null;

          const currentActive = isActive(link);
          const currentLinkStyle = currentActive 
            ? { ...styles.navLink, ...styles.activeNavLink } 
            : styles.navLink;

          return (
            <Link 
              key={link.path} 
              to={link.path} 
              style={currentLinkStyle}
            >
              {currentActive && <div style={styles.activeIndicator} />}
              <span style={styles.labelSpan}>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Footer Subsystem Trust Summary ── */}
      <div style={styles.sidebarFooter}>
        <div style={styles.footerRow}>
          <span>System status:</span>
          <span style={styles.onlineStatus}>● Online</span>
        </div>
        <div style={styles.versionTag}>TaskTide Core v1.0.2</div>
      </div>

    </aside>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  sidebar: {
    width: '260px',
    minHeight: 'calc(100vh - 70px)', // Snaps flush underneath your 70px high Navbar
    background: '#ffffff',
    borderRight: '1px solid #E5E7EB',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxSizing: 'border-box',
    position: 'sticky',
    top: '70px',
    left: 0,
    zIndex: 90,
  },
  profileWidget: {
    padding: '24px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '16px',
    boxShadow: '0 4px 12px rgba(118,75,162,0.15)',
  },
  metaData: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflow: 'hidden',
  },
  nameLabel: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1E1B4B',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  roleTag: {
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: 500,
  },
  divider: {
    height: '1px',
    background: '#E5E7EB',
    margin: '0 20px',
  },
  navBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '24px 12px',
    flexGrow: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    color: '#4B5563',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '8px',
    position: 'relative',
    transition: 'all 0.2s ease',
  },
  activeNavLink: {
    background: '#F3F4F6',
    color: '#7C3AED',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '25%',
    height: '50%',
    width: '4px',
    background: '#7C3AED',
    borderRadius: '0 4px 4px 0',
  },
  labelSpan: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sidebarFooter: {
    padding: '20px',
    borderTop: '1px solid #E5E7EB',
    background: '#F9FAFB',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: 500,
  },
  onlineStatus: {
    color: '#10B981',
    fontWeight: 700,
  },
  versionTag: {
    fontSize: '11px',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: '4px',
  },
};