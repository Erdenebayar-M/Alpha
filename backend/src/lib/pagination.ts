// Shared by the Article list routes (admin and public): both page a Prisma
// `findMany` the same way and report the same `meta` shape back.

export function paginationSkipTake(page: number, per_page: number) {
  return { skip: (page - 1) * per_page, take: per_page };
}

export function paginationMeta(page: number, per_page: number, total: number) {
  return { page, per_page, total, has_next: page * per_page < total };
}
