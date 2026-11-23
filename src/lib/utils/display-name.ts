/** Name shown in the UI: profile full_name (auth metadata) falling back to the e-mail. */
export function displayName(metadata: unknown, email: string): string {
  if (metadata && typeof metadata === "object" && "full_name" in metadata) {
    const value = (metadata as { full_name?: unknown }).full_name;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return email;
}

/** Up to two uppercase initials ("Ana Pérez" -> "AP"; e-mail -> first letter). */
export function initialsOf(name: string): string {
  const base = name.includes("@") ? name.split("@")[0] : name;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

/** First word of the name, for greetings ("Ana Pérez" -> "Ana"; e-mail -> local part). */
export function firstName(name: string): string {
  const base = name.includes("@") ? name.split("@")[0] : name;
  return base.split(/\s+/)[0] || base;
}
