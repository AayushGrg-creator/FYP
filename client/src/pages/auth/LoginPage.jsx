import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { googleLogin, login, isAuthenticated, loading, error, clearError } = useAuth();

  const [formError, setFErr]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const from = location.state?.from?.pathname || '/dashboard';

  const googleLoginRef = useRef(googleLogin);
  const navigateRef    = useRef(navigate);
  useEffect(() => { googleLoginRef.current = googleLogin; }, [googleLogin]);
  useEffect(() => { navigateRef.current   = navigate;    }, [navigate]);

  useEffect(() => {
    if (!loading && isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, loading, from, navigate]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initGoogle = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          setFErr('');
          try {
            await googleLoginRef.current({ credential, isSignUp: false, role: undefined });
            navigateRef.current(from, { replace: true });
          } catch (err) {
            setFErr(err.message || 'Google sign-in failed. Please try again.');
          }
        },
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-btn-login'),
        { theme: 'outline', size: 'large', width: 400, text: 'signin_with' }
      );
    };

    if (window.google) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google) { clearInterval(interval); initGoogle(); }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [from]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (formError) setFErr('');
    if (error && clearError) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFErr('');

    if (!form.email.trim() || !form.password) {
      setFErr('Please enter your email and password');
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate(from, { replace: true });
    } catch (err) {
      setFErr(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = formError || error;

  return (
    <div style={s.page}>

      {/* Background decoration */}
      <div style={s.bgCircle1} />
      <div style={s.bgCircle2} />

      {/* Card */}
      <div style={s.card}>

        {/* Logo */}
        <div style={{ ...s.logo, display: 'flex', alignItems: 'center' }}>
  <img
    src="/logo.png"
    alt="TaskTide Logo"
    style={{ height: '60px', width: 'auto', objectFit: 'contain', marginRight: '8px' }}
  />
</div>

        {/* Heading */}
        <h1 style={s.title}>Welcome Back</h1>
        <p style={s.subtitle}>Sign in to continue your freelance journey</p>

        {/* Error */}
        {displayError && (
          <div style={s.errorBanner}>
            <span>⚠</span> {displayError}
          </div>
        )}

        <form style={s.form} onSubmit={handleSubmit}>

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
              placeholder="Your password"
              style={s.input}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" style={s.submitBtn} disabled={submitting}>
            {submitting ? 'Signing in...' : 'Login'}
          </button>

          {/* Google GSI button */}
          <div id="google-btn-login" style={s.googleWrap} />

        </form>

        <p style={s.footerText}>
          Don't have an account?{' '}
          <Link to="/register" style={s.footerLink}>Sign Up</Link>
        </p>

      </div>
    </div>
  );
}

export default LoginPage;

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
  // subtle decorative circles in brand blue
  bgCircle1: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(29,111,235,0.08) 0%, transparent 70%)',
    top: -100,
    right: -100,
    pointerEvents: 'none',
  },
  bgCircle2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,180,216,0.07) 0%, transparent 70%)',
    bottom: -80,
    left: -80,
    pointerEvents: 'none',
  },
  card: {
    background: '#FFFFFF',
    border: '1px solid #D6E4FF',
    borderRadius: 20,
    boxShadow: '0 4px 32px rgba(29,111,235,0.10)',
    padding: '44px 40px 36px',
    width: '100%',
    maxWidth: 460,
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
    marginBottom: 28,
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
    margin: '0 0 28px',
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
  googleWrap: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    marginTop: 4,
  },
  hint: {
    color: '#8FA3CC',
    fontSize: 12,
    textAlign: 'center',
    margin: 0,
    lineHeight: 1.5,
  },
  footerText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
    color: '#4B5E8A',
  },
  footerLink: {
    color: '#1D6FEB',
    fontWeight: 700,
    textDecoration: 'none',
  },
  adminLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 13,
    color: '#8FA3CC',
    fontWeight: 600,
    textDecoration: 'none',
  },
};