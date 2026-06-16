import { Component } from 'react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError:  false,
      error:     null,
      errorInfo: null,
    };
  }

  // ── Catch render errors anywhere in the child tree ─────────────────────────
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Send to your logging service in production
    if (process.env.NODE_ENV === 'production') {
      console.error('[ErrorBoundary]', error, errorInfo);
      // e.g. Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback }         = this.props;

    if (!hasError) return children;

    // ── Custom fallback passed as prop ─────────────────────────────────────
    if (fallback) return fallback;

    // ── Default error UI ───────────────────────────────────────────────────
    return (
      <div style={styles.page}>

        {/* Brand */}
        <div style={styles.brand}>
          Task <span style={styles.brandAccent}>Tide</span>
        </div>

        {/* Card */}
        <div style={styles.card}>

          {/* Icon */}
          <div style={styles.iconWrap}>
            <span style={styles.icon}>⚠️</span>
          </div>

          <h1 style={styles.title}>Something went wrong</h1>
          <p style={styles.subtitle}>
            An unexpected error occurred in this part of the page.
            Your other data is safe and unaffected.
          </p>

          {/* Error message */}
          {error?.message && (
            <div style={styles.errorBox}>
              <span style={styles.errorLabel}>Error</span>
              <p style={styles.errorMessage}>{error.message}</p>
            </div>
          )}

          {/* Stack trace – dev only */}
          {process.env.NODE_ENV !== 'production' && errorInfo?.componentStack && (
            <details style={styles.details}>
              <summary style={styles.summary}>Stack trace (dev only)</summary>
              <pre style={styles.stack}>
                {errorInfo.componentStack}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div style={styles.actions}>
            <button
              style={styles.retryBtn}
              onClick={this.handleReset}
            >
              🔄 Try Again
            </button>

            <button
              style={styles.reloadBtn}
              onClick={() => window.location.reload()}
            >
              ↺ Reload Page
            </button>
          </div>

          <Link to="/dashboard" style={styles.homeLink}>
            ← Back to Dashboard
          </Link>

        </div>
      </div>
    );
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    padding: '24px 16px',
    position: 'relative',
  },

  brand: {
    position: 'absolute',
    top: 24,
    left: 32,
    fontSize: 22,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '-0.03em',
    userSelect: 'none',
  },
  brandAccent: { color: '#F59E0B' },

  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '44px 40px',
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },

  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: '#FEF3C7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: { fontSize: 36 },

  title: {
    margin: '0 0 10px',
    fontSize: 24,
    fontWeight: 800,
    color: '#1E1B4B',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: '0 0 24px',
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 1.6,
    maxWidth: 360,
  },

  // Error box
  errorBox: {
    width: '100%',
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 16,
    textAlign: 'left',
  },
  errorLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: '#DC2626',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 4,
  },
  errorMessage: {
    margin: 0,
    fontSize: 14,
    color: '#991B1B',
    fontFamily: "'Fira Code', monospace",
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },

  // Stack trace
  details: {
    width: '100%',
    marginBottom: 20,
    textAlign: 'left',
  },
  summary: {
    fontSize: 13,
    fontWeight: 600,
    color: '#7C3AED',
    cursor: 'pointer',
    marginBottom: 8,
    userSelect: 'none',
  },
  stack: {
    background: '#1E1B4B',
    color: '#A5B4FC',
    borderRadius: 10,
    padding: '14px 16px',
    fontSize: 11,
    lineHeight: 1.7,
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0,
    fontFamily: "'Fira Code', 'Courier New', monospace",
  },

  // Buttons
  actions: {
    display: 'flex',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  retryBtn: {
    flex: 1,
    padding: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(118,75,162,0.35)',
    transition: 'opacity 0.2s',
  },
  reloadBtn: {
    flex: 1,
    padding: '12px',
    background: '#F3F4F6',
    border: 'none',
    borderRadius: 10,
    color: '#374151',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.2s',
  },

  homeLink: {
    fontSize: 14,
    color: '#7C3AED',
    textDecoration: 'none',
    fontWeight: 600,
    marginTop: 4,
  },
};