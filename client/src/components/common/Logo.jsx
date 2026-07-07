import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Logo Component
 * Path: client/src/components/common/Logo.jsx
 *
 * Single source of truth for the TaskTide logo image.
 * Clicking it always navigates to the landing page ("/").
 * Import this everywhere instead of writing <img src="/logo.png" ... /> by hand.
 */
export default function Logo({ height = 40, style = {}, className = '' }) {
  return (
    <Link to="/" className={className} style={{ display: 'inline-flex', alignItems: 'center' }}>
      <img
        src="/logo.png"
        alt="TaskTide logo"
        style={{ height: `${height}px`, verticalAlign: 'middle', ...style }}
      />
    </Link>
  );
}