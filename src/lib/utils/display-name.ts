/** Name shown in the UI: profile full_name (auth metadata) falling back to the e-mail. */
export function displayName(metadata: unknown, email: string): string {
  if (metadata && typeof metadata === "object" && "full_name" in metadata) {
    const value = (metadata as { full_name?: unknown }).full_name;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return email;
}

/**
 * Up to two uppercase initials, sliced by Unicode code point (never splits a surrogate pair).
 * Several words -> first letter of the first two ("Ana Pérez" -> "AP").
 * One word -> its first two characters ("Ana" -> "AN"). E-mail -> same rules on the local part
 * ("juan.lopez@x.com" -> "JL", "maria@x.com" -> "MA"). Empty -> "?".
 */
export function initialsOf(name: string): string {
  const base = name.includes("@") ? name.split("@")[0] : name;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  const first = (s: string) => Array.from(s)[0] ?? "";
  const letters =
    parts.length > 1 ? first(parts[0]) + first(parts[1]) : Array.from(parts[0] ?? "?").slice(0, 2).join("");
  return letters.toUpperCase();
}

/** First word of the name, for greetings ("Ana Pérez" -> "Ana"; e-mail -> local part). */
export function firstName(name: string): string {
  const base = name.includes("@") ? name.split("@")[0] : name;
  return base.trim().split(/\s+/)[0] ?? "";
}
