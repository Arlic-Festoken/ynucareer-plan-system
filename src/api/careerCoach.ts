import type { CareerProfile } from "../domain";

export type CoachAdvice = {
  headline: string;
  summary: string;
  nextActions: Array<{ title: string; why: string }>;
  caution: string;
};

export type CoachInput = {
  profile: CareerProfile;
  nextAction: { title: string; detail: string };
  question?: string;
};

export type CoachStatus = "ready" | "not_configured" | "unavailable";

export async function getCoachStatus(signal?: AbortSignal): Promise<CoachStatus> {
  try {
    const response = await fetch("/api/healthz", { signal });
    if (!response.ok) return "unavailable";
    const data = await response.json() as { ai?: string };
    return data.ai === "ready" ? "ready" : "not_configured";
  } catch {
    return "unavailable";
  }
}

export async function requestCoach(input: CoachInput): Promise<CoachAdvice> {
  const response = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const data = await response.json() as { advice?: CoachAdvice; message?: string };
  if (!response.ok || !data.advice) throw new Error(data.message || "AI 服务暂时不可用，请稍后重试。");
  return data.advice;
}
