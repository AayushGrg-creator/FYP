import React, { useState } from 'react';
import reviewService from '../../services/reviewService';

const STAR_LABELS = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];

export default function RateFreelancerModal({ milestoneId, milestoneName, onClose, onSubmitted }) {
  const [rating, setRating]           = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment]         = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      setError('Please select a star rating.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await reviewService.submit(milestoneId, rating, comment.trim());
      onSubmitted?.(milestoneId);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit rating.');
    } finally {
      setSubmitting(false);
    }
  };

  const shown = hoverRating || rating;

  return (
    <div
      style={{
        background:   '#0d1117',
        border:       '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding:      24,
        width:        360,
        maxWidth:     '90vw',
        fontFamily:   'monospace',
      }}
    >
      <h3 style={{ margin: '0 0 4px', fontSize: 15, color: '#e2e8f0' }}>Rate Freelancer</h3>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>
        For milestone: {milestoneName}
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              style={{
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                fontSize:   28,
                lineHeight: 1,
                padding:    2,
                color:      shown >= star ? '#fbbf24' : '#334155',
              }}
              aria-label={`${star} star`}
            >
              ★
            </button>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#64748b', marginBottom: 14, minHeight: 14 }}>
          {shown > 0 ? STAR_LABELS[shown - 1] : ''}
        </div>

        <textarea
          placeholder="Leave a comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={1000}
          style={{
            width:        '100%',
            boxSizing:    'border-box',
            background:   'rgba(255,255,255,0.03)',
            border:       '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            padding:      '8px 10px',
            color:        '#e2e8f0',
            fontSize:     13,
            fontFamily:   'inherit',
            resize:       'vertical',
            marginBottom: 12,
          }}
        />

        {error && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background:   'none',
              border:       '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              color:        '#94a3b8',
              padding:      '7px 16px',
              fontSize:     12,
              cursor:       'pointer',
              fontFamily:   'monospace',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              background:   '#166534',
              border:       'none',
              borderRadius: 6,
              color:        '#e2e8f0',
              padding:      '7px 16px',
              fontSize:     12,
              cursor:       submitting ? 'not-allowed' : 'pointer',
              fontFamily:   'monospace',
              opacity:      submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit Rating'}
          </button>
        </div>
      </form>
    </div>
  );
}