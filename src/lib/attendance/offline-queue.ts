export type OfflineCheckInItem = {
  id: string;
  eventId: string;
  qrCode: string;
  status: string;
  queuedAt: string;
};

const keyFor = (eventId: string) => `elevates-offline-checkin:${eventId}`;

export function loadOfflineQueue(eventId: string): OfflineCheckInItem[] {
  if (typeof window === "undefined" || !eventId) return [];
  try {
    const raw = localStorage.getItem(keyFor(eventId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineCheckInItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(eventId: string, items: OfflineCheckInItem[]) {
  if (typeof window === "undefined" || !eventId) return;
  localStorage.setItem(keyFor(eventId), JSON.stringify(items));
}

export function enqueueOfflineCheckIn(
  eventId: string,
  item: Omit<OfflineCheckInItem, "id" | "queuedAt">,
): OfflineCheckInItem[] {
  const existing = loadOfflineQueue(eventId);
  const withoutDup = existing.filter((e) => e.qrCode !== item.qrCode);
  const next: OfflineCheckInItem = {
    ...item,
    id: `off-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    queuedAt: new Date().toISOString(),
  };
  const list = [...withoutDup, next];
  saveOfflineQueue(eventId, list);
  return list;
}

export function clearOfflineQueue(eventId: string) {
  if (typeof window === "undefined" || !eventId) return;
  localStorage.removeItem(keyFor(eventId));
}

export type OfflineRegSnapshot = {
  eventId: string;
  savedAt: string;
  regs: { id: string; qrCode: string; userId: string }[];
};

const snapKey = (eventId: string) => `elevates-offline-regs:${eventId}`;

export function saveRegSnapshot(snap: OfflineRegSnapshot) {
  if (typeof window === "undefined") return;
  localStorage.setItem(snapKey(snap.eventId), JSON.stringify(snap));
}

export function loadRegSnapshot(eventId: string): OfflineRegSnapshot | null {
  if (typeof window === "undefined" || !eventId) return null;
  try {
    const raw = localStorage.getItem(snapKey(eventId));
    return raw ? (JSON.parse(raw) as OfflineRegSnapshot) : null;
  } catch {
    return null;
  }
}
