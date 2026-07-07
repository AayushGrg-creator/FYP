import { Link } from 'react-router-dom';
import styles from '../styles/footerPages.module.css';

export default function SellerLevels() {
  return (
    <div className={styles.page}>
      <nav className={styles.navbar}>
<img
    src="/logo.png"
    alt="TaskTide Logo"
    style={{ height: '55px', width: 'auto', objectFit: 'contain', marginRight: '8px' }}
  />
        <div className={styles.navActions}>
          <Link to="/register" className={`${styles.btn} ${styles.btnGhost}`}>Sign Up</Link>
          <Link to="/login" className={`${styles.btn} ${styles.btnPrimary}`}>Login</Link>
        </div>
      </nav>

      <div className={styles.heroBanner}>
        <h1>Seller Levels</h1>
        <p>The more you deliver, the more you earn. Our level system rewards quality and consistency.</p>
      </div>

      <div className={styles.content}>
        <h2 className={styles.sectionHeading}>How Levels Work</h2>
        <p className={styles.sectionSub}>Your seller level rises automatically based on your performance, completed projects, and ratings. Higher levels unlock better visibility and perks.</p>

        <div className={styles.cardsGrid}>
          <div className={styles.card}>
            <span className={styles.cardIcon}>🌱</span>
            <h3>New Seller <span className={`${styles.badge} ${styles.badgeBlue}`}>Level 0</span></h3>
            <p>Every journey starts here. Complete your profile fully, deliver your first project, and you're on your way up.</p>
            <br />
            <strong style={{color:'#0ea5e9', fontSize:'0.85rem'}}>Requirements: Profile complete · Account verified</strong>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}>⭐</span>
            <h3>Rising Seller <span className={`${styles.badge} ${styles.badgeGreen}`}>Level 1</span></h3>
            <p>You've proven yourself. Clients trust you and your gigs appear more prominently in search results.</p>
            <br />
            <strong style={{color:'#0ea5e9', fontSize:'0.85rem'}}>Requirements: 10 orders · 4.5+ rating · 60-day activity</strong>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}>🏆</span>
            <h3>Top Seller <span className={`${styles.badge} ${styles.badgeAmber}`}>Level 2</span></h3>
            <p>You're among the best. Premium placement, priority support, and access to high-value enterprise clients.</p>
            <br />
            <strong style={{color:'#0ea5e9', fontSize:'0.85rem'}}>Requirements: 50 orders · 4.8+ rating · 120-day activity</strong>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}>👑</span>
            <h3>Pro Seller <span className={`${styles.badge} ${styles.badgePurple}`}>PRO</span></h3>
            <p>Invitation only. Pro sellers are hand-vetted by our team and represent the top 1% of talent on Task Tide.</p>
            <br />
            <strong style={{color:'#0ea5e9', fontSize:'0.85rem'}}>Requirements: Vetted by Task Tide team · Elite track record</strong>
          </div>
        </div>

        <hr className={styles.divider} />

        <h2 className={styles.sectionHeading}>Level Benefits Comparison</h2>
        <p className={styles.sectionSub}>See exactly what each level unlocks for you.</p>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Benefit</th>
              <th>New Seller</th>
              <th>Level 1</th>
              <th>Level 2</th>
              <th>PRO</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Active Gigs</td><td>5</td><td>10</td><td>20</td><td>Unlimited</td></tr>
            <tr><td>Gig Extras</td><td>—</td><td>✓</td><td>✓</td><td>✓</td></tr>
            <tr><td>Priority Support</td><td>—</td><td>—</td><td>✓</td><td>✓</td></tr>
            <tr><td>Featured in Search</td><td>—</td><td>Occasional</td><td>Frequent</td><td>Always</td></tr>
            <tr><td>Enterprise Access</td><td>—</td><td>—</td><td>—</td><td>✓</td></tr>
            <tr><td>PRO Badge</td><td>—</td><td>—</td><td>—</td><td>✓</td></tr>
            <tr><td>Reduced Platform Fee</td><td>Standard</td><td>Standard</td><td>Reduced</td><td>Lowest</td></tr>
          </tbody>
        </table>

        <div className={styles.ctaBox}>
          <h2>Start climbing the ranks today</h2>
          <p>Create your seller profile for free and begin your journey to Pro.</p>
          <Link to="/register" className={styles.btn}>Create Seller Profile</Link>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Task Tide. All rights reserved. · <Link to="/">Back to Home</Link></p>
      </footer>
    </div>
  );
}