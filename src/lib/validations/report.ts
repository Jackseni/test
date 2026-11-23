import { z } from "zod";
import { monthKeysBetween } from "@/lib/utils/aggregation";
import { isValidIsoDate, monthRange } from "@/lib/utils/dates";

export const MAX_REPORT_MONTHS = 24;

export type ReportRange = {
  from: string;
  to: string;
  /** True when the requested range exceeded MAX_REPORT_MONTHS and `from` was moved forward. */
  clamped: boolean;
};

const isoDate = z
  .string()
  .refine(isValidIsoDate)
  .refine((v) => v >= "2000-01-01" && v <= "2100-12-31");

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/**
 * Never throws. Invalid/missing dates fall back to the current month
 * (`today` = "YYYY-MM-DD"); an inverted range is swapped; ranges longer than
 * 24 months are clamped to the 24 months ending at `to`.
 */
export function parseReportRange(
  params: Record<string, string | string[] | undefined>,
  today: string,
): ReportRange {
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7));
  const fallback = monthRange(todayYear, todayMonth);

  const rawFrom = isoDate.safeParse(first(params.from));
  const rawTo = isoDate.safeParse(first(params.to));
  let from = rawFrom.success ? rawFrom.data : undefined;
  let to = rawTo.success ? rawTo.data : undefined;

  if (!from && !to) return { ...fallback, clamped: false };
  // One bound given: use the month of the given bound for the other one.
  if (from && !to) to = monthRange(Number(from.slice(0, 4)), Number(from.slice(5, 7))).to;
  if (to && !from) from = monthRange(Number(to.slice(0, 4)), Number(to.slice(5, 7))).from;
  if (!from || !to) return { ...fallback, clamped: false };
  if (from > to) [from, to] = [to, from];

  const months = monthKeysBetween(from, to);
  if (months.length > MAX_REPORT_MONTHS) {
    const startKey = months[months.length - MAX_REPORT_MONTHS];
    return { from: `${startKey}-01`, to, clamped: true };
  }
  return { from, to, clamped: false };
}
