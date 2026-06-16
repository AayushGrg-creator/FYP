import { Link } from 'react-router-dom';
import styles from '../styles/footerPages.module.css';


// ─────────────────────────────────────────────
// ENTERPRISE
// ─────────────────────────────────────────────
export function Enterprise() {
  return (
    <div className={styles.page}>
      <nav className={styles.navbar}>
        <Link to="/" className={styles.logo}>Task<span>Tide</span></Link>
        <div className={styles.navActions}>
          <Link to="/register" className={`${styles.btn} ${styles.btnGhost}`}>Sign Up</Link>
          <Link to="/login" className={`${styles.btn} ${styles.btnPrimary}`}>Login</Link>
        </div>
      </nav>

      <div className={styles.heroBanner}>
        <h1>Task Tide for Enterprise</h1>
        <p>Scale your team with on-demand talent. Built for businesses that move fast.</p>
      </div>

      <div className={styles.content}>
        <h2 className={styles.sectionHeading}>Why Enterprises Choose Task Tide</h2>
        <p className={styles.sectionSub}>From startups to large organisations, Task Tide adapts to your scale.</p>

        <div className={styles.cardsGrid}>
          <div className={styles.card}><span className={styles.cardIcon}>🏢</span><h3>Dedicated Account Manager</h3><p>Enterprise clients get a dedicated account manager who handles sourcing, vetting, and onboarding talent on your behalf.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>👥</span><h3>Team Collaboration</h3><p>Manage multiple projects across departments with shared dashboards, unified billing, and role-based access control.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>📊</span><h3>Spend Analytics</h3><p>Track your freelance spend in real time with detailed reports, budget controls, and cost-per-project breakdowns.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>🔒</span><h3>Enhanced Security</h3><p>Enterprise accounts include mandatory NDA agreements, IP assignment clauses, and SSO integration for your team.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>⚡</span><h3>Priority Talent Access</h3><p>Enterprise clients get first access to PRO-level freelancers before they're listed publicly on the marketplace.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>💰</span><h3>Volume Pricing</h3><p>Reduced platform fees and custom billing cycles for organisations with high project volume. Contact us for a quote.</p></div>
        </div>

        <div className={styles.ctaBox}>
          <h2>Let's talk about your needs</h2>
          <p>Our enterprise team will put together a custom plan for your organisation.</p>
          <Link to="/contact" className={styles.btn}>Contact Enterprise Sales</Link>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Task Tide. All rights reserved. · <Link to="/">Back to Home</Link></p>
      </footer>
    </div>
  );
}