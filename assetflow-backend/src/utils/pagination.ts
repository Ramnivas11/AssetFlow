export interface PaginationInput {
    page?: number;
    limit?: number;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const normalizePagination = (input: PaginationInput = {}) => {
    const page = Math.max(input.page ?? DEFAULT_PAGE, 1);
    const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    return {
        page,
        limit,
        skip: (page - 1) * limit,
        take: limit,
    };
};

export const buildPaginationMeta = (page: number, limit: number, total: number): PaginationMeta => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
});
