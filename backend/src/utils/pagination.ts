import type { PaginationMeta } from "../types/pagination.js";

export const createPaginationMeta = (
  page: number,
  limit: number,
  totalItems: number,
): PaginationMeta => ({
  page,
  limit,
  totalItems,
  totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
});
