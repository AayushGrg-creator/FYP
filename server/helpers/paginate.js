/**
 * TaskTide Pagination Helper
 * Path: server/helpers/paginate.js
 *
 * Builds Mongoose-ready pagination params (skip/limit) for a given model +
 * filter, and returns the document counts needed to render pagination UI.
 *
 * Contract expected by job.service.js:
 *   const { skip, limitN, totalDocs, totalPages } =
 *     await buildPaginationQuery(Model, filter, page, limit);
 */

'use strict';

async function buildPaginationQuery(Model, filter = {}, page = 1, limit = 10) {
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const limitN       = Math.max(1, parseInt(limit, 10) || 10);
  const skip         = (currentPage - 1) * limitN;

  const totalDocs  = await Model.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalDocs / limitN));

  return { skip, limitN, totalDocs, totalPages };
}

module.exports = { buildPaginationQuery };