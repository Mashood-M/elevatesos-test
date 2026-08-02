import type { ElevatesStore } from "@/types";

const KEY = "elevates-os-demo-v17";

export function loadDemoStore(): ElevatesStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ElevatesStore;
  } catch {
    return null;
  }
}

export function saveDemoStore(store: ElevatesStore) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // quota / private mode — ignore
  }
}

export function clearDemoStore() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
