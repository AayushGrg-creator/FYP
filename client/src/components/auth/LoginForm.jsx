import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function LoginForm() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email.trim())    return setError('Email address is required');
    if (!form.password.trim()) return setError('Password is required');
    if (!/\S+@\S+\.\S+/.test(form.email)) return setError('Enter a valid email address');

    setLoading(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>

      <div style={styles.bgCircle1} />
      <div style={styles.bgCircle2} />

      <div style={styles.card}>

        {/* Logo */}
        <div style={styles.logo}>
          Task<span style={styles.logoAccent}>Tide</span>
        </div>

        {/* Heading */}
        <h1 style={styles.title}>Welcome Back</h1>
        <p style={styles.subtitle}>Sign in to continue your freelance journey</p>

        {/* Error banner */}
        {error && (
          <div style={styles.errorBanner}>
            <span style={styles.errorIcon}>⚠</span>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate style={styles.form}>

          {/* Email */}
          <div style={styles.inputWrap}>
            <span style={styles.inputIcon}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8FA3CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </span>
            <input
              type="email"
              placeholder="Email Address"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              style={styles.input}
              autoComplete="email"
              autoFocus
            />
          </div>

          {/* Password */}
          <div style={styles.inputWrap}>
            <span style={styles.inputIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8FA3CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              style={styles.input}
              autoComplete="current-password"
            />
            <button
              type="button"
              style={styles.eyeBtn}
              onClick={() => setShowPass(s => !s)}
              tabIndex={-1}
            >
              {showPass ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8FA3CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8FA3CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          {/* Remember me / Forgot password */}
          <div style={styles.row}>
            <label style={styles.rememberLabel}>
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                style={styles.checkbox}
              />
              Remember Me
            </label>
            <Link to="/forgot-password" style={styles.forgotLink}>
              Forgot Password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            style={{ ...styles.submitBtn, opacity: loading ? 0.65 : 1 }}
            disabled={loading}
          >
            {loading ? <span style={styles.spinner} /> : 'Login'}
          </button>

          {/* Divider */}
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or continue with</span>
            <div style={styles.dividerLine} />
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            style={styles.googleBtn}
            onClick={() => window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`}
          >
            <svg width="19" height="19" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

        </form>

        {/* Sign up */}
        <p style={styles.footerText}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.footerLink}>Sign Up</Link>
        </p>

        {/* Admin panel */}
        <Link to="/admin" style={styles.adminLink}>Admin Panel →</Link>

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
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

  // Logo
  logo: {
    fontSize: 28,
    fontWeight: 800,
    color: '#0F1C3F',
    letterSpacing: '-0.03em',
    marginBottom: 24,
  },
  logoAccent: {
    color: '#1D6FEB',
  },

  // Heading
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

  // Error
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
  errorIcon: {
    fontSize: 15,
    flexShrink: 0,
  },

  // Form
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    width: '100%',
  },

  // Input
  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 1,
  },
  input: {
    width: '100%',
    padding: '14px 44px',
    background: '#F8FAFF',
    border: '1.5px solid #D6E4FF',
    borderRadius: 10,
    fontSize: 14,
    color: '#0F1C3F',
    fontFamily: 'inherit',
    outline: 'none',
    letterSpacing: '-0.01em',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: 4,
  },

  // Remember / Forgot row
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rememberLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: '#4B5E8A',
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: '#1D6FEB',
    cursor: 'pointer',
  },
  forgotLink: {
    fontSize: 13,
    color: '#1D6FEB',
    textDecoration: 'none',
    fontWeight: 600,
  },

  // Submit
  submitBtn: {
    width: '100%',
    padding: '13px 14px',
    background: '#1D6FEB',
    border: 'none',
    borderRadius: 10,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 2,
    transition: 'background 0.15s, opacity 0.15s',
  },

  // Spinner
  spinner: {
    width: 20,
    height: 20,
    border: '2.5px solid rgba(255,255,255,0.35)',
    borderTopColor: '#FFFFFF',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },

  // Divider
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#D6E4FF',
  },
  dividerText: {
    color: '#8FA3CC',
    fontSize: 12,
    whiteSpace: 'nowrap',
    letterSpacing: '0.05em',
  },

  // Google button
  googleBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    background: '#FFFFFF',
    border: '1.5px solid #D6E4FF',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 14,
    fontWeight: 700,
    color: '#0F1C3F',
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
    transition: 'border-color 0.15s, background 0.15s',
  },

  // Footer
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

  // Admin link
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
