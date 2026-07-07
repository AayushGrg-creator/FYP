import { Link } from 'react-router-dom';
import styles from '../styles/footerPages.module.css';

export default function PaymentProtection() {
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
        <h1>Payment Protection</h1>
        <p>Your money is always safe on Task Tide. Pay only when you're 100% satisfied.</p>
      </div>

      <div className={styles.content}>
        <div className={styles.twoCol}>
          <div className={styles.twoColText}>
            <h2>How Escrow Works</h2>
            <p>When you hire a freelancer, your payment goes into our secure escrow account — not directly to the freelancer. The funds sit there safely while the work is being done.</p>
            <p>Only when you review the completed work and click "Approve" does the payment get released. If you're not happy, you can request revisions or open a dispute.</p>
            <ul className={styles.checkList}>
              <li><span className={styles.check}>✓</span> Payment held securely until work is approved</li>
              <li><span className={styles.check}>✓</span> Full refund if freelancer fails to deliver</li>
              <li><span className={styles.check}>✓</span> Milestone-based payments for large projects</li>
              <li><span className={styles.check}>✓</span> 24/7 dispute resolution team</li>
            </ul>
          </div>
          <div className={styles.twoColVisual}><br /><br /><strong style={{fontSize:'1rem', color:'#0ea5e9'}}>Your funds are protected at every step</strong></div>
        </div>

        <hr className={styles.divider} />

        <h2 className={styles.sectionHeading}>Payment Methods We Support</h2>
        <p className={styles.sectionSub}>Pay your way — global and local options available.</p>

        <div className={styles.cardsGrid}>
          <div className={styles.card}>
            <span className={styles.cardIcon}></span>
            <h3>Stripe (International)</h3>
            <p>Pay with any major credit or debit card via Stripe — Visa, Mastercard, Amex. Fully encrypted and PCI-compliant.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}></span>
            <h3>Khalti (Nepal)</h3>
            <p>Nepal-based clients can pay using Khalti wallet for fast, local transactions without international card fees.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}></span>
            <h3>Bank Transfer</h3>
            <p>Prefer traditional banking? We support direct bank transfers for verified business accounts on large projects.</p>
          </div>
        </div>

        <hr className={styles.divider} />

        <h2 className={styles.sectionHeading}>What If Something Goes Wrong?</h2>
        <p className={styles.sectionSub}>We've got your back with our full dispute resolution process.</p>

        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNum}>01</div>
            <div>
              <h3>Request a Revision</h3>
              <p>If the work isn't right, request revisions directly from the freelancer. Most issues are resolved at this stage.</p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>02</div>
            <div>
              <h3>Open a Dispute</h3>
              <p>If revisions don't resolve the issue, open a formal dispute. Our team will review all communication and deliverables.</p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>03</div>
            <div>
              <h3>Mediation & Resolution</h3>
              <p>Our dispute team mediates fairly. Depending on the outcome, funds are either released to the freelancer or refunded to you.</p>
            </div>
          </div>
        </div>

        <div className={styles.ctaBox}>
          <h2>Hire with complete confidence</h2>
          <p>Every project on Task Tide is backed by our payment protection guarantee.</p>
          <Link to="/register" className={styles.btn}>Start Hiring Safely</Link>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Task Tide. All rights reserved. · <Link to="/">Back to Home</Link></p>
      </footer>
    </div>
  );
}