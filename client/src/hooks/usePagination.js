import { useState, useMemo, useCallback } from 'react';

/**
 * usePagination Custom Hook
 * Path: client/src/hooks/usePagination.js
 * * Manages the sliced data vector state for any array-based record collection.
 * Features automatic boundary clamping, index safety, and slice window generation.
 */
export function usePagination(items = [], itemsPerPage = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  // ── Computed Slice Index Boundaries ──
  const totalPages = useMemo(() => Math.max(1, Math.ceil(items.length / itemsPerPage)), [items, itemsPerPage]);

  // Ensure current page never drifts out-of-bounds if the item list changes (e.g., filters applied)
  useMemo(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // ── Sliced Window Extraction ──
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  // ── Navigation Control Methods ──
  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const jumpToPage = useCallback((pageNumber) => {
    const page = Math.max(1, Math.min(pageNumber, totalPages));
    setCurrentPage(page);
  }, [totalPages]);

  return {
    currentPage,
    totalPages,
    currentItems,
    nextPage,
    prevPage,
    jumpToPage,
    setCurrentPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
}