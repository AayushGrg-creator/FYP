/**
 * TaskTide Pagination Service
 * Path: server/src/utils/pagination.js
 * * Standardizes list slicing for frontend consumption.
 */

export const paginate = (items = [], page = 1, limit = 10) => {
  // 1. Sanitize inputs to ensure integers
  const currentPage = Math.max(1, parseInt(page));
  const pageSize = Math.max(1, parseInt(limit));
  const totalItems = items.length;
  
  // 2. Calculate bounds
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  // 3. Slice and derive metadata
  const paginatedItems = items.slice(startIndex, endIndex);
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    items: paginatedItems,
    pagination: {
      currentPage,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    }
  };
};