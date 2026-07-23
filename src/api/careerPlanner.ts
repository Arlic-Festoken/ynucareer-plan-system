import type { AiActionPlan, AiDirectionCandidate, AiDirectionResult, CareerProfile } from "../domain";

export type PlanningContext = {
  profile: CareerProfile;
  preferredScenes: string[];
  strengthEvidence: string;
  constraints: string;
  timeBudgetHours: number;
};

export type ActionPlanInput = PlanningContext & {
  selectedDirection: AiDirectionCandidate;
  horizonWeeks: number;
};

type ApiResponse<T> = {
  result?: T;
  message?: string;
  meta?: { provider: string; model: string; generatedAt: string };
};

async function request<T>(path: string, input: unknown): Promise<{ result: T; generatedAt: string }> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const data = await response.json() as ApiResponse<T>;
    if (!response.ok || !data.result) throw new Error(data.message || "AI 规划暂时不可用，请稍后重试。");
    return { result: data.result, generatedAt: data.meta?.generatedAt || new Date().toISOString() };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("AI 生成超时，请稍后重试。");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function requestDirectionCandidates(input: PlanningContext) {
  return request<AiDirectionResult>("/api/planning/directions", input);
}

export async function requestPersonalizedPlan(input: ActionPlanInput) {
  return request<AiActionPlan>("/api/planning/actions", input);
}
