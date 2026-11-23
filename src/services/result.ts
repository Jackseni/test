import "server-only";

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

export const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
export const success = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });

export const GENERIC_ERROR = "Ocurrió un error inesperado. Inténtalo de nuevo.";
export const NOT_FOUND = "El registro no existe o no tienes acceso a él.";

/** Minimal shape of a PostgREST error; the raw message is never shown to users. */
export type DbError = { code?: string; message?: string } | null;
