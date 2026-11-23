/** Postgres text cannot store NUL (\u0000); reject it up front instead of failing in the DB. */
export const noNul = (v: string): boolean => !v.includes("\u0000");
