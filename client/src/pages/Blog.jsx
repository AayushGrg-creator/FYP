

// ─────────────────────────────────────────────
// BLOG
// ─────────────────────────────────────────────
export function Blog() {
  const posts = [
    { emoji: '🚀', tag: 'Freelancing', date: 'Jun 10, 2026', title: '10 Ways to Win More Clients in 2026', desc: 'The freelance market is more competitive than ever. Here are the proven strategies top sellers use to consistently land high-value clients.' },
    { emoji: '💰', tag: 'Earnings', date: 'Jun 3, 2026', title: 'How to Raise Your Rates Without Losing Clients', desc: 'Charging more is scary. But undercharging is worse. This guide walks you through a proven framework for increasing your rates gracefully.' },
    { emoji: '🎨', tag: 'Design', date: 'May 28, 2026', title: 'Portfolio Tips: What Clients Actually Look For', desc: 'We asked 100 clients what makes a freelancer portfolio stand out. The results might surprise you .' },
    { emoji: '🤖', tag: 'AI', date: 'May 20, 2026', title: 'AI Skills That Are Booming on Task Tide Right Now', desc: 'Prompt engineering, fine-tuning, and AI automation are the fastest-growing categories on our platform. ' },
    { emoji: '⚡', tag: 'Productivity', date: 'May 12, 2026', title: 'How Pro Freelancers Manage 5+ Projects at Once', desc: 'Top freelancers don\'t work harder — they work smarter. These are the tools, systems, and habits that keep them on top of everything.' },
    { emoji: '🌍', tag: 'Remote Work', date: 'May 5, 2026', title: 'The Complete Guide to Getting Paid Internationally', desc: 'Navigating cross-border payments as a freelancer in Nepal or South Asia. Stripe, Khalti, bank transfers — everything explained.' },
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
        <h1>Task Tide Blog</h1>
        <p>Guides, tips, and stories to help you thrive as a freelancer or client.</p>
      </div>

      <div className={styles.content}>
        <h2 className={styles.sectionHeading}>Latest Articles</h2>
        <p className={styles.sectionSub}>Fresh content every week from the Task Tide team and community.</p>

        <div className={styles.cardsGrid}>
          {posts.map((post, i) => (
            <div key={i} className={styles.card}>
              <span style={{fontSize:'2rem', display:'block', marginBottom:'0.75rem'}}>{post.emoji}</span>
              <div style={{display:'flex', gap:'0.75rem', alignItems:'center', marginBottom:'0.75rem'}}>
                <span className={`${styles.badge} ${styles.badgeBlue}`}>{post.tag}</span>
                <span style={{color:'#9ca3af', fontSize:'0.8rem'}}>{post.date}</span>
              </div>
              <h3 style={{marginBottom:'0.5rem'}}>{post.title}</h3>
              <p>{post.desc}</p>
              <a href="#" style={{color:'#0ea5e9', fontWeight:600, fontSize:'0.9rem', textDecoration:'none', display:'inline-block', marginTop:'1rem'}}>Read more →</a>
            </div>
          ))}
        </div>

        <div className={styles.ctaBox}>
          <h2>Want more tips like these?</h2>
          <p>Join Task Tide and get weekly freelance insights straight to your inbox.</p>
          <Link to="/register" className={styles.btn}>Join Task Tide</Link>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Task Tide. All rights reserved. · <Link to="/">Back to Home</Link></p>
      </footer>
    </div>
  );
}