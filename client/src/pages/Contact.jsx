import { Link } from 'react-router-dom';
import styles from '../styles/footerPages.module.css';



// ─────────────────────────────────────────────
// CONTACT
// ─────────────────────────────────────────────
export function Contact() {
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
        <h1>Contact Us</h1>
        <p>We're here to help. Reach out and we'll get back to you within 24 hours.</p>
      </div>

      <div className={styles.content}>
        <div className={styles.twoCol}>
          <div>
            <h2 className={styles.sectionHeading}>Get in Touch</h2>
            <p className={styles.sectionSub}>Fill in the form and our team will respond promptly.</p>

            <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                <div>
                  <label style={{display:'block', fontWeight:600, color:'#1f2937', marginBottom:'0.4rem', fontSize:'0.9rem'}}>First Name</label>
                  <input type="text" placeholder="John" style={{width:'100%', padding:'0.75rem', border:'1px solid #e5e7eb', borderRadius:6, fontSize:'0.95rem', outline:'none'}} />
                </div>
                <div>
                  <label style={{display:'block', fontWeight:600, color:'#1f2937', marginBottom:'0.4rem', fontSize:'0.9rem'}}>Last Name</label>
                  <input type="text" placeholder="Doe" style={{width:'100%', padding:'0.75rem', border:'1px solid #e5e7eb', borderRadius:6, fontSize:'0.95rem', outline:'none'}} />
                </div>
              </div>
              <div>
                <label style={{display:'block', fontWeight:600, color:'#1f2937', marginBottom:'0.4rem', fontSize:'0.9rem'}}>Email Address</label>
                <input type="email" placeholder="john@example.com" style={{width:'100%', padding:'0.75rem', border:'1px solid #e5e7eb', borderRadius:6, fontSize:'0.95rem', outline:'none'}} />
              </div>
              <div>
                <label style={{display:'block', fontWeight:600, color:'#1f2937', marginBottom:'0.4rem', fontSize:'0.9rem'}}>Subject</label>
                <select style={{width:'100%', padding:'0.75rem', border:'1px solid #e5e7eb', borderRadius:6, fontSize:'0.95rem', outline:'none', background:'white'}}>
                  <option>General Enquiry</option>
                  <option>Payment Issue</option>
                  <option>Dispute Resolution</option>
                  <option>Enterprise Sales</option>
                  <option>Technical Support</option>
                  <option>Report a User</option>
                </select>
              </div>
              <div>
                <label style={{display:'block', fontWeight:600, color:'#1f2937', marginBottom:'0.4rem', fontSize:'0.9rem'}}>Message</label>
                <textarea placeholder="Describe your issue or question in detail..." rows={5} style={{width:'100%', padding:'0.75rem', border:'1px solid #e5e7eb', borderRadius:6, fontSize:'0.95rem', outline:'none', resize:'vertical'}} />
              </div>
              <button style={{padding:'0.875rem 2rem', background:'#0ea5e9', color:'white', border:'none', borderRadius:6, fontWeight:700, fontSize:'1rem', cursor:'pointer'}}>Send Message</button>
            </div>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
            <div className={styles.card}>
              <span className={styles.cardIcon}>📧</span>
              <h3>Email Support</h3>
              <p>For general enquiries: <strong style={{color:'#0ea5e9'}}>support@tasktide.com</strong></p>
              <p style={{marginTop:'0.5rem'}}>For enterprise: <strong style={{color:'#0ea5e9'}}>enterprise@tasktide.com</strong></p>
            </div>
            <div className={styles.card}>
              <span className={styles.cardIcon}>💬</span>
              <h3>Live Chat</h3>
              <p>Available Mon–Fri, 9am–6pm NPT. Start a chat directly from your dashboard once logged in.</p>
            </div>
            <div className={styles.card}>
              <span className={styles.cardIcon}>📍</span>
              <h3>Office</h3>
              <p>Task Tide HQ<br />Kathmandu, Bagmati Province<br />Nepal 44600</p>
            </div>
            <div className={styles.card}>
              <span className={styles.cardIcon}>⏱️</span>
              <h3>Response Time</h3>
              <p>We aim to respond to all enquiries within <strong>24 hours</strong> on business days.</p>
            </div>
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Task Tide. All rights reserved. · <Link to="/">Back to Home</Link></p>
      </footer>
    </div>
  );
}