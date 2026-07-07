import { Link } from 'react-router-dom';
import styles from '../styles/landing.module.css';

const categories = [
  { icon: '🎨', name: 'Design & Creative', count: '8,420 services' },
  { icon: '💻', name: 'Development', count: '12,300 services' },
  { icon: '✍️', name: 'Writing & Copy', count: '5,800 services' },
  { icon: '📱', name: 'Digital Marketing', count: '4,120 services' },
  { icon: '🎬', name: 'Video & Animation', count: '3,560 services' },
  { icon: '🎵', name: 'Music & Audio', count: '2,900 services' },
  { icon: '📊', name: 'Business & Finance', count: '3,200 services' },
  { icon: '🤖', name: 'AI Services', count: '1,840 services' },
];

const gigs = [
  {
    icon: '🎨',
    seller: { initials: 'AK', name: 'alex_kr', badge: 'PRO' },
    color: 'av-purple',
    title: 'I will design a modern, professional logo for your brand',
    rating: 4.9,
    reviews: 1200,
    price: 25,
  },
  {
    icon: '💻',
    seller: { initials: 'SR', name: 'sara_r' },
    color: 'av-green',
    title: 'I will build a full-stack React web application with clean code',
    rating: 5.0,
    reviews: 847,
    price: 150,
  },
  {
    icon: '✍️',
    seller: { initials: 'JM', name: 'james_m', badge: 'PRO' },
    color: 'av-amber',
    title: 'I will write SEO-optimised blog posts and website copy that converts',
    rating: 4.8,
    reviews: 2300,
    price: 30,
  },
  {
    icon: '📱',
    seller: { initials: 'NP', name: 'nina_p' },
    color: 'av-blue',
    title: 'I will design stunning mobile app UI/UX in Figma with full prototype',
    rating: 4.9,
    reviews: 631,
    price: 80,
  },
];

const steps = [
  { num: '01', title: 'Post your project', desc: 'Describe what you need, set your budget, and let our platform match you with the best talent.' },
  { num: '02', title: 'Choose a freelancer', desc: 'Browse proposals, check portfolios, and pick the freelancer that fits your needs and budget.' },
  { num: '03', title: 'Get it done', desc: 'Collaborate, give feedback, and approve the final work. Payment releases only when you\'re satisfied.' },
  { num: '04', title: 'Leave a review', desc: 'Rate your experience, help the community grow, and build lasting relationships with great talent.' },
];

const reviews = [
  {
    name: 'Thomas C.',
    role: 'Startup Founder, Berlin',
    color: 'av-blue',
    initials: 'TC',
    text: '"Found an incredible developer in less than 24 hours. The work was flawless. Task Tide is now my go-to platform."'
  },
  {
    name: 'Laura P.',
    role: 'Marketing Director, NYC',
    color: 'av-purple',
    initials: 'LP',
    text: '"Our rebrand came together beautifully. The designer understood our vision immediately. Highly recommend!"'
  },
];

export default function LandingPage() {
  return (
    <div className={styles.container}>

      {/* NAVBAR */}
      <nav className={styles.navbar}>
        <Link to="/" className={styles.logo}>
          Task<span>Tide</span>
        </Link>
        <ul className={styles.navLinks}>
          <li><a href="#categories"></a></li>
          <li><a href="#how-it-works"></a></li>
          <li><a href="#cta"></a></li>
        </ul>
        <div className={styles.navActions}>
          <Link to="/register" className={`${styles.btn} ${styles.btnGhost}`}>Sign Up</Link>
          <Link to="/login" className={`${styles.btn} ${styles.btnPrimary}`}>Login</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          
          
        </div>
        <h1>Find the right <span className={styles.highlight}>talent</span> for every task.</h1>
        <p className={styles.heroSub}>
          Task Tide connects you with skilled freelancers for design, development,
          writing, marketing and more — delivered on time, every time.
        </p>
       
        <div className={styles.heroTags}>
          <span></span>
          
        </div>
      </section>

      {/* STATS BAR */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <div className={styles.statNum}>50K<span>+</span></div>
          <div className={styles.statLabel}>Active Freelancers</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statNum}>200K<span>+</span></div>
          <div className={styles.statLabel}>Projects Completed</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statNum}>4.9<span>★</span></div>
          <div className={styles.statLabel}>Average Rating</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statNum}>98<span>%</span></div>
          <div className={styles.statLabel}>Client Satisfaction</div>
        </div>
      </div>

      {/* CATEGORIES */}
      <section className={styles.section} id="categories">
        <div className={styles.sectionHeader}>
          <h2>Browse by category</h2>
          <a href="#" className={styles.seeAll}>View all →</a>
        </div>
        <div className={styles.categoriesGrid}>
          {categories.map((cat, idx) => (
            <a key={idx} href="#" className={styles.categoryCard}>
              <span className={styles.catIcon}>{cat.icon}</span>
              <div className={styles.catName}>{cat.name}</div>
              <div className={styles.catCount}>{cat.count}</div>
            </a>
          ))}
        </div>
      </section>

      {/* TRENDING GIGS */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Trending services</h2>
          <a href="#" className={styles.seeAll}>View all →</a>
        </div>
        <div className={styles.gigsGrid}>
          {gigs.map((gig, idx) => (
            <div key={idx} className={styles.gigCard}>
              <div className={`${styles.gigThumb} ${styles[`gigThumb${idx + 1}`]}`}>{gig.icon}</div>
              <div className={styles.gigBody}>
                <div className={styles.gigSeller}>
                  <div className={`${styles.avatar} ${styles[gig.color]}`}>{gig.seller.initials}</div>
                  <span className={styles.sellerName}>{gig.seller.name}</span>
                  {gig.seller.badge && <span className={styles.badgePro}>{gig.seller.badge}</span>}
                </div>
                <p className={styles.gigTitle}>{gig.title}</p>
                <div className={styles.gigFooter}>
                  <div className={styles.gigRating}>
                    <span className={styles.stars}>★★★★★</span>
                    <span className={styles.ratingNum}>{gig.rating}</span>
                    <span className={styles.ratingCount}>({gig.reviews.toLocaleString()})</span>
                  </div>
                  <div className={styles.gigPrice}><small>From</small> ${gig.price}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.section} id="how-it-works">
        <h2 className={styles.centerHeading}>How Task Tide works</h2>
        <p className={styles.centerSub}>Get your project done in three simple steps.</p>
        <div className={styles.stepsGrid}>
          {steps.map((step, idx) => (
            <div key={idx} className={styles.stepCard}>
              <div className={styles.stepNum}>{step.num}</div>
              <div className={styles.stepTitle}>{step.title}</div>
              <p className={styles.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST / REVIEWS */}
      <section className={styles.section}>
        <div className={styles.trustGrid}>
          <div className={styles.trustText}>
            <h2>Built on trust, backed by results</h2>
            <p>Every freelancer on Task Tide is vetted and reviewed by real clients. Your payment is held securely until you approve the work — no risk, ever.</p>
            <ul className={styles.trustFeatures}>
              <li><span className={styles.check}>✓</span> Secure escrow payments with money-back guarantee</li>
              <li><span className={styles.check}>✓</span> Verified reviews from real clients only</li>
              <li><span className={styles.check}>✓</span> 24/7 dispute resolution and support</li>
              <li><span className={styles.check}>✓</span> NDA and IP protection on every project</li>
            </ul>
          </div>
          <div className={styles.trustVisual}>
            {reviews.map((review, idx) => (
              <div key={idx} className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <div className={`${styles.avatar} ${styles[review.color]} ${styles.rvAvatar}`}>{review.initials}</div>
                  <div>
                    <div className={styles.reviewName}>{review.name}</div>
                    <div className={styles.reviewRole}>{review.role}</div>
                  </div>
                </div>
                <div className={styles.reviewStars}>★★★★★</div>
                <p className={styles.reviewText}>{review.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection} id="cta">
        <h2>Ready to ride the tide?</h2>
        <p>Join thousands of businesses and freelancers building amazing things together.</p>
        <div className={styles.ctaButtons}>
          <Link to="/register" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}>Hire a Freelancer</Link>
          <Link to="/register" className={`${styles.btn} ${styles.btnGhost} ${styles.btnLg}`}>Start Selling</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <a href="#" className={styles.logo}>Task<span>Tide</span></a>
            <p>The marketplace for top freelance talent. Built for doers.</p>
          </div>

          <div className={styles.footerCol}>
            <h4>For Clients</h4>
            <ul>
              <li><Link to="/how-to-hire">How to Hire</Link></li>
              <li><Link to="/talent-marketplace">Talent Marketplace</Link></li>
              <li><Link to="/enterprise">Enterprise</Link></li>
              <li><Link to="/payment-protection">Payment Protection</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <h4>For Freelancers</h4>
            <ul>
              <li><Link to="/how-to-earn">How to Earn</Link></li>
              <li><Link to="/success-stories">Success Stories</Link></li>
              <li><Link to="/seller-levels">Seller Levels</Link></li>
              <li><Link to="/resources">Resources</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <h4>Company</h4>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/careers">Careers</Link></li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>© 2026 Task Tide. All rights reserved.</span>
          <div className={styles.footerLegal}>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/cookies">Cookies</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

