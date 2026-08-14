export function normalizeWorkEmailDomain(email) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  const match = normalized.match(/^[^\s@]+@([^\s@]+\.[^\s@]+)$/);
  return match?.[1] || null;
}

export function isValidIanaTimezone(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    Intl.DateTimeFormat('en', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
