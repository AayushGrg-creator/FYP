import React from 'react';

/**
 * Pagination Component
 * Path: client/src/components/common/Pagination.jsx
 * * Generates a dynamic sliding page window to handle large record sets cleanly.
 * Implements strict index boundary locking and custom offset callbacks.
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  siblingCount = 1, // Number of visible pages to show on either side of the current selection
  styleOverrides = {}
}) {
  // Guard clause: suppress rendering if there's only a single page
  if (totalPages <= 1) return null;

  // ── Helper Logic: Generate Numeric Sequence Arrays ──
  const range = (start, end) => {
    let length = end - start + 1;
    return Array.from({ length }, (_, idx) => idx + start);
  };

  // ── Core Sliding Window Pagination Engine ──
  const computePaginationRange = () => {
    // Total visible element block slots: siblingCount + currentPage + firstPage + lastPage + 2*ellipses
    const totalPageNumbers = siblingCount + 5;

    // Case 1: If total pages are fewer than the slots we want to show, return the full range
    if (totalPageNumbers >= totalPages) {
      return range(1, totalPages);
    }

    // Calculate left and right sibling index boundaries
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    // Determine if we need to render ellipsis spacers
    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    // Case 2: Show right ellipsis only
    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      let leftRange = range(1, leftItemCount);
      return [...leftRange, 'DOTS_RIGHT', totalPages];
    }

    // Case 3: Show left ellipsis only
    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 3 + 2 * siblingCount;
      let rightRange = range(totalPages - rightItemCount + 1, totalPages);
      return [firstPageIndex, 'DOTS_LEFT', ...rightRange];
    }

    // Case 4: Show both left and right ellipses
    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [firstPageIndex, 'DOTS_LEFT', ...middleRange, 'DOTS_RIGHT', lastPageIndex];
    }
  };

  const paginationRange = computePaginationRange();

  // ── Boundary-Safe Event Handlers ──
  const handlePrev = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <nav 
      style={{ ...styles.container, ...styleOverrides }} 
      aria-label="Pagination Navigation Menu"
    >
      {/* Previous Arrow Button */}
      <button
        type="button"
        onClick={handlePrev}
        disabled={currentPage === 1}
        style={{ ...styles.arrowBtn, ...(currentPage === 1 ? styles.disabledBtn : {}) }}
        aria-label="Go to previous page"
      >
        ‹
      </button>

      {/* Main Page Numbers Mapping Loop */}
      <div style={styles.numbersGrid}>
        {paginationRange.map((pageNumber, index) => {
          // Render ellipsis spacer nodes securely
          if (pageNumber === 'DOTS_LEFT' || pageNumber === 'DOTS_RIGHT') {
            return (
              <span key={`dots-${index}`} style={styles.ellipsisSpacer}>
                •••
              </span>
            );
          }

          const isSelected = pageNumber === currentPage;

          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange && onPageChange(pageNumber)}
              aria-current={isSelected ? 'page' : undefined}
              style={{
                ...styles.pageBtn,
                ...(isSelected ? styles.activePageBtn : {})
              }}
            >
              {pageNumber}
            </button>
          );
        })}
      </div>

      {/* Next Arrow Button */}
      <button
        type="button"
        onClick={handleNext}
        disabled={currentPage === totalPages}
        style={{ ...styles.arrowBtn, ...(currentPage === totalPages ? styles.disabledBtn : {}) }}
        aria-label="Go to next page"
      >
        ›
      </button>
    </nav>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    padding: '16px 0',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxSizing: 'border-box',
    userSelect: 'none',
  },
  numbersGrid: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  pageBtn: {
    minWidth: '38px',
    height: '38px',
    padding: '0 6px',
    background: '#0B1120',
    border: '1px solid #1E293B',
    color: '#94A3B8',
    borderRadius: '8px',
    fontSize: '13.5px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    fontVariantNumeric: 'tabular-nums',
    boxSizing: 'border-box',
  },
  activePageBtn: {
    background: '#0EA5E9',
    borderColor: '#0284C7',
    color: '#ffffff',
    fontWeight: 700,
    boxShadow: '0 0 12px rgba(14, 165, 233, 0.25)',
  },
  arrowBtn: {
    width: '38px',
    height: '38px',
    background: '#111827',
    border: '1px solid #1E293B',
    color: '#E2E8F0',
    borderRadius: '8px',
    fontSize: '20px',
    fontWeight: 400,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    transition: 'all 0.15s ease',
    boxSizing: 'border-box',
  },
  ellipsisSpacer: {
    color: '#475569',
    fontSize: '11px',
    letterSpacing: '1px',
    padding: '0 4px',
    textAlign: 'center',
  },
  disabledBtn: {
    background: '#1E293B',
    borderColor: '#1E293B',
    color: '#475569',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
};