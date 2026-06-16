/**
 * TaskTide Currency Formatting Service
 * Path: client/src/utils/currencyUtils.js
 * * Standardizes financial display across the marketplace dashboard.
 */

export const formatCurrency = (amount, currency = 'USD') => {
  // Handle null, undefined, or non-numeric types gracefully
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount);
  
  if (isNaN(numericAmount)) return '—';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
};

/**
 * Compact formatting for dashboard headers (e.g., $1.2k)
 */
export const formatCompactCurrency = (amount, currency = 'USD') => {
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(numericAmount)) return '—';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    compactDisplay: 'short',
  }).format(numericAmount);
};