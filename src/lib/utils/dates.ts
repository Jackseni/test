/**
 * Date helpers for Postgres `date` columns. Everything is a plain "YYYY-MM-DD"
 * string; we never round-trip through Date in local time to avoid timezone shifts.
 */

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function daysInMonth(year: number, month: number): number {
  // Date.UTC is timezone independent; day 0 of next month = last day of this one.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidIsoDate(value: string): boolean {
  const m = ISO_DATE_RE.exec(value);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

const pad = (n: number, len = 2) => String(n).padStart(len, "0");

export function toIsoDate(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** First and last day (inclusive) of a month, month is 1-12. */
export function monthRange(year: number, month: number): { from: string; to: string } {
  return { from: toIsoDate(year, month, 1), to: toIsoDate(year, month, daysInMonth(year, month)) };
}

export const DEFAULT_TIMEZONE = "America/Tegucigalpa";

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * Calendar date ("YYYY-MM-DD") of `now` in an IANA time zone. The server runs in
 * UTC, so server pages must pass the app time zone (getAppTimezone) rather than
 * rely on the runtime's local clock. Client form defaults pass the browser zone.
 */
export function todayIso(now: Date = new Date(), timeZone: string = DEFAULT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return toIsoDate(get("year"), get("month"), get("day"));
}

/** "2026-03-05" -> "05/03/2026" */
export function formatIsoDate(value: string): string {
  const m = ISO_DATE_RE.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}
