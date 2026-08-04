import type {
  AbilityProfile,
  AbilityScores,
  ActionItem,
  CampusOpportunity,
  CohortInsights,
  DashboardAction,
  EvidenceRecord,
  NotificationItem,
  OpportunityParticipationStatus,
  OpportunityType,
} from "../domain";
import { apiUrl } from "./base";

export type StudentDashboard = {
  actions: DashboardAction[];
  abilityProfile: AbilityProfile;
  unreadNotifications: number;
};

export type StaffOpportunity = CampusOpportunity & {
  participationSummary: {
    opportunityId: string;
    saved: number;
    applied: number;
    submitted: number;
    verified: number;
    completed: number;
  };
};

export type OpportunityDraft = {
  title: string;
  summary: string;
  provider: string;
  type: OpportunityType;
  sourceUrl: string;
  applicationUrl: string;
  deadline: string;
  organizationId?: string;
  organizationName?: string;
  location: string;
  deliveryMode: "online" | "offline" | "hybrid";
  capacity: number | null;
  evidenceRequirement: string;
  abilityDimensions: CampusOpportunity["abilityDimensions"];
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

export function getStudentDashboard() {
  return request<StudentDashboard>("/me/dashboard");
}

export function getAbilityProfile() {
  return request<{ profile: AbilityProfile }>("/me/ability-profile");
}

export function saveAbilityProfile(selfRating: AbilityScores) {
  return request<{ profile: AbilityProfile }>("/me/ability-profile", { method: "PATCH", body: JSON.stringify({ selfRating }) });
}

export function getActions() {
  return request<{ actions: ActionItem[] }>("/me/actions");
}

export function createAction(input: Partial<ActionItem> & Pick<ActionItem, "title" | "detail">) {
  return request<{ action: ActionItem }>("/me/actions", { method: "POST", body: JSON.stringify(input) });
}

export function updateAction(id: string, input: Partial<Pick<ActionItem, "title" | "detail" | "priority" | "status" | "reflection">>) {
  return request<{ action: ActionItem }>(`/me/actions/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteAction(id: string) {
  return request<{ ok: true }>(`/me/actions/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function submitActionEvidence(input: {
  actionItemId: string;
  title?: string;
  description: string;
  evidenceUrl?: string;
  reflection: string;
}) {
  return request<{ evidence: EvidenceRecord }>("/me/evidence", { method: "POST", body: JSON.stringify(input) });
}

export function getNotifications() {
  return request<{ notifications: NotificationItem[] }>("/me/notifications");
}

export function markNotification(id: string, read = true) {
  return request<{ ok: true }>(`/me/notifications/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ read }) });
}

export function calendarUrl() {
  return apiUrl("/me/calendar.ics");
}

export function saveParticipation(opportunityId: string, input: {
  status: OpportunityParticipationStatus;
  evidenceNote?: string;
  evidenceUrl?: string;
  reflection?: string;
}) {
  return request<{ opportunity: CampusOpportunity; participation: NonNullable<CampusOpportunity["participation"]> }>(
    `/opportunities/${encodeURIComponent(opportunityId)}/participation`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function getStaffOpportunities() {
  return request<{ opportunities: StaffOpportunity[] }>("/staff/opportunities");
}

export function createOpportunityDraft(input: OpportunityDraft) {
  return request<{ opportunity: CampusOpportunity }>("/staff/opportunities", { method: "POST", body: JSON.stringify(input) });
}

export function updateOpportunityDraft(id: string, input: OpportunityDraft) {
  return request<{ opportunity: CampusOpportunity }>(`/staff/opportunities/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function submitOpportunityForReview(id: string) {
  return request<{ opportunity: CampusOpportunity }>(`/staff/opportunities/${encodeURIComponent(id)}/submit`, { method: "POST", body: "{}" });
}

export function reviewOpportunity(id: string, decision: "approved" | "changes_requested", note = "") {
  return request<{ opportunity: CampusOpportunity }>(`/staff/opportunities/${encodeURIComponent(id)}/review`, {
    method: "POST",
    body: JSON.stringify({ decision, note }),
  });
}

export function setStaffOpportunityStatus(id: string, status: "published" | "closed" | "archived") {
  return request<{ opportunity: CampusOpportunity }>(`/staff/opportunities/${encodeURIComponent(id)}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function getEvidenceQueue() {
  return request<{ evidence: Array<EvidenceRecord & { provider: string; evidenceRequirement: string }> }>("/staff/evidence");
}

export function reviewEvidence(
  id: string,
  input: {
    decision: "verified" | "changes_requested";
    feedback: string;
    rubric: EvidenceRecord["rubric"];
  },
) {
  return request<{ evidence: EvidenceRecord }>(`/staff/evidence/${encodeURIComponent(id)}/review`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getCohortInsights() {
  return request<{ insights: CohortInsights }>("/staff/insights");
}
