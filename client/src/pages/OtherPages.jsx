// ============================================================
// This file contains 7 pages. Copy each into its own file.
// ============================================================

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

// ─────────────────────────────────────────────
// TALENT MARKETPLACE
// ─────────────────────────────────────────────
export function TalentMarketplace() {
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
        <h1>Talent Marketplace</h1>
        <p>Browse 50,000+ vetted freelancers across every skill category. Find your match in minutes.</p>
      </div>

      <div className={styles.content}>
        <h2 className={styles.sectionHeading}>How to Find the Right Freelancer</h2>
        <p className={styles.sectionSub}>Our marketplace makes it easy to discover, compare, and hire top talent.</p>

        <div className={styles.cardsGrid}>
          <div className={styles.card}><span className={styles.cardIcon}>🔍</span><h3>Smart Search</h3><p>Filter by skill, budget, rating, location, and availability. Our AI-powered search surfaces the most relevant talent instantly.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>📋</span><h3>Detailed Profiles</h3><p>Every freelancer profile shows their skills, portfolio, completed projects, ratings, and response time so you can decide with confidence.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>💬</span><h3>Chat Before You Hire</h3><p>Message freelancers directly before committing. Clarify scope, ask questions, and get a feel for their communication style.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>⚡</span><h3>Quick Hire</h3><p>See a gig you love? Buy it instantly. No negotiations needed — just pick your package and get started today.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>🎯</span><h3>AI Matching</h3><p>Post your project and let our TF-IDF matching engine automatically suggest the freelancers most likely to succeed on your work.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>🏆</span><h3>Top-Rated Filter</h3><p>Filter exclusively for Level 2 and PRO freelancers for mission-critical work where quality is non-negotiable.</p></div>
        </div>

        <div className={styles.ctaBox}>
          <h2>Browse the marketplace now</h2>
          <p>Sign up free and explore thousands of talented freelancers today.</p>
          <Link to="/register" className={styles.btn}>Explore Talent</Link>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Task Tide. All rights reserved. · <Link to="/">Back to Home</Link></p>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────
// ENTERPRISE
// ─────────────────────────────────────────────
export function Enterprise() {
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
        <h1>Task Tide for Enterprise</h1>
        <p>Scale your team with on-demand talent. Built for businesses that move fast.</p>
      </div>

      <div className={styles.content}>
        <h2 className={styles.sectionHeading}>Why Enterprises Choose Task Tide</h2>
        <p className={styles.sectionSub}>From startups to large organisations, Task Tide adapts to your scale.</p>

        <div className={styles.cardsGrid}>
          <div className={styles.card}><span className={styles.cardIcon}>🏢</span><h3>Dedicated Account Manager</h3><p>Enterprise clients get a dedicated account manager who handles sourcing, vetting, and onboarding talent on your behalf.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>👥</span><h3>Team Collaboration</h3><p>Manage multiple projects across departments with shared dashboards, unified billing, and role-based access control.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>📊</span><h3>Spend Analytics</h3><p>Track your freelance spend in real time with detailed reports, budget controls, and cost-per-project breakdowns.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>🔒</span><h3>Enhanced Security</h3><p>Enterprise accounts include mandatory NDA agreements, IP assignment clauses, and SSO integration for your team.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>⚡</span><h3>Priority Talent Access</h3><p>Enterprise clients get first access to PRO-level freelancers before they're listed publicly on the marketplace.</p></div>
          <div className={styles.card}><span className={styles.cardIcon}>💰</span><h3>Volume Pricing</h3><p>Reduced platform fees and custom billing cycles for organisations with high project volume. Contact us for a quote.</p></div>
        </div>

        <div className={styles.ctaBox}>
          <h2>Let's talk about your needs</h2>
          <p>Our enterprise team will put together a custom plan for your organisation.</p>
          <Link to="/contact" className={styles.btn}>Contact Enterprise Sales</Link>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Task Tide. All rights reserved. · <Link to="/">Back to Home</Link></p>
      </footer>
    </div>
  );
}

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

// ─────────────────────────────────────────────
// CAREERS
// ─────────────────────────────────────────────
export function Careers() {
  const jobs = [
    { title: 'Senior Full-Stack Engineer', team: 'Engineering', location: 'Remote', type: 'Full-Time' },
    { title: 'Product Designer (UI/UX)', team: 'Design', location: 'Kathmandu / Remote', type: 'Full-Time' },
    { title: 'Growth Marketing Manager', team: 'Marketing', location: 'Remote', type: 'Full-Time' },
    { title: 'Customer Success Specialist', team: 'Support', location: 'Kathmandu', type: 'Full-Time' },
    { title: 'Data Analyst', team: 'Data', location: 'Remote', type: 'Full-Time' },
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
              <div style={{display:'flex', gap:'0.75rem', alignItems:'center'}}>
                <span className={`${styles.badge} ${styles.badgeGreen}`}>{job.type}</span>
                <Link to="/contact" className={`${styles.btn} ${styles.btnPrimary}`} style={{padding:'0.5rem 1.25rem', fontSize:'0.85rem'}}>Apply</Link>
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