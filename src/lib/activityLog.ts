export type ActivityType =
  | 'upload_success'
  | 'upload_failed'
  | 'verify_success'
  | 'verify_failed'
  | 'document_deleted'
  | 'plan_upgraded'
  | 'login';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
}

const MAX_ENTRIES = 50;

function storageKey(userId: string) {
  return `vs_activity_${userId}`;
}

export function logActivity(userId: string, entry: Omit<ActivityEntry, 'id' | 'timestamp'>) {
  try {
    const key = storageKey(userId);
    const existing: ActivityEntry[] = JSON.parse(localStorage.getItem(key) || '[]');
    const newEntry: ActivityEntry = {
      ...entry,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    const updated = [newEntry, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // localStorage might be unavailable — fail silently
  }
}

export function getActivityLog(userId: string): ActivityEntry[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId)) || '[]');
  } catch {
    return [];
  }
}

export function clearActivityLog(userId: string) {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {}
}
