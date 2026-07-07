import { Link } from 'react-router-dom';
import styles from '../styles/footerPages.module.css';

export default function AboutUs() {
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
        <h1>About Task Tide</h1>
        <p>We're building the future of work — one project at a time.</p>
      </div>

      <div className={styles.content}>
        <div className={styles.twoCol}>
          <div className={styles.twoColText}>
            <h2>Our Story</h2>
            <p>Task Tide was born out of a simple frustration: finding reliable freelance talent was too slow, too risky, and too complicated. Clients wasted hours vetting unreliable profiles. Talented freelancers struggled to get discovered.</p>
            <p>We set out to fix that. By combining smart matching technology, secure escrow payments, and a community built on trust, Task Tide became the platform where real work gets done — fast, safely, and at any scale.</p>
            <p>Today, over 50,000 freelancers and thousands of businesses use Task Tide every day to build products, grow brands, and get things done.</p>
          </div>
          <div className={styles.twoColVisual}><br /><br /><strong style={{fontSize:'1rem', color:'#0ea5e9'}}>Ride the tide of opportunity</strong></div>
        </div>

        <hr className={styles.divider} />

        <h2 className={styles.sectionHeading}>Our Mission</h2>
        <p className={styles.sectionSub}>To make skilled work accessible to everyone, everywhere — and to ensure every freelancer is treated and paid fairly.</p>

        <div className={styles.cardsGrid}>
          <div className={styles.card}>
            <span className={styles.cardIcon}></span>
            <h3>Trust First</h3>
            <p>Every feature we build — escrow, verified reviews, dispute resolution — is designed to protect both clients and freelancers. Trust is our foundation.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}></span>
            <h3>Global Reach</h3>
            <p>Task Tide connects talent across borders. Whether you're in Kathmandu or New York, great work has no geography.</p>
          </div>
          <div className={styles.card}>
            <span className={styles.cardIcon}></span>
            <h3>Speed & Simplicity</h3>
            <p>We obsess over removing friction. Post a project, get proposals, hire, pay — the whole process in hours, not days.</p>
          </div>
        </div>

        <hr className={styles.divider} />

        <h2 className={styles.sectionHeading}>Task Tide by the Numbers</h2>
        <p className={styles.sectionSub}>Growing fast, and just getting started.</p>

        <div className={styles.cardsGrid}>
          <div className={styles.card} style={{textAlign:'center'}}>
            <span style={{fontSize:'2.5rem', fontWeight:'800', color:'#0ea5e9', display:'block'}}>50K+</span>
            <h3>Active Freelancers</h3>
            <p>Verified professionals ready to take on your next project.</p>
          </div>
          <div className={styles.card} style={{textAlign:'center'}}>
            <span style={{fontSize:'2.5rem', fontWeight:'800', color:'#0ea5e9', display:'block'}}>200K+</span>
            <h3>Projects Completed</h3>
            <p>Successfully delivered across design, dev, writing, and more.</p>
          </div>
          <div className={styles.card} style={{textAlign:'center'}}>
            <span style={{fontSize:'2.5rem', fontWeight:'800', color:'#0ea5e9', display:'block'}}>4.9★</span>
            <h3>Average Rating</h3>
            <p>Clients consistently rate their Task Tide experience excellent.</p>
          </div>
          <div className={styles.card} style={{textAlign:'center'}}>
            <span style={{fontSize:'2.5rem', fontWeight:'800', color:'#0ea5e9', display:'block'}}>98%</span>
            <h3>Client Satisfaction</h3>
            <p>Nearly all clients say they'd hire again through Task Tide.</p>
          </div>
        </div>

        <div className={styles.ctaBox}>
          <h2>Join the Task Tide community</h2>
          <p>Whether you're hiring or freelancing, there's a place for you here.</p>
          <Link to="/register" className={styles.btn}>Get Started — It's Free</Link>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Task Tide. All rights reserved. · <Link to="/">Back to Home</Link></p>
      </footer>
    </div>
  );
}