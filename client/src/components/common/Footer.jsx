import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Footer Component
 * Path: client/src/components/common/Footer.jsx
 * * Provides structural dynamic map links, language/currency indicators,
 * and social metadata handles matching the TaskTide core architecture.
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={styles.footer}>
      {/* ── Top Section: Main Navigation Links ── */}
      <div style={styles.topSection}>
        <div style={styles.grid}>
          
          {/* Column 1: Categories */}
          <div style={styles.column}>
            <h4 style={styles.columnTitle}>Categories</h4>
            <ul style={styles.linkList}>
              <li><Link to="/jobs?category=graphics" style={styles.link}>Graphics & Design</Link></li>
              <li><Link to="/jobs?category=programming" style={styles.link}>Programming & Tech</Link></li>
              <li><Link to="/jobs?category=writing" style={styles.link}>Writing & Translation</Link></li>
              <li><Link to="/jobs?category=video" style={styles.link}>Video & Animation</Link></li>
              <li><Link to="/jobs?category=marketing" style={styles.link}>Digital Marketing</Link></li>
            </ul>
          </div>

          {/* Column 2: About */}
          <div style={styles.column}>
            <h4 style={styles.columnTitle}>About</h4>
            <ul style={styles.linkList}>
              <li><Link to="/about" style={styles.link}>Careers</Link></li>
              <li><Link to="/press" style={styles.link}>Press & News</Link></li>
              <li><Link to="/partnerships" style={styles.link}>Partnerships</Link></li>
              <li><Link to="/privacy-policy" style={styles.link}>Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" style={styles.link}>Terms of Service</Link></li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div style={styles.column}>
            <h4 style={styles.columnTitle}>Support</h4>
            <ul style={styles.linkList}>
              <li><Link to="/help" style={styles.link}>Help & Support</Link></li>
              <li><Link to="/trust-safety" style={styles.link}>Trust & Safety</Link></li>
              <li><Link to="/leaderboards" style={styles.link}>Freelancer Leaderboard</Link></li>
              <li><Link to="/payments-info" style={styles.link}>Escrow Payments</Link></li>
            </ul>
          </div>

          {/* Column 4: Trust Architecture */}
          <div style={styles.column}>
            <h4 style={styles.columnTitle}>Trust Subsystem</h4>
            <p style={styles.trustText}>
              TaskTide employs a verified internal trust assessment framework incorporating mathematical score weights, badges, and automated skill validation parameters to secure regional transactions.
            </p>
            <div style={styles.badgeRow}>
              <span style={styles.miniBadge}>✓ Escrow Protected</span>
              <span style={styles.miniBadge}>★ Top Rated</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Bottom Section: Core Branding & Settings ── */}
      <div style={styles.bottomSection}>
        <div style={styles.bottomContainer}>
          
          {/* Logo and Copyright */}
          <div style={styles.logoRow}>
            <div style={styles.brand}>
              Task <span style={styles.brandAccent}>Tide</span>
            </div>
            <span style={styles.copyright}>
              © {currentYear} TaskTide Inc. All rights reserved.
            </span>
          </div>

          {/* Preferences & Socials */}
          <div style={styles.metaRow}>
            {/* Preferences */}
            <div style={styles.preferences}>
              <div style={styles.prefItem}>
                <span style={styles.prefIcon}>🌐</span>
                <span>English</span>
              </div>
              <div style={styles.prefItem}>
                <span style={styles.prefIcon}>🇳🇵</span>
                <span>NPR (Rs.)</span>
              </div>
            </div>

            {/* Social Icons Placeholder */}
            <div style={styles.socials}>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" style={styles.socialLink}>𝕏</a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" style={styles.socialLink}>Facebook</a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={styles.socialLink}>LinkedIn</a>
              <a href="https://github.com" target="_blank" rel="noreferrer" style={styles.socialLink}>GitHub</a>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  footer: {
    background: '#ffffff',
    borderTop: '1px solid #E5E7EB',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    color: '#4B5563',
    width: '100%',
    boxSizing: 'border-box',
  },
  topSection: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '64px 24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 40,
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  columnTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#1E1B4B',
  },
  linkList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  link: {
    color: '#6B7280',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    transition: 'color 0.2s',
  },
  trustText: {
    margin: 0,
    fontSize: 13,
    lineHeight: '1.6',
    color: '#6B7280',
  },
  badgeRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  miniBadge: {
    background: '#F3F4F6',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 600,
    color: '#374151',
  },
  bottomSection: {
    borderTop: '1px solid #E5E7EB',
    background: '#F9FAFB',
    padding: '24px',
  },
  bottomContainer: {
    maxWidth: 1200,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 24,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  brand: {
    fontSize: 20,
    fontWeight: 800,
    color: '#1E1B4B',
    letterSpacing: '-0.03em',
    userSelect: 'none',
  },
  brandAccent: {
    color: '#F59E0B',
  },
  copyright: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 32,
    flexWrap: 'wrap',
  },
  preferences: {
    display: 'flex',
    gap: 16,
  },
  prefItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: '#4B5563',
    cursor: 'pointer',
  },
  prefIcon: {
    fontSize: 14,
  },
  socials: {
    display: 'flex',
    gap: 16,
  },
  socialLink: {
    color: '#9CA3AF',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 600,
    transition: 'color 0.2s',
  },
};