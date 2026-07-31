import type { AiActionPlan, AiDirectionCandidate, AiDirectionResult, CareerProfile, GenerationTrace } from "../domain";
import { apiUrl } from "./base";

export type PlanningContext = {
  profile: CareerProfile;
  preferredScenes: string[];
  strengthEvidence: string;
  constraints: string;
  timeBudgetHours: number;
  directionCalibration: {
    selectedDirectionTitle: string;
    visionText: string;
    visionTags: string[];
    motivation: Record<string, number>;
    revision: number;
  };
};

export type ActionPlanInput = PlanningContext & {
  selectedDirection: AiDirectionCandidate;
  horizonWeeks: number;
};

type ApiResponse<T> = {
  result?: T;
  message?: string;
  meta?: {
    provider: string;
    model: string;
    generatedAt: string;
    promptVersion?: string;
    ruleVersion?: string;
    resourceIds?: string[];
  };
};

async function request<T>(path: string, input: unknown): Promise<{ result: T; generatedAt: string; trace: GenerationTrace }> {
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
    const generatedAt = data.meta?.generatedAt || new Date().toISOString();
    return {
      result: data.result,
      generatedAt,
      trace: {
        generator: "ai",
        promptVersion: data.meta?.promptVersion || "unknown",
        ruleVersion: data.meta?.ruleVersion || "career-rules-0.7.0",
        model: data.meta?.model || "unknown",
        generatedAt,
        resourceIds: Array.isArray(data.meta?.resourceIds) ? data.meta.resourceIds : [],
        autonomous: true,
      },
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("AI 生成超时，请稍后重试。");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function requestDirectionCandidates(input: PlanningContext) {
  return request<AiDirectionResult>(apiUrl("/planning/directions"), input);
}

export async function requestPersonalizedPlan(input: ActionPlanInput) {
  return request<AiActionPlan>(apiUrl("/planning/actions"), input);
}
