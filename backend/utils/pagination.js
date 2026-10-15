// Page/limit parsing and response metadata for the paginated user endpoints.
// Parsing follows the admin controllers: invalid or missing values fall back
// to page 1 / the endpoint's default limit, and limit is capped at 100.

const MAX_PAGE_LIMIT = 100;

// Callers that send neither `page` nor `limit` keep the original, unpaginated
// response, so existing consumers are not broken.
const isPaginationRequested = (query) =>
  query.page !== undefined || query.limit !== undefined;

const parsePagination = (query, defaultLimit) => ({
  page: Math.max(parseInt(query.page) || 1, 1),
  limit: Math.min(
    Math.max(parseInt(query.limit) || defaultLimit, 1),
    MAX_PAGE_LIMIT,
  ),
});

// A page past the end is clamped to the last page (page 1 when empty), so a
// client whose last item was removed gets the last valid page back.
const buildPagination = (totalItems, requestedPage, limit) => {
  const totalPages = Math.ceil(totalItems / limit);
  const currentPage = Math.min(requestedPage, Math.max(totalPages, 1));
  return {
    currentPage,
    limit,
    totalItems,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
};

module.exports = { isPaginationRequested, parsePagination, buildPagination };
