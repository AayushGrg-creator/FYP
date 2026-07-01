import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function RegisterForm() {
  const navigate     = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accountType, setAccountType] = useState('freelancer'); // 'freelancer' | 'client'
  const [agreed, setAgreed]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.fullName.trim())        return setError('Full name is required');
    if (!form.email.trim())           return setError('Email address is required');
    if (!/\S+@\S+\.\S+/.test(form.email)) return setError('Enter a valid email address');
    if (!form.password.trim())        return setError('Password is required');
    if (form.password.length < 6)     return setError('Password must be at least 6 characters');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (!agreed)                      return setError('You must agree to the Terms & Conditions');

    setLoading(true);
    try {
      await register(form.fullName.trim(), form.email.trim(), form.password, accountType);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>

      {/* Logo */}
      <div style={styles.logo}>
        Task<span style={styles.logoAccent}>Tide</span>
      </div>

      {/* Heading */}
      <h1 style={styles.title}>Create Account</h1>
      <p style={styles.subtitle}>Join the future of freelancing</p>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner}>
          <span>⚠</span>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate style={styles.form}>

        {/* Full Name */}
        <div style={styles.inputWrap}>
          <span style={styles.inputIcon}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Full Name"
            value={form.fullName}
            onChange={e => set('fullName', e.target.value)}
            style={styles.input}
            autoComplete="name"
            autoFocus
          />
        </div>

        {/* Email */}
        <div style={styles.inputWrap}>
          <span style={styles.inputIcon}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          />
        </div>

        {/* Password */}
        <div style={styles.inputWrap}>
          <span style={styles.inputIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            autoComplete="new-password"
          />
          <button type="button" style={styles.eyeBtn} onClick={() => setShowPass(s => !s)} tabIndex={-1}>
            {showPass ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>

        {/* Confirm Password */}
        <div style={styles.inputWrap}>
          <span style={styles.inputIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <input
            type={showConfirm ? 'text' : 'password'}
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={e => set('confirmPassword', e.target.value)}
            style={styles.input}
            autoComplete="new-password"
          />
          <button type="button" style={styles.eyeBtn} onClick={() => setShowConfirm(s => !s)} tabIndex={-1}>
            {showConfirm ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>

        {/* Account Type */}
        <div style={styles.accountTypeSection}>
          <p style={styles.accountTypeLabel}>Select Account Type</p>
          <div style={styles.accountTypeGrid}>

            {/* Freelancer */}
            <button
              type="button"
              style={{
                ...styles.typeCard,
                ...(accountType === 'freelancer' ? styles.typeCardActive : {}),
              }}
              onClick={() => setAccountType('freelancer')}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={accountType === 'freelancer' ? '#7c6ff7' : '#555'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="m8 21 4-4 4 4"/>
                <path d="M9 9h1m4 0h1M9 12h6"/>
              </svg>
              <span style={styles.typeCardTitle}>I'm a Freelancer</span>
              <span style={styles.typeCardDesc}>Find projects, work with clients worldwide, and grow your freelance career.</span>
            </button>

            {/* Client */}
            <button
              type="button"
              style={{
                ...styles.typeCard,
                ...(accountType === 'client' ? styles.typeCardActive : {}),
              }}
              onClick={() => setAccountType('client')}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={accountType === 'client' ? '#7c6ff7' : '#555'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                <line x1="12" y1="12" x2="12" y2="16"/>
                <line x1="10" y1="14" x2="14" y2="14"/>
              </svg>
              <span style={styles.typeCardTitle}>I'm a Client</span>
              <span style={styles.typeCardDesc}>Hire talented freelancers and manage projects efficiently.</span>
            </button>

          </div>
        </div>

        {/* Terms */}
        <label style={styles.termsLabel}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={styles.checkbox}
          />
          I agree to the{' '}
          <Link to="/terms" style={styles.termsLink}>Terms &amp; Conditions</Link>
        </label>

        {/* Submit */}
        <button
          type="submit"
          style={{ ...styles.submitBtn, opacity: loading ? 0.65 : 1 }}
          disabled={loading}
        >
          {loading ? <span style={styles.spinner} /> : 'Create Account'}
        </button>

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or continue with</span>
          <div style={styles.dividerLine} />
        </div>

        {/* Google */}
        <button
          type="button"
          style={styles.googleBtn}
          onClick={() => window.location.href = '/api/auth/google'}
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

      {/* Login link */}
      <p style={styles.footerText}>
        Already have an account?{' '}
        <Link to="/login" style={styles.footerLink}>Login</Link>
      </p>

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: '#1a1a1a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    padding: '40px 16px',
    WebkitFontSmoothing: 'antialiased',
  },

  logo: {
    fontSize: 32,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.04em',
    marginBottom: 28,
  },
  logoAccent: {
    color: '#00e5a0',
  },

  title: {
    margin: '0 0 8px',
    fontSize: 28,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.03em',
    textAlign: 'center',
  },
  subtitle: {
    margin: '0 0 32px',
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },

  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255,92,92,0.1)',
    border: '1px solid rgba(255,92,92,0.3)',
    color: '#ff5c5c',
    borderRadius: 12,
    padding: '11px 14px',
    fontSize: 14,
    marginBottom: 16,
    width: '100%',
    maxWidth: 480,
    lineHeight: 1.4,
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    width: '100%',
    maxWidth: 480,
  },

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
    padding: '16px 48px',
    background: '#2a2a2a',
    border: '1.5px solid #333333',
    borderRadius: 12,
    fontSize: 15,
    color: '#ffffff',
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

  // Account type section
  accountTypeSection: {
    marginTop: 6,
  },
  accountTypeLabel: {
    fontSize: 15,
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 14,
    letterSpacing: '-0.01em',
  },
  accountTypeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  typeCard: {
    background: '#222222',
    border: '1.5px solid #333333',
    borderRadius: 14,
    padding: '22px 16px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    transition: 'border-color 0.2s, background 0.2s',
    fontFamily: 'inherit',
  },
  typeCardActive: {
    border: '1.5px solid #7c6ff7',
    background: '#1e1b33',
  },
  typeCardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: '-0.01em',
  },
  typeCardDesc: {
    fontSize: 12,
    color: '#888888',
    lineHeight: 1.5,
  },

  // Terms
  termsLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: '#888888',
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: '#00e5a0',
    cursor: 'pointer',
    flexShrink: 0,
  },
  termsLink: {
    color: '#7c6ff7',
    fontWeight: 600,
    textDecoration: 'none',
  },

  // Submit
  submitBtn: {
    width: '100%',
    padding: '16px',
    background: '#00e5a0',
    border: 'none',
    borderRadius: 50,
    color: '#111111',
    fontSize: 17,
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    marginTop: 4,
    transition: 'background 0.15s, opacity 0.15s',
  },

  spinner: {
    width: 22,
    height: 22,
    border: '2.5px solid rgba(0,0,0,0.2)',
    borderTopColor: '#111',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },

  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#333333',
  },
  dividerText: {
    color: '#666666',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },

  googleBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    background: '#2a2a2a',
    border: '1.5px solid #333333',
    borderRadius: 12,
    padding: '14px 16px',
    fontSize: 15,
    fontWeight: 700,
    color: '#ffffff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
    transition: 'border-color 0.15s, background 0.15s',
  },

  footerText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: '#888888',
  },
  footerLink: {
    color: '#7c6ff7',
    fontWeight: 700,
    textDecoration: 'none',
  },
};