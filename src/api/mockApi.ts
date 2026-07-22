import {
  adminOverview,
  awakeningSteps,
  jobs,
  matchResults,
  roadmap,
  students,
} from "../data/mockData";
import { delay } from "./delay";

export async function getStudent(role: "freshman" | "junior") {
  await delay(260);
  return students[role];
}

export async function getAwakeningSteps() {
  await delay(260);
  return awakeningSteps;
}

export async function getJobs() {
  await delay(300);
  return jobs;
}

export async function getMatchResult(jobId = "data-analyst") {
  await delay(680);
  return matchResults.find((item) => item.jobId === jobId) ?? matchResults[0];
}

export async function getRoadmap() {
  await delay(680);
  return roadmap;
}

export async function getAdminOverview() {
  await delay(340);
  return adminOverview;
}
