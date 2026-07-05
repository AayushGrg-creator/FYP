/**
 * client/src/pages/payments/PaymentsPage.jsx
 *
 * Wallet dashboard: current balance, withdraw, transaction history.
 * Route: /payments
 *
 * Visually matches ProjectWorkspacePage's dark/monospace theme so the
 * app feels consistent rather than switching styles between pages.
 */
import { useEffect, useState, useCallback } from 'react';
import { usePayment } from '../../hooks/usePayment';

function formatNPR(amount) {
  if (typeof amount !== 'number') return '—';
  return 'NPR ' + amount.toLocaleString('en-IN');
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
}

const STATUS_STYLES = {
  pending:   { color: '#fbbf24', label: 'Pending' },
  escrowed:  { color: '#60a5fa', label: 'Escrowed' },
  released:  { color: '#4ade80', label: 'Released' },
  refunded:  { color: '#94a3b8', label: 'Refunded' },
  failed:    { color: '#f87171', label: 'Failed' },
  disputed:  { color: '#f87171', label: 'Disputed' },
  withdrawn: { color: '#a78bfa', label: 'Withdrawn' },
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || { color: '#64748b', label: status || '—' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
      background: 'rgba(255,255,255,0.03)', color: s.color,
      border: `1px solid ${s.color}33`, fontFamily: 'monospace',
      letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

function WithdrawForm({ balance, onWithdraw, busy }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    const value = Number(amount);
    if (!value || value <= 0) {
      setLocalError('Enter an amount greater than 0.');
      return;
    }
    if (value > balance) {
      setLocalError('Amount exceeds your available balance.');
      return;
    }
    try {
      await onWithdraw(value);
      setAmount('');
      setOpen(false);
    } catch (err) {
      setLocalError(err.message || 'Withdrawal failed.');
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={balance <= 0}
        style={{
          background: balance > 0 ? '#166534' : 'rgba(255,255,255,0.04)',
          border: 'none', borderRadius: 8, color: balance > 0 ? '#e2e8f0' : '#475569',
          fontSize: 13, padding: '9px 20px', cursor: balance > 0 ? 'pointer' : 'not-allowed',
          fontFamily: 'monospace', fontWeight: 600,
        }}
      >
        Withdraw
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4,
      padding: 14, background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, maxWidth: 320,
    }}>
      {localError && (
        <div style={{ fontSize: 11, color: '#f87171', fontFamily: 'monospace' }}>{localError}</div>
      )}
      <label style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
        AMOUNT (NPR) — available {formatNPR(balance)}
      </label>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        min={1}
        max={balance}
        autoFocus
        style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13,
          outline: 'none', fontFamily: 'inherit',
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="submit" disabled={busy} style={{
          background: '#166534', border: 'none', borderRadius: 6, color: '#e2e8f0',
          padding: '7px 16px', fontSize: 12, cursor: busy ? 'not-allowed' : 'pointer',
          fontFamily: 'monospace', opacity: busy ? 0.6 : 1,
        }}>
          {busy ? 'Processing…' : 'Confirm withdrawal'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setLocalError(null); }} style={{
          background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
          color: '#94a3b8', padding: '7px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
        }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function TransactionRow({ tx }) {
  const isCredit = ['released'].includes(tx.status) && tx.receiver;
  const label = tx.milestone?.name || tx.description || 'Transaction';

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12,
      alignItems: 'center', padding: '12px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 13, color: '#e2e8f0', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', marginTop: 2 }}>
          {formatDateTime(tx.createdAt)}
        </div>
      </div>
      <StatusPill status={tx.status} />
      <span style={{
        fontSize: 13, fontFamily: 'monospace', fontWeight: 600, textAlign: 'right',
        color: isCredit ? '#4ade80' : '#e2e8f0', minWidth: 90,
      }}>
        {formatNPR(tx.amountDisplay)}
      </span>
    </div>
  );
}

export default function PaymentsPage() {
  const {
    balance, transactions, pagination, loading, error,
    fetchBalance, fetchTransactionHistory, withdraw,
  } = usePayment();

  const [page, setPage] = useState(1);

  const loadAll = useCallback(async (p = 1) => {
    await Promise.all([fetchBalance(), fetchTransactionHistory(p)]);
  }, [fetchBalance, fetchTransactionHistory]);

  useEffect(() => { loadAll(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100vh', background: '#080c12',
      fontFamily: "'DM Sans', system-ui, sans-serif", padding: '32px 24px',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#e2e8f0', margin: '0 0 4px' }}>
          Payments & Earnings
        </h1>
        <p style={{ fontSize: 13, color: '#475569', fontFamily: 'monospace', margin: '0 0 28px' }}>
          Your wallet balance and transaction history
        </p>

        {error && (
          <div style={{
            fontSize: 12, color: '#f87171', fontFamily: 'monospace',
            marginBottom: 16, padding: '10px 14px', background: 'rgba(248,113,113,0.06)',
            border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8,
          }}>
            {error}
          </div>
        )}

        {/* Balance card */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16, padding: '20px 24px',
          background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, marginBottom: 24,
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', marginBottom: 6, letterSpacing: '0.5px' }}>
              WALLET BALANCE
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#a3e635', fontFamily: 'monospace' }}>
              {formatNPR(balance)}
            </div>
          </div>
          <WithdrawForm balance={balance} onWithdraw={withdraw} busy={loading} />
        </div>

        {/* Transaction history */}
        <div style={{ marginBottom: 12 }}>
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#64748b', fontFamily: 'monospace',
            letterSpacing: '0.6px', textTransform: 'uppercase',
          }}>
            Transaction History
          </span>
        </div>

        {loading && transactions.length === 0 ? (
          <p style={{ fontSize: 13, color: '#334155', fontFamily: 'monospace' }}>Loading…</p>
        ) : transactions.length === 0 ? (
          <p style={{ fontSize: 13, color: '#334155', fontFamily: 'monospace' }}>
            No transactions yet.
          </p>
        ) : (
          <div style={{
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden',
          }}>
            {transactions.map((tx) => (
              <TransactionRow key={tx._id} tx={tx} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
                color: page <= 1 ? '#334155' : '#94a3b8', padding: '5px 12px', fontSize: 12,
                cursor: page <= 1 ? 'not-allowed' : 'pointer', fontFamily: 'monospace',
              }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages}
              style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
                color: page >= pagination.pages ? '#334155' : '#94a3b8', padding: '5px 12px', fontSize: 12,
                cursor: page >= pagination.pages ? 'not-allowed' : 'pointer', fontFamily: 'monospace',
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}