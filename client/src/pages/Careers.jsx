import { Link } from 'react-router-dom';
import styles from '../styles/footerPages.module.css';

// ─────────────────────────────────────────────
// CAREERS
// ─────────────────────────────────────────────
export function Careers() {
  const jobs = [
    { title: 'Senior Full-Stack Engineer', team: 'Engineering', location: 'Remote' },
    { title: 'Product Designer (UI/UX)', team: 'Design', location: 'Kathmandu / Remote' },
    { title: 'Growth Marketing Manager', team: 'Marketing', location: 'Remote' },
    { title: 'Customer Success Specialist', team: 'Support', location: 'Kathmandu' },
    { title: 'Data Analyst', team: 'Data', location: 'Remote' },
  ];

  return (
    <div className={styles.page}>
      <nav className={styles.navbar}>
        <Link to="/" className={styles.logo} style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/logo.png"
            alt="TaskTide Logo"
            style={{ height: '55px', width: 'auto', objectFit: 'contain', marginRight: '8px' }}
          />
          Task<span>Tide</span>
        </Link>
        <div className={styles.navActions}>
          <Link to="/register" className={`${styles.btn} ${styles.btnGhost}`}>Sign Up</Link>
          <Link to="/login" className={`${styles.btn} ${styles.btnPrimary}`}>Login</Link>
        </div>
      </nav>

      <div className={styles.heroBanner}>
        <h1>Careers at Task Tide</h1>
        <p>Help us build the future of work. We're hiring passionate people who love what they do.</p>
      </div>

      <div className={styles.content}>
        <div className={styles.twoCol}>
          <div className={styles.twoColText}>
            <h2>Why Work With Us?</h2>
            <p>Task Tide is a fast-growing platform on a mission to make skilled work accessible to everyone. We're a small, ambitious team that moves fast and ships constantly.</p>
            <ul className={styles.checkList}>
              <li><span className={styles.check}>✓</span> Fully remote-friendly culture</li>
              <li><span className={styles.check}>✓</span> Competitive salary + equity options</li>
              <li><span className={styles.check}>✓</span> Learning & development budget</li>
              <li><span className={styles.check}>✓</span> Flexible working hours</li>
              <li><span className={styles.check}>✓</span> Annual team retreats</li>
            </ul>
          </div>
          <div className={styles.twoColVisual}>🚀<br /><br /><strong style={{fontSize:'1rem', color:'#0ea5e9'}}>Join a team building something meaningful</strong></div>
        </div>

        <hr className={styles.divider} />

        <h2 className={styles.sectionHeading}>Open Positions</h2>
        <p className={styles.sectionSub}>We're actively hiring across multiple teams.</p>

        <div style={{display:'flex', flexDirection:'column', gap:'1rem', marginBottom:'3rem'}}>
          {jobs.map((job, i) => (
            <div key={i} className={styles.card} style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem'}}>
              <div>
                <h3 style={{marginBottom:'0.25rem'}}>{job.title}</h3>
                <span style={{color:'#6b7280', fontSize:'0.85rem'}}>{job.team} · {job.location}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.ctaBox}>
          <h2>Don't see your role?</h2>
          <p>We're always open to exceptional people. Send us your CV and we'll keep you in mind.</p>
          <Link to="/contact" className={styles.btn}>Send Open Application</Link>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Task Tide. All rights reserved. · <Link to="/">Back to Home</Link></p>
      </footer>
    </div>
  );
}