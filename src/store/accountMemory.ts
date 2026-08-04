import type { CareerStateData } from "../domain";

type AccountMemory = {
  version: 1;
  userId: string;
  state: CareerStateData;
  dirty: boolean;
  updatedAt: string;
  lastSyncedAt: string | null;
};

const accountMemoryPrefix = "career-navigation-account-v1:";

export function readStorageItem(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorageItem(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // The account's cloud state remains usable when browser storage is unavailable.
  }
}

function memoryKey(userId: string) {
  return `${accountMemoryPrefix}${encodeURIComponent(userId)}`;
}

export function readAccountMemory(userId: string): AccountMemory | null {
  try {
    const raw = readStorageItem(memoryKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AccountMemory>;
    if (parsed.version !== 1 || parsed.userId !== userId || !parsed.state || typeof parsed.state !== "object") return null;
    return {
      version: 1,
      userId,
      state: parsed.state as CareerStateData,
      dirty: parsed.dirty === true,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      lastSyncedAt: typeof parsed.lastSyncedAt === "string" ? parsed.lastSyncedAt : null,
    };
  } catch {
    return null;
  }
}

export function saveAccountMemory(
  userId: string,
  state: CareerStateData,
  options: { dirty: boolean; updatedAt?: string; lastSyncedAt?: string | null },
) {
  const existing = readAccountMemory(userId);
  const record: AccountMemory = {
    version: 1,
    userId,
    state,
    dirty: options.dirty,
    updatedAt: options.updatedAt ?? new Date().toISOString(),
    lastSyncedAt: options.lastSyncedAt === undefined ? existing?.lastSyncedAt ?? null : options.lastSyncedAt,
  };
  writeStorageItem(memoryKey(userId), JSON.stringify(record));
  return record;
}
