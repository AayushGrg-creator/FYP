import { Link } from 'react-router-dom';
import styles from '../styles/footerPages.module.css';

export default function HowToHire() {
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
        <h1>How to Hire on Task Tide</h1>
        <p>Find the perfect freelancer for your project in minutes. Here's exactly how it works.</p>
      </div>

      <div className={styles.content}>
        <h2 className={styles.sectionHeading}>The Hiring Process</h2>
        <p className={styles.sectionSub}>From posting your project to approving the final delivery — we've made it simple, safe, and fast.</p>

        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNum}>01</div>
            <div>
              <h3>Post Your Project</h3>
              <p>Describe what you need in detail — include your goals, timeline, and budget. The more specific you are, the better proposals you'll receive. Posting is completely free.</p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>02</div>
            <div>
              <h3>Review Proposals</h3>
              <p>Freelancers will submit proposals within hours. Browse their profiles, portfolios, ratings, and pricing. Shortlist the ones that stand out.</p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>03</div>
            <div>
              <h3>Interview & Select</h3>
              <p>Chat directly with candidates using our built-in messaging. Ask questions, clarify requirements, and choose the freelancer you trust most.</p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>04</div>
            <div>
              <h3>Fund the Milestone</h3>
              <p>Deposit your payment into our secure escrow. Your money is held safely — the freelancer only gets paid once you approve the work.</p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>05</div>
            <div>
              <h3>Collaborate & Approve</h3>
              <p>Work closely with your freelancer, provide feedback, and request revisions as needed. When you're fully satisfied, release the payment.</p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>06</div>
            <div>
              <h3>Leave a Review</h3>
              <p>Rate your experience and help other clients make great hiring decisions. Build a lasting relationship with freelancers you trust.</p>
            </div>
          </div>
        </div>

        <hr className={styles.divider} />

        <h2 className={styles.sectionHeading}>Why Hire on Task Tide?</h2>
        <p className={styles.sectionSub}>We built every feature with clients in mind.</p>

        <div className={styles.cardsGrid}>
          <div className={styles.card}>
            <span className={styles.cardIcon}>🔒</span>
            <h3>Secure Escrow Payments</h3>
            <p>Your money is only released when you approve the work. No risk, no stress — complete payment protection on every project.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}>⭐</span>
            <h3>Verified Reviews</h3>
            <p>Every rating on Task Tide comes from a real, completed project. No fake reviews — just honest feedback from real clients.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}>🤖</span>
            <h3>Smart Matching</h3>
            <p>Our AI-powered matching engine suggests the best freelancers for your specific project based on skills, history, and ratings.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}>💬</span>
            <h3>Real-Time Messaging</h3>
            <p>Communicate instantly with freelancers using our built-in chat — no need for external email or third-party tools.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}>🛡️</span>
            <h3>Dispute Resolution</h3>
            <p>If something goes wrong, our 24/7 support team steps in to mediate and resolve disputes fairly for both parties.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}>📄</span>
            <h3>IP & NDA Protection</h3>
            <p>All work produced belongs to you. Optional NDA agreements are available to keep your project fully confidential.</p>
          </div>
        </div>

        <div className={styles.ctaBox}>
          <h2>Ready to find your perfect freelancer?</h2>
          <p>Post your project for free and get proposals within hours.</p>
          <Link to="/register" className={styles.btn}>Post a Project — It's Free</Link>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Task Tide. All rights reserved. · <Link to="/">Back to Home</Link></p>
      </footer>
    </div>
  );
}