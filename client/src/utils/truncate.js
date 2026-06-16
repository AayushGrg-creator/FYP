/**
 * TaskTide Text Utility Service
 * Path: client/src/utils/textUtils.js
 */

export const truncate = (text, length = 100) => {
  // Defensive check for null/undefined or non-string inputs
  if (!text || typeof text !== 'string') return '';
  
  // Return early if within limit
  if (text.length <= length) return text;

  // Trim to the target length
  const truncated = text.substring(0, length);

  // Find the last space to avoid cutting in the middle of a word
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  // If there's a space, trim to that point; otherwise, hard cut
  const finalString = lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) : truncated;

  return `${finalString}...`;
};