
/**
 * client/src/pages/payments/KhaltiReturnPage.jsx
 *
 * Route: /payments/khalti/return
 *
 * Khalti redirects here after the client completes (or cancels) payment,
 * appending ?pidx=... to whatever query params we originally included in
 * returnUrl. We also include ?milestoneId=... ourselves (see
 * milestone.controller.js fundMilestone) since Khalti's redirect alone
 * doesn't tell us which milestone the payment was for.
 *
 * This page's only job is to call the backend to verify the payment
 * server-side (never trust the redirect alone) and show the result.
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import milestoneService from '../../services/milestoneService';

export default function KhaltiReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('confirming'); // 'confirming' | 'success' | 'error'
  const [message, setMessage] = useState('Confirming your payment…');

  const pidx        = searchParams.get('pidx');
  const milestoneId = searchParams.get('milestoneId');

 useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  useEffect(() => {
    async function confirm() {
      if (!pidx || !milestoneId) {
        setStatus('error');
        setMessage('Missing payment reference. If money was deducted, contact support with your Khalti receipt.');
        return;
      }
      try {
        await milestoneService.confirmPayment(milestoneId, pidx);
        setStatus('success');
        setMessage('Payment confirmed. The milestone is now funded.');
      } catch (err) {
        setStatus('error');
        setMessage(err.message || 'We could not verify this payment. If money was deducted, contact support.');
      }
    }
    confirm();
  }, [pidx, milestoneId]);

  const iconFor = { confirming: '⏳', success: '✓', error: '⚠️' }[status];
  const colorFor = { confirming: '#fbbf24', success: '#4ade80', error: '#f87171' }[status];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 18,
      background: '#080c12', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24,
    }}>
      <span style={{ fontSize: 40, color: colorFor }}>{iconFor}</span>
      <p style={{
        fontSize: 14, color: '#e2e8f0', fontFamily: 'monospace',
        textAlign: 'center', maxWidth: 420,
      }}>
        {message}
      </p>
      {status !== 'confirming' && (
        <button
         onClick={() => navigate('/dashboard', { replace: true })}
          style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
            color: '#94a3b8', fontSize: 13, padding: '8px 18px', cursor: 'pointer', fontFamily: 'monospace',
          }}
        >
          ← Back to Dashboard
        </button>
      )}
    </div>
  );
}
