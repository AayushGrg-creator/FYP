import { Link } from 'react-router-dom';
import styles from '../styles/footerPages.module.css';

// ─────────────────────────────────────────────
// SUCCESS STORIES
// ─────────────────────────────────────────────
export function SuccessStories() {
  const stories = [
    { initials: 'RK', color: '#9333ea', name: 'Riya K.', role: 'UI/UX Designer, Bangalore', earned: '$18,400', quote: 'Task Tide gave me my first international client. Within 6 months I quit my 9-to-5 and now work fully remote for clients in the US and UK.' },
    { initials: 'MT', color: '#16a34a', name: 'Marcus T.', role: 'Full-Stack Developer, Lagos', earned: '$31,200', quote: 'I was skeptical at first, but the escrow system made clients trust me even without a big portfolio. Now I have a 5-star rating and more work than I can handle.' },
    { initials: 'SP', color: '#2563eb', name: 'Sara P.', role: 'Copywriter, Warsaw', earned: '$9,800', quote: 'Writing was always a side hobby. Task Tide turned it into my main income. The platform is fair, the clients are serious, and the payments always arrive on time.' },
    { initials: 'AJ', color: '#d97706', name: 'Arjun J.', role: 'Motion Designer, Mumbai', earned: '$22,500', quote: 'The Pro badge changed everything. Once I hit PRO level, my inbox flooded with high-budget projects I never would have found on my own.' },
  ];

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
        <h1>Freelancer Success Stories</h1>
        <p>Real people. Real earnings. Real freedom. See how Task Tide changed their lives.</p>
      </div>

      <div className={styles.content}>
        <h2 className={styles.sectionHeading}>Meet Our Top Freelancers</h2>
        <p className={styles.sectionSub}>These freelancers started exactly where you are now.</p>

        <div className={styles.cardsGrid}>
          {stories.map((s, i) => (
            <div key={i} className={styles.card}>
              <div style={{display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1rem'}}>
                <div style={{width:48, height:48, borderRadius:'50%', background:s.color, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.9rem', flexShrink:0}}>{s.initials}</div>
                <div>
                  <strong style={{color:'#1f2937', display:'block'}}>{s.name}</strong>
                  <span style={{color:'#9ca3af', fontSize:'0.85rem'}}>{s.role}</span>
                </div>
              </div>
              <div style={{background:'#f0f9ff', borderRadius:8, padding:'0.5rem 1rem', marginBottom:'1rem', display:'inline-block'}}>
                <span style={{color:'#0ea5e9', fontWeight:800, fontSize:'1.1rem'}}>{s.earned}</span>
                <span style={{color:'#6b7280', fontSize:'0.8rem'}}> earned</span>
              </div>
              <p style={{color:'#4b5563', fontStyle:'italic', lineHeight:1.6, fontSize:'0.92rem'}}>"{s.quote}"</p>
            </div>
          ))}
        </div>

        <div className={styles.ctaBox}>
          <h2>Your success story starts here</h2>
          <p>Join thousands of freelancers already earning on Task Tide.</p>
          <Link to="/register" className={styles.btn}>Start Freelancing — Free</Link>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Task Tide. All rights reserved. · <Link to="/">Back to Home</Link></p>
      </footer>
    </div>
  );
}
