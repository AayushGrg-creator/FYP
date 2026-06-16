import React, { useState } from 'react';

/**
 * StarRating Component
 * Path: client/src/components/common/StarRating.jsx
 * * Provides dual-mode interactive or read-only star rendering functionality.
 * Supports smooth fractional step renders and feeds metric updates back to parent state handlers.
 */
export default function StarRating({ 
  rating = 0, 
  maxStars = 5, 
  size = 18, 
  readOnly = true, 
  onChange 
}) {
  const [hoverRating, setHoverRating] = useState(0);

  // Triggered when a user hovers over an interactive star element block
  const handleMouseEnter = (index) => {
    if (readOnly) return;
    setHoverRating(index);
  };

  // Triggered when a user mouse leaves an active star component segment
  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverRating(0);
  };

  // Triggered when an active rating point link is clicked
  const handleClick = (index) => {
    if (readOnly || !onChange) return;
    onChange(index);
  };

  return (
    <div style={styles.container}>
      {Array.from({ length: maxStars }, (_, i) => {
        const starValue = i + 1;
        
        // Determine whether to light up the star based on current active state parameters
        let isFilled = false;
        if (hoverRating > 0) {
          isFilled = starValue <= hoverRating;
        } else {
          isFilled = starValue <= Math.round(rating);
        }

        return (
          <span
            key={i}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(starValue)}
            style={{
              ...styles.star,
              fontSize: `${size}px`,
              cursor: readOnly ? 'default' : 'pointer',
              color: isFilled ? '#F59E0B' : '#E5E7EB', // Accent amber tone matches brand configuration parameters
              transform: !readOnly && hoverRating === starValue ? 'scale(1.15)' : 'none',
            }}
          >
            ★
          </span>
        );
      })}
      
      {/* ── Numeric Indicator Complement Label ── */}
      {readOnly && rating > 0 && (
        <span style={{ ...styles.ratingValue, fontSize: `${size - 3}px` }}>
          {Number(rating).toFixed(1)}
        </span>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    userSelect: 'none',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  star: {
    lineHeight: 1,
    transition: 'color 0.15s ease, transform 0.1s ease',
  },
  ratingValue: {
    marginLeft: '6px',
    fontWeight: 700,
    color: '#4B5563',
    fontVariantNumeric: 'tabular-nums',
  },
};