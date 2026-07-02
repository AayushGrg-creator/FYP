import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const RegisterPage = () => {
  const navigate        = useNavigate();
  const { googleLogin, register } = useAuth();

  const [role, setRole]         = useState('freelancer');
  const [agreed, setAgreed]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const [form, setForm] = useState({
    name:            '',
    email:           '',
    password:        '',
    confirmPassword: '',
  });

  const agreedRef      = useRef(agreed);
  const roleRef        = useRef(role);
  const googleLoginRef = useRef(googleLogin);
  const navigateRef    = useRef(navigate);

  useEffect(() => { agreedRef.current      = agreed;      }, [agreed]);
  useEffect(() => { roleRef.current        = role;        }, [role]);
  useEffect(() => { googleLoginRef.current = googleLogin; }, [googleLogin]);
  useEffect(() => { navigateRef.current    = navigate;    }, [navigate]);

  useEffect(() => {
  let cancelled = false;

  const handleGoogleCredential = async (response) => {
    setError('');
    if (!agreedRef.current) {
      setError('You must agree to the Terms & Conditions');
      return;
    }
    try {
      await googleLoginRef.current({
        credential: response.credential,
        isSignUp:   true,
        role:       roleRef.current,
      });
      navigateRef.current('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  const initGoogle = () => {
    if (!window.google || cancelled) return;

    // Always safe to call initialize again with the same config —
    // but only render the button once, so we don't duplicate it either.
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback:  handleGoogleCredential,
    });

    const btnContainer = document.getElementById('google-btn-register');
    if (btnContainer && !btnContainer.hasChildNodes()) {
      window.google.accounts.id.renderButton(
        btnContainer,
        { theme: 'outline', size: 'large', width: 420, text: 'signup_with' }
      );
    }
  };

  if (window.google) {
    initGoogle();
  } else {
    const interval = setInterval(() => {
      if (window.google) { clearInterval(interval); initGoogle(); }
    }, 100);
    return () => { cancelled = true; clearInterval(interval); };
  }

  return () => { cancelled = true; };
}, []);

    
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!agreed) {
      setError('You must agree to the Terms & Conditions');
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register({
        name:     form.name.trim(),
        email:    form.email.trim(),
        password: form.password,
        role,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {/* Background decorations */}
      <div style={s.bgCircle1} />
      <div style={s.bgCircle2} />

      <div style={s.card}>
        <div style={s.logo}>Task<span style={s.logoAccent}>Tide</span></div>
        <h1 style={s.title}>Create Account</h1>
        <p style={s.subtitle}>Join the future of freelancing</p>

        {error && (
          <div style={s.errorBanner}>
            <span>⚠</span> {error}
          </div>
        )}

        <form style={s.form} onSubmit={handleRegister}>

          {/* Account Type */}
          <div style={s.accountSection}>
            <p style={s.accountLabel}>Select Account Type</p>
            <div style={s.accountGrid}>

              <button
                type="button"
                style={{ ...s.typeCard, ...(role === 'freelancer' ? s.typeCardActive : {}) }}
                onClick={() => setRole('freelancer')}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                  stroke={role === 'freelancer' ? '#1D6FEB' : '#8FA3CC'}
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ marginBottom: 10 }}>
                  <rect x="2" y="3" width="20" height="14" rx="2"/>
                  <path d="m8 21 4-4 4 4"/>
                  <path d="M9 9h1m4 0h1M9 12h6"/>
                </svg>
                <span style={{ ...s.typeCardTitle, color: role === 'freelancer' ? '#1D6FEB' : '#0F1C3F' }}>
                  I'm a Freelancer
                </span>
                <span style={s.typeCardDesc}>
                  Find projects, work with clients worldwide, and grow your freelance career.
                </span>
              </button>

              <button
                type="button"
                style={{ ...s.typeCard, ...(role === 'client' ? s.typeCardActive : {}) }}
                onClick={() => setRole('client')}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                  stroke={role === 'client' ? '#1D6FEB' : '#8FA3CC'}
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ marginBottom: 10 }}>
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  <line x1="12" y1="12" x2="12" y2="16"/>
                  <line x1="10" y1="14" x2="14" y2="14"/>
                </svg>
                <span style={{ ...s.typeCardTitle, color: role === 'client' ? '#1D6FEB' : '#0F1C3F' }}>
                  I'm a Client
                </span>
                <span style={s.typeCardDesc}>
                  Hire talented freelancers and manage projects efficiently.
                </span>
              </button>

            </div>
          </div>

          {/* Email / Password fields */}
          <div style={s.fieldGroup}>
            <label style={s.fieldLabel}>Full Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
              style={s.input}
              autoComplete="name"
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.fieldLabel}>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              style={s.input}
              autoComplete="email"
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.fieldLabel}>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              style={s.input}
              autoComplete="new-password"
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.fieldLabel}>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              style={s.input}
              autoComplete="new-password"
            />
          </div>

          {/* Terms */}
          <label style={s.termsLabel}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={s.checkbox}
            />
            I agree to the{' '}
            <Link to="/terms" style={s.termsLink}>Terms &amp; Conditions</Link>
          </label>

          <button type="submit" style={s.submitBtn} disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>

          {/* Google GSI Button */}
          <div id="google-btn-register" style={s.googleWrap} />

        </form>

        <p style={s.footerText}>
          Already have an account?{' '}
          <Link to="/login" style={s.footerLink}>Login</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    background: '#F0F4FF',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Sora', 'DM Sans', system-ui, sans-serif",
    padding: '40px 16px',
    WebkitFontSmoothing: 'antialiased',
    position: 'relative',
    overflow: 'hidden',
  },
  bgCircle1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(29,111,235,0.07) 0%, transparent 70%)',
    top: -150,
    right: -150,
    pointerEvents: 'none',
  },
  bgCircle2: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,180,216,0.06) 0%, transparent 70%)',
    bottom: -100,
    left: -100,
    pointerEvents: 'none',
  },
  card: {
    background: '#FFFFFF',
    border: '1px solid #D6E4FF',
    borderRadius: 20,
    boxShadow: '0 4px 32px rgba(29,111,235,0.10)',
    padding: '44px 40px 36px',
    width: '100%',
    maxWidth: 520,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  logo: {
    fontSize: 28,
    fontWeight: 800,
    color: '#0F1C3F',
    letterSpacing: '-0.03em',
    marginBottom: 24,
  },
  logoAccent: { color: '#1D6FEB' },
  title: {
    margin: '0 0 8px',
    fontSize: 26,
    fontWeight: 700,
    color: '#0F1C3F',
    letterSpacing: '-0.02em',
    textAlign: 'center',
  },
  subtitle: {
    margin: '0 0 24px',
    fontSize: 14,
    color: '#8FA3CC',
    textAlign: 'center',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(239,68,68,0.07)',
    border: '1px solid rgba(239,68,68,0.25)',
    color: '#DC2626',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 14,
    marginBottom: 16,
    width: '100%',
    lineHeight: 1.4,
    boxSizing: 'border-box',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    width: '100%',
  },
  accountSection: { marginTop: 4 },
  accountLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#4B5E8A',
    marginBottom: 10,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },
  accountGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  typeCard: {
    background: '#F8FAFF',
    border: '1.5px solid #D6E4FF',
    borderRadius: 14,
    padding: '20px 14px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
  },
  typeCardActive: {
    border: '1.5px solid #1D6FEB',
    background: '#EBF2FF',
    boxShadow: '0 2px 12px rgba(29,111,235,0.12)',
  },
  typeCardTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 6,
    letterSpacing: '-0.01em',
    display: 'block',
  },
  typeCardDesc: {
    fontSize: 12,
    color: '#8FA3CC',
    lineHeight: 1.5,
    display: 'block',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#4B5E8A',
  },
  input: {
    border: '1.5px solid #D6E4FF',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 14,
    color: '#0F1C3F',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    width: '100%',
  },
  termsLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: '#4B5E8A',
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkbox: { width: 16, height: 16, accentColor: '#1D6FEB', cursor: 'pointer', flexShrink: 0 },
  termsLink: { color: '#1D6FEB', fontWeight: 600, textDecoration: 'none' },
  submitBtn: {
    background: '#1D6FEB',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 10,
    padding: '13px 14px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  googleWrap: { display: 'flex', justifyContent: 'center', width: '100%', marginTop: 4 },
  footerText: { textAlign: 'center', marginTop: 24, fontSize: 14, color: '#4B5E8A' },
  footerLink: { color: '#1D6FEB', fontWeight: 700, textDecoration: 'none' },
};