import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrustScore } from '../../services/reputationService';
import TrustScoreBadge from '../../components/profile/TrustScoreBadge';
import TrustScoreBreakdown from '../../components/profile/TrustScoreBreakdown';

/**
 * PublicProfilePage.jsx
 * Route: /profile/:userId (add this to your router if not already present)
 *
 * Shows a freelancer's Trust Score with the full factor breakdown, so
 * clients browsing proposals or matches can see WHY someone has the
 * score they do, not just the number.
 *
 * NOTE: this page currently only pulls trust score data, via the
 * reputation.service.js work from this session. It does NOT yet pull
 * bio/skills/portfolio for an arbitrary user by ID — that would require
 * a public-facing endpoint in profile.routes.js that I haven't been
 * shown. If one exists, this page can be extended to show that too.
 */

const T = {
  bg:          '#F0F4FF',
  surface:     '#FFFFFF',
  border:      '#D6E4FF',
  borderStrong:'#A8C5FF',
  brand:       '#1D6FEB',
  brandLight:  '#E8F0FF',
  textPrimary: '#0F1C3F',
  textSecond:  '#4B5E8A',
  textMuted:   '#8FA3CC',
  danger:      '#EF4444',
  shadow:      '0 2px 12px rgba(29,111,235,0.08)',
};

export default function PublicProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    getTrustScore(userId)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load trust score.'))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'Sora', sans-serif" }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', color: T.brand, cursor: 'pointer',
            fontFamily: "'DM Mono', monospace", fontSize: 12, marginBottom: 24, padding: 0,
          }}
        >
          ← Back
        </button>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: T.textMuted }}>
            Loading profile…
          </div>
        )}

        {!loading && error && (
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
            padding: 32, textAlign: 'center', color: T.danger, boxShadow: T.shadow,
          }}>
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
              padding: '32px 24px', textAlign: 'center', boxShadow: T.shadow, marginBottom: 24,
            }}>
              <h1 style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 32, margin: '0 0 20px',
                color: T.textPrimary,
              }}>
                {data.name || 'Freelancer'}
              </h1>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <TrustScoreBadge score={data.trustScore} size={140} />
              </div>

              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.textMuted,
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                Trust Score
              </div>
            </div>

            <div style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
              padding: '24px', boxShadow: T.shadow,
            }}>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: 'uppercase',
                letterSpacing: '0.18em', color: T.textMuted, marginBottom: 18,
              }}>
                How this score is calculated
              </div>
              <TrustScoreBreakdown breakdown={data.breakdown} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}