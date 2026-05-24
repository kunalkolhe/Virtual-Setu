// Lightweight localStorage store for document expiry dates.
// Keyed as `vs_expiry_${userId}_${docId}` so each user's data is isolated.
// No DB schema change required.

export interface ExpiryRecord {
  expiryDate: string | null;   // ISO date YYYY-MM-DD, or null if the doc has no expiry
  documentNumber: string | null;
  storedAt: string;            // ISO timestamp of when this was saved
}

function key(userId: string, docId: string) {
  return `vs_expiry_${userId}_${docId}`;
}

export function saveExpiry(userId: string, docId: string, record: ExpiryRecord) {
  try {
    localStorage.setItem(key(userId, docId), JSON.stringify(record));
  } catch {}
}

export function getExpiry(userId: string, docId: string): ExpiryRecord | null {
  try {
    const raw = localStorage.getItem(key(userId, docId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function removeExpiry(userId: string, docId: string) {
  try {
    localStorage.removeItem(key(userId, docId));
  } catch {}
}

export type ExpiryStatus = 'none' | 'expired' | 'critical' | 'warning' | 'ok';

export function getExpiryStatus(expiryDate: string | null | undefined): ExpiryStatus {
  if (!expiryDate) return 'none';
  const now = new Date();
  const exp = new Date(expiryDate);
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'critical';
  if (diffDays <= 90) return 'warning';
  return 'ok';
}

export function formatExpiryDate(expiryDate: string): string {
  return new Date(expiryDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function daysUntilExpiry(expiryDate: string): number {
  const now = new Date();
  const exp = new Date(expiryDate);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
