import type { CareerStateData, Permission } from "../domain";
import { apiUrl } from "./base";

export type AccountUser = {
  id: string;
  email: string;
  displayName: string;
  role: "student" | "teacher";
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
};

export type AccountProfile = {
  university: string;
  college: string;
  major: string;
  grade: number;
  bio: string;
  updatedAt?: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...options,
    credentials: "same-origin",
    headers: options?.body ? { "Content-Type": "application/json", ...options.headers } : options?.headers,
  });
  const data = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(data.message || (response.status === 401 ? "authentication_required" : "请求无法完成。"));
  return data;
}

export async function registerAccount(input: { email: string; password: string; displayName: string }) {
  return request<{ user: AccountUser }>("/auth/register", { method: "POST", body: JSON.stringify(input) });
}

export async function loginAccount(input: { email: string; password: string }) {
  return request<{ user: AccountUser }>("/auth/login", { method: "POST", body: JSON.stringify(input) });
}

export async function logoutAccount() {
  return request<{ ok: true }>("/auth/logout", { method: "POST", body: "{}" });
}

export async function getSession() {
  return request<{ user: AccountUser }>("/auth/session");
}

export async function getAccountProfile() {
  return request<{ profile: AccountProfile | null }>("/me/profile");
}

export async function updateAccountProfile(profile: AccountProfile) {
  return request<{ profile: AccountProfile }>("/me/profile", { method: "PATCH", body: JSON.stringify(profile) });
}

export async function getRemoteCareerState() {
  return request<{ state: CareerStateData | null }>("/me/career-state");
}

export async function saveRemoteCareerState(state: CareerStateData) {
  return request<{ updatedAt: string }>("/me/career-state", { method: "PUT", body: JSON.stringify({ state }) });
}
