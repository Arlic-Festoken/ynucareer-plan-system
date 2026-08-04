import { create } from "zustand";
import {
  getAccountProfile,
  getRemoteCareerState,
  getSession,
  loginAccount,
  logoutAccount,
  registerAccount,
  saveRemoteCareerState,
  updateAccountProfile,
  type AccountProfile,
  type AccountUser,
} from "../api/account";
import { readAccountMemory, readStorageItem, removeStorageItem, saveAccountMemory, writeStorageItem } from "./accountMemory";
import { careerStateSnapshot, useCareerStore } from "./careerStore";

type AuthStatus = "idle" | "checking" | "guest" | "authenticated";
export type SyncStatus = "idle" | "loading" | "saving" | "saved" | "error";

type AuthStore = {
  status: AuthStatus;
  syncStatus: SyncStatus;
  user: AccountUser | null;
  profile: AccountProfile | null;
  error: string;
  lastSyncedAt: string | null;
  initialize: () => Promise<void>;
  register: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  saveProfile: (profile: AccountProfile) => Promise<void>;
  syncCareerNow: () => Promise<boolean>;
};

let activeUserId = "";
let syncReady = false;
let syncTimer: number | undefined;
let subscribed = false;
let stateRevision = 0;
let syncPromise: Promise<boolean> | null = null;
const syncOwnerKey = "career-navigation-sync-owner";
const syncDirtyKey = "career-navigation-sync-dirty";

function legacyCareerState(userId: string) {
  const owner = readStorageItem(syncOwnerKey);
  const snapshot = careerStateSnapshot(useCareerStore.getState());
  if (!snapshot.hasOnboarded || (owner && owner !== userId)) return null;
  return snapshot;
}

async function hydrateAccount(user: AccountUser, newAccount = false) {
  syncReady = false;
  activeUserId = user.id;
  stateRevision = 0;
  useAuthStore.setState({ status: "checking", syncStatus: "loading", user, error: "" });
  const local = readAccountMemory(user.id);
  const [profileResult, remoteResult] = await Promise.allSettled([getAccountProfile(), getRemoteCareerState()]);
  const profile = profileResult.status === "fulfilled" ? profileResult.value.profile : null;
  const remote = remoteResult.status === "fulfilled" ? remoteResult.value : null;
  let shouldUpload = false;

  if (newAccount) {
    useCareerStore.getState().resetDemo();
  } else if (local?.dirty) {
    useCareerStore.getState().replaceCareerData(local.state);
    shouldUpload = true;
  } else if (remote?.state) {
    useCareerStore.getState().replaceCareerData(remote.state);
  } else if (local) {
    useCareerStore.getState().replaceCareerData(local.state);
    shouldUpload = remoteResult.status === "fulfilled";
  } else if (legacyCareerState(user.id)) {
    useCareerStore.getState().replaceCareerData(legacyCareerState(user.id));
    shouldUpload = true;
  } else {
    useCareerStore.getState().resetDemo();
  }

  const restoredState = careerStateSnapshot(useCareerStore.getState());
  const lastSyncedAt = remote?.updatedAt ?? local?.lastSyncedAt ?? null;
  saveAccountMemory(user.id, restoredState, { dirty: shouldUpload, lastSyncedAt });
  writeStorageItem(syncOwnerKey, user.id);
  if (shouldUpload) writeStorageItem(syncDirtyKey, "1");
  else removeStorageItem(syncDirtyKey);
  const cloudUnavailable = profileResult.status === "rejected" || remoteResult.status === "rejected";
  useAuthStore.setState({
    status: "authenticated",
    syncStatus: shouldUpload ? "saving" : cloudUnavailable ? "error" : "saved",
    user,
    profile,
    lastSyncedAt,
    error: cloudUnavailable ? "云端暂时不可用，已从本机恢复你的计划。" : "",
  });
  syncReady = true;
  startCareerSubscription();
  if (shouldUpload) await useAuthStore.getState().syncCareerNow();
}

function startCareerSubscription() {
  if (subscribed) return;
  subscribed = true;
  useCareerStore.subscribe(() => {
    if (!syncReady || !activeUserId) return;
    stateRevision += 1;
    window.clearTimeout(syncTimer);
    writeStorageItem(syncOwnerKey, activeUserId);
    writeStorageItem(syncDirtyKey, "1");
    saveAccountMemory(activeUserId, careerStateSnapshot(useCareerStore.getState()), { dirty: true });
    useAuthStore.setState({ syncStatus: "saving" });
    syncTimer = window.setTimeout(() => {
      void useAuthStore.getState().syncCareerNow();
    }, 900);
  });
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: "idle",
  syncStatus: "idle",
  user: null,
  profile: null,
  error: "",
  lastSyncedAt: null,
  initialize: async () => {
    if (get().status !== "idle") return;
    set({ status: "checking", error: "" });
    try {
      const { user } = await getSession();
      await hydrateAccount(user);
    } catch {
      activeUserId = "";
      syncReady = false;
      set({ status: "guest", syncStatus: "idle", user: null, profile: null });
    }
  },
  register: async (input) => {
    set({ error: "" });
    try {
      const { user } = await registerAccount(input);
      await hydrateAccount(user, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "注册失败，请稍后重试。";
      set({ error: message });
      throw error;
    }
  },
  login: async (input) => {
    set({ error: "" });
    try {
      const { user } = await loginAccount(input);
      await hydrateAccount(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : "登录失败，请稍后重试。";
      set({ error: message });
      throw error;
    }
  },
  logout: async () => {
    if (get().status === "authenticated") await get().syncCareerNow();
    await logoutAccount();
    activeUserId = "";
    syncReady = false;
    stateRevision = 0;
    window.clearTimeout(syncTimer);
    useCareerStore.getState().resetDemo();
    removeStorageItem(syncOwnerKey);
    removeStorageItem(syncDirtyKey);
    set({ status: "guest", syncStatus: "idle", user: null, profile: null, error: "", lastSyncedAt: null });
  },
  saveProfile: async (profile) => {
    set({ syncStatus: "saving", error: "" });
    try {
      const response = await updateAccountProfile(profile);
      const local = activeUserId ? readAccountMemory(activeUserId) : null;
      set({ profile: response.profile, syncStatus: local?.dirty ? "saving" : "saved", lastSyncedAt: new Date().toISOString() });
    } catch (error) {
      set({ syncStatus: "error", error: error instanceof Error ? error.message : "资料保存失败。" });
      throw error;
    }
  },
  syncCareerNow: async () => {
    if (!activeUserId || get().status !== "authenticated") return false;
    window.clearTimeout(syncTimer);
    if (syncPromise) return syncPromise;
    syncPromise = (async () => {
      while (activeUserId && get().status === "authenticated") {
        const userId = activeUserId;
        const revision = stateRevision;
        const snapshot = careerStateSnapshot(useCareerStore.getState());
        saveAccountMemory(userId, snapshot, { dirty: true });
        set({ syncStatus: "saving" });
        try {
          const result = await saveRemoteCareerState(snapshot);
          if (activeUserId !== userId) return false;
          if (revision !== stateRevision) continue;
          saveAccountMemory(userId, snapshot, { dirty: false, updatedAt: result.updatedAt, lastSyncedAt: result.updatedAt });
          writeStorageItem(syncOwnerKey, userId);
          removeStorageItem(syncDirtyKey);
          set({ syncStatus: "saved", lastSyncedAt: result.updatedAt, error: "" });
          return true;
        } catch (error) {
          writeStorageItem(syncOwnerKey, userId);
          writeStorageItem(syncDirtyKey, "1");
          saveAccountMemory(userId, snapshot, { dirty: true });
          set({ syncStatus: "error", error: error instanceof Error ? error.message : "同步失败，计划已保存在本机。" });
          return false;
        }
      }
      return false;
    })().finally(() => {
      syncPromise = null;
    });
    return syncPromise;
  },
}));
