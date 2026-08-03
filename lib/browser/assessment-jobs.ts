import type { WritingSubmission } from "@/lib/types";

export interface PendingAssessmentJob {
  jobId: string;
  createdAt: string;
  feedbackLanguage: "zh" | "en";
  submission: WritingSubmission;
  sections?: string[];
}

const STORAGE_KEY = "examinai-pending-assessment-jobs-v1";

function isPendingAssessmentJob(value: unknown): value is PendingAssessmentJob {
  if (!value || typeof value !== "object") return false;
  const job = value as Record<string, unknown>;
  const submission = job.submission as Record<string, unknown> | undefined;
  return typeof job.jobId === "string"
    && typeof job.createdAt === "string"
    && (job.feedbackLanguage === "zh" || job.feedbackLanguage === "en")
    && !!submission
    && (submission.taskNumber === "1" || submission.taskNumber === "2")
    && typeof submission.question === "string"
    && typeof submission.essay === "string"
    && typeof submission.wordCount === "number";
}

export function loadPendingAssessmentJobs(): PendingAssessmentJob[] {
  if (typeof window === "undefined") return [];

  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(value) ? value.filter(isPendingAssessmentJob) : [];
  } catch {
    return [];
  }
}

function writePendingAssessmentJobs(jobs: PendingAssessmentJob[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

export function savePendingAssessmentJob(job: PendingAssessmentJob) {
  const jobs = loadPendingAssessmentJobs().filter((entry) => entry.jobId !== job.jobId);
  writePendingAssessmentJobs([...jobs, job]);
}

export function removePendingAssessmentJob(jobId: string) {
  writePendingAssessmentJobs(loadPendingAssessmentJobs().filter((job) => job.jobId !== jobId));
}

export function createAssessmentJobId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
