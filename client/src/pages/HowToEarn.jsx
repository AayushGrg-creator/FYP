import { Link } from 'react-router-dom';
import styles from '../styles/footerPages.module.css';

export default function HowToEarn() {
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
        <h1>How to Earn on Task Tide</h1>
        <p>Turn your skills into income. Join 50,000+ freelancers already earning on Task Tide.</p>
      </div>

      <div className={styles.content}>
        <h2 className={styles.sectionHeading}>Start Earning in 4 Steps</h2>
        <p className={styles.sectionSub}>Getting started is free and takes less than 10 minutes.</p>

        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNum}>01</div>
            <div>
              <h3>Create Your Profile</h3>
              <p>Sign up for free and build a compelling profile. Add your skills, experience, portfolio samples, and an hourly rate. A strong profile gets 3× more clients.</p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>02</div>
            <div>
              <h3>Create Gigs or Browse Jobs</h3>
              <p>List your services as gigs (clients come to you) or actively browse posted projects and submit proposals. Both methods work — top freelancers do both.</p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>03</div>
            <div>
              <h3>Win Projects & Deliver</h3>
              <p>Communicate clearly, set realistic deadlines, and deliver high-quality work. Your reputation is your biggest asset — every review shapes your future earnings.</p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>04</div>
            <div>
              <h3>Get Paid Securely</h3>
              <p>Once the client approves your work, payment is released instantly from escrow to your Task Tide wallet. Withdraw via bank transfer, Khalti, or Stripe anytime.</p>
            </div>
          </div>
        </div>

        <hr className={styles.divider} />

        <h2 className={styles.sectionHeading}>What You Can Offer</h2>
        <p className={styles.sectionSub}>Task Tide supports freelancers across every major skill category.</p>

        <div className={styles.cardsGrid}>
          <div className={styles.card}>
            <span className={styles.cardIcon}></span>
            <h3>Design & Creative</h3>
            <p>Logo design, UI/UX, illustration, branding, social media graphics, and more.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}></span>
            <h3>Development</h3>
            <p>Web apps, mobile apps, APIs, e-commerce stores, WordPress, and full-stack projects.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}></span>
            <h3>Writing & Copy</h3>
            <p>Blog posts, SEO content, copywriting, technical writing, and proofreading.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}></span>
            <h3>Digital Marketing</h3>
            <p>SEO, social media management, PPC ads, email campaigns, and analytics.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}></span>
            <h3>Video & Animation</h3>
            <p>Video editing, motion graphics, explainer videos, and YouTube content.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}></span>
            <h3>AI Services</h3>
            <p>Prompt engineering, AI model fine-tuning, chatbot development, and automation.</p>
          </div>
        </div>

        <div className={styles.twoCol}>
          <div className={styles.twoColText}>
            <h2>Freelancer-Friendly Fees</h2>
            <p>We believe you should keep more of what you earn. Task Tide charges a simple, transparent service fee — no hidden charges, no surprises.</p>
            <ul className={styles.checkList}>
              <li><span className={styles.check}>✓</span> Free to sign up and create your profile</li>
              <li><span className={styles.check}>✓</span> Low platform fee — only charged on successful projects</li>
              <li><span className={styles.check}>✓</span> Fee decreases as your lifetime earnings grow</li>
              <li><span className={styles.check}>✓</span> Instant withdrawal to Khalti or bank account</li>
            </ul>
          </div>
          
        </div>

        <div className={styles.ctaBox}>
          <h2>Ready to start earning?</h2>
          <p>Create your free freelancer profile today and start winning projects.</p>
          <Link to="/register" className={styles.btn}>Become a Freelancer — Free</Link>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Task Tide. All rights reserved. · <Link to="/">Back to Home</Link></p>
      </footer>
    </div>
  );
}