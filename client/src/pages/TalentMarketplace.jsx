import { Link } from 'react-router-dom';
import styles from '../styles/footerPages.module.css';

// ─────────────────────────────────────────────
// TALENT MARKETPLACE
// ─────────────────────────────────────────────
export function TalentMarketplace() {
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
        <h1>Talent Marketplace</h1>
        <p>Browse 50,000+ vetted freelancers across every skill category. Find your match in minutes.</p>
      </div>

      <div className={styles.content}>
        <h2 className={styles.sectionHeading}>How to Find the Right Freelancer</h2>
        <p className={styles.sectionSub}>Our marketplace makes it easy to discover, compare, and hire top talent.</p>

        <div className={styles.cardsGrid}>
          <div className={styles.card}><span className={styles.cardIcon}></span><h3>Smart Search</h3><p>Filter by skill, budget, rating, location, and availability. Our AI-powered search surfaces the most relevant talent instantly.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}></span><h3>Detailed Profiles</h3><p>Every freelancer profile shows their skills, portfolio, completed projects, ratings, and response time so you can decide with confidence.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}></span><h3>Chat Before You Hire</h3><p>Message freelancers directly before committing. Clarify scope, ask questions, and get a feel for their communication style.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}></span><h3>Quick Hire</h3><p>See a gig you love? Buy it instantly. No negotiations needed — just pick your package and get started today.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}></span><h3>AI Matching</h3><p>Post your project and let our TF-IDF matching engine automatically suggest the freelancers most likely to succeed on your work.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}></span><h3>Top-Rated Filter</h3><p>Filter exclusively for Level 2 and PRO freelancers for mission-critical work where quality is non-negotiable.</p></div>
        </div>

        <div className={styles.ctaBox}>
          <h2>Browse the marketplace now</h2>
          <p>Sign up free and explore thousands of talented freelancers today.</p>
          <Link to="/register" className={styles.btn}>Explore Talent</Link>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Task Tide. All rights reserved. · <Link to="/">Back to Home</Link></p>
      </footer>
    </div>
  );
}