export type PageInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** 0-based inclusive range for Supabase `.range()` */
  rangeFrom: number;
  rangeTo: number;
};

export function buildPageInfo(page: number, pageSize: number, total: number): PageInfo {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeFrom = (page - 1) * pageSize;
  return { page, pageSize, total, totalPages, rangeFrom, rangeTo: rangeFrom + pageSize - 1 };
}
