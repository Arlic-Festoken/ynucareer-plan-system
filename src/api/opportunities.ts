import type { CampusOpportunity, OpportunityParticipationStatus, OpportunityType } from "../domain";
import { apiUrl } from "./base";

export type TeacherOpportunity = CampusOpportunity & {
  participationSummary: { opportunityId: string; saved: number; applied: number; submitted: number; verified: number; completed: number };
};

export type OpportunityDraft = {
  title: string;
  summary: string;
  provider: string;
  type: OpportunityType;
  sourceUrl: string;
  applicationUrl: string;
  deadline: string;
  eligibility: CampusOpportunity["eligibility"];
  tags: string[];
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...options,
    credentials: "same-origin",
    headers: options?.body ? { "Content-Type": "application/json", ...options.headers } : options?.headers,
  });
  const data = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(data.message || "请求无法完成，请稍后再试。");
  return data;
}

export function getOpportunities() {
  return request<{ opportunities: CampusOpportunity[] }>("/opportunities");
}

export function saveOpportunityParticipation(opportunityId: string, input: { status: OpportunityParticipationStatus; evidenceNote?: string; evidenceUrl?: string; reflection?: string }) {
  return request<{ opportunity: CampusOpportunity; participation: NonNullable<CampusOpportunity["participation"]> }>(`/opportunities/${encodeURIComponent(opportunityId)}/participation`, { method: "POST", body: JSON.stringify(input) });
}

export function getTeacherOpportunities() {
  return request<{ opportunities: TeacherOpportunity[] }>("/teacher/opportunities");
}

export function createTeacherOpportunity(input: OpportunityDraft) {
  return request<{ opportunity: CampusOpportunity }>("/teacher/opportunities", { method: "POST", body: JSON.stringify(input) });
}

export function updateTeacherOpportunityStatus(opportunityId: string, status: "open" | "closed") {
  return request<{ opportunity: CampusOpportunity }>(`/teacher/opportunities/${encodeURIComponent(opportunityId)}`, { method: "PATCH", body: JSON.stringify({ status }) });
}
