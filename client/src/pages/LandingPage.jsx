import { Link } from 'react-router-dom';
import styles from '../styles/landing.module.css';

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
    image: '/client.jpg',
    text: '"Found an incredible developer in less than 24 hours. The work was flawless. Task Tide is now my go-to platform."'
  },
  {
    name: 'David P.',
    role: 'Marketing Director, NYC',
    image: '/freelancer.jpg',
    text: '"Our rebrand came together beautifully. The designer understood our vision immediately. Highly recommend!"'
  },
];

export default function LandingPage() {
  return (
    <div className={styles.container}>

      {/* NAVBAR */}
      <nav className={styles.navbar}>
        <Link to="/" className={styles.logo}>
          <img
            src="/logo.png"
            alt="TaskTide logo"
            style={{ height: '55px', verticalAlign: 'middle' }}
          />
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
        <h1>Find the right <span className={styles.highlight}>talent</span> for every task.</h1>
        <p className={styles.heroSub}>
          Task Tide connects you with skilled freelancers for design, development,
          writing, marketing and more — delivered on time, every time.
        </p>
       
        <div className={styles.heroTags}>
          <span></span>
          
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
                  <img
                    src={review.image}
                    alt={review.name}
                    style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                  />
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
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <a href="#" className={styles.logo}>
              <img
                src="/logo.png"
                alt="TaskTide logo"
                style={{ height: '55px', verticalAlign: 'middle' }}
              />
            </a>
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
          </div>
        </div>
      </footer>

    </div>
  );
}