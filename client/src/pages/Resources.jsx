import { Link } from 'react-router-dom';
import styles from '../styles/footerPages.module.css';


// ─────────────────────────────────────────────
// RESOURCES
// ─────────────────────────────────────────────
export function Resources() {
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
        <h1>Freelancer Resources</h1>
        <p>Everything you need to grow your freelance career — guides, tips, and tools.</p>
      </div>

      <div className={styles.content}>
        <h2 className={styles.sectionHeading}>Getting Started Guides</h2>
        <p className={styles.sectionSub}>New to Task Tide? These guides will get you up and running fast.</p>

        <div className={styles.cardsGrid}>
          <div className={styles.card}><span className={styles.cardIcon}>📝</span><h3>How to Write a Winning Proposal</h3><p>Learn how to craft proposals that stand out from the crowd and convert clients — with real examples and templates.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>🖼️</span><h3>Building a Portfolio That Gets Hired</h3><p>Your portfolio is your storefront. Find out what clients actually look for and how to showcase your best work.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>💰</span><h3>How to Price Your Services</h3><p>Undercharging is as damaging as overcharging. Use our rate calculator and guidelines to price with confidence.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>⭐</span><h3>Getting Your First 5-Star Review</h3><p>First impressions matter. Follow this checklist to nail your first project and earn a review that opens doors.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>📈</span><h3>Scaling From Side Hustle to Full-Time</h3><p>Ready to go full-time freelance? This guide covers finances, client pipelines, and making the leap safely.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>🤝</span><h3>Managing Client Relationships</h3><p>Communication, feedback, and boundaries — how to keep clients happy and coming back for more.</p></div>
        </div>

        <div className={styles.ctaBox}>
          <h2>Put these resources to work</h2>
          <p>Create your free profile and start applying everything you've learned.</p>
          <Link to="/register" className={styles.btn}>Start Freelancing</Link>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Task Tide. All rights reserved. · <Link to="/">Back to Home</Link></p>
      </footer>
    </div>
  );
}