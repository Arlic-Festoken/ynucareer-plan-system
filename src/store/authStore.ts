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
import { careerStateSnapshot, useCareerStore } from "./careerStore";

type AuthStatus = "idle" | "checking" | "guest" | "authenticated";
type SyncStatus = "idle" | "loading" | "saving" | "saved" | "error";

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
  syncCareerNow: () => Promise<void>;
};

let activeUserId = "";
let syncReady = false;
let syncTimer: number | undefined;
let subscribed = false;
const syncOwnerKey = "career-navigation-sync-owner";
const syncDirtyKey = "career-navigation-sync-dirty";

async function hydrateAccount(user: AccountUser, newAccount = false) {
  syncReady = false;
  activeUserId = user.id;
  useAuthStore.setState({ status: "checking", syncStatus: "loading", user, error: "" });
  const [{ profile }, { state }] = await Promise.all([getAccountProfile(), getRemoteCareerState()]);
  if (state && !newAccount) {
    const hasUnsyncedLocalState =
      window.localStorage.getItem(syncOwnerKey) === user.id &&
      window.localStorage.getItem(syncDirtyKey) === "1";
    if (hasUnsyncedLocalState) {
      await saveRemoteCareerState(careerStateSnapshot(useCareerStore.getState()));
    } else {
      useCareerStore.getState().replaceCareerData(state);
    }
  } else if (!newAccount && useCareerStore.getState().hasOnboarded) {
    await saveRemoteCareerState(careerStateSnapshot(useCareerStore.getState()));
  } else {
    useCareerStore.getState().resetDemo();
  }
  window.localStorage.setItem(syncOwnerKey, user.id);
  window.localStorage.removeItem(syncDirtyKey);
  useAuthStore.setState({ status: "authenticated", syncStatus: "saved", user, profile, lastSyncedAt: new Date().toISOString() });
  syncReady = true;
  startCareerSubscription();
}

function startCareerSubscription() {
  if (subscribed) return;
  subscribed = true;
  useCareerStore.subscribe(() => {
    if (!syncReady || !activeUserId) return;
    window.clearTimeout(syncTimer);
    window.localStorage.setItem(syncOwnerKey, activeUserId);
    window.localStorage.setItem(syncDirtyKey, "1");
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
    window.clearTimeout(syncTimer);
    useCareerStore.getState().resetDemo();
    window.localStorage.removeItem(syncOwnerKey);
    window.localStorage.removeItem(syncDirtyKey);
    set({ status: "guest", syncStatus: "idle", user: null, profile: null, error: "", lastSyncedAt: null });
  },
  saveProfile: async (profile) => {
    set({ syncStatus: "saving", error: "" });
    try {
      const response = await updateAccountProfile(profile);
      set({ profile: response.profile, syncStatus: "saved", lastSyncedAt: new Date().toISOString() });
    } catch (error) {
      set({ syncStatus: "error", error: error instanceof Error ? error.message : "资料保存失败。" });
      throw error;
    }
  },
  syncCareerNow: async () => {
    if (!activeUserId || get().status !== "authenticated") return;
    window.clearTimeout(syncTimer);
    set({ syncStatus: "saving" });
    try {
      const result = await saveRemoteCareerState(careerStateSnapshot(useCareerStore.getState()));
      window.localStorage.setItem(syncOwnerKey, activeUserId);
      window.localStorage.removeItem(syncDirtyKey);
      set({ syncStatus: "saved", lastSyncedAt: result.updatedAt, error: "" });
    } catch (error) {
      set({ syncStatus: "error", error: error instanceof Error ? error.message : "同步失败。" });
    }
  },
}));
