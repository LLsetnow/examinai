import {
  completeBackgroundJob,
  failBackgroundJob,
  getBackgroundJobError,
  isBackgroundJobActive,
  startBackgroundJob,
} from "@/lib/background-assessment-jobs";
import {
  getAssessmentHistory,
  type AssessmentHistoryEntry,
} from "@/lib/storage/assessment-history";
import {
  createWritingReportFile,
  type WritingReportFile,
} from "@/lib/writing-report";
import type {
  WritingImprovementFeedback,
  WritingLanguageFeedback,
  WritingOverviewFeedback,
  WritingScoringFeedback,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const BACKGROUND_JOB_ID_HEADER = "x-examinai-background-job-id";

interface BackgroundAssessmentRequest {
  jobId?: unknown;
  [key: string]: unknown;
}

function validJobId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9-]{16,100}$/.test(value);
}

function reportFromHistory(record: AssessmentHistoryEntry): WritingReportFile {
  const feedback = record.feedback as {
    overview?: WritingOverviewFeedback;
    scoring?: WritingScoringFeedback;
    languageAnalysis?: WritingLanguageFeedback;
    improvement?: WritingImprovementFeedback;
  };
  const scoring = feedback.scoring ?? null;
  const languageAnalysis = feedback.languageAnalysis ?? null;
  const scores = [
    scoring?.taskResponseScore ?? null,
    scoring?.coherenceScore ?? null,
    languageAnalysis?.lexicalResourceScore ?? null,
    languageAnalysis?.grammaticalRangeScore ?? null,
  ];
  const overallScore = scores.every((score) => score !== null)
    ? Math.round((scores as number[]).reduce((sum, score) => sum + score, 0) / 4 * 2) / 2
    : null;

  return createWritingReportFile({
    submission: record.submission,
    overview: feedback.overview ?? null,
    scoring,
    languageAnalysis,
    improvement: feedback.improvement ?? null,
    overallScore,
    feedbackLanguage: record.feedbackLanguage,
    failedSections: record.failedSections,
    exportedAt: new Date(record.createdAt),
  });
}

async function getCompletedReport(jobId: string) {
  const record = await getAssessmentHistory(jobId);
  return record ? reportFromHistory(record) : null;
}

async function runBackgroundAssessment(
  request: Request,
  jobId: string,
  payload: Record<string, unknown>,
) {
  try {
    const assessUrl = new URL("/api/writing/assess", request.url);
    const response = await fetch(assessUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [BACKGROUND_JOB_ID_HEADER]: jobId,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(body?.error ?? `Assessment failed with HTTP ${response.status}.`);
    }

    // Consuming the stream keeps the existing assessor running until it sends
    // its terminal event and writes the history record.
    await response.arrayBuffer();
    if (!await getCompletedReport(jobId)) {
      throw new Error("The assessment ended without a saved report.");
    }

    completeBackgroundJob(jobId);
  } catch (error) {
    failBackgroundJob(
      jobId,
      error instanceof Error ? error.message : "The background assessment failed.",
    );
  }
}

export async function POST(request: Request) {
  let payload: BackgroundAssessmentRequest;
  try {
    payload = await request.json() as BackgroundAssessmentRequest;
  } catch {
    return Response.json({ error: "Invalid assessment request." }, { status: 400 });
  }

  if (!validJobId(payload.jobId)) {
    return Response.json({ error: "A valid background job ID is required." }, { status: 400 });
  }

  const jobId = payload.jobId;
  const completedReport = await getCompletedReport(jobId);
  if (completedReport) {
    return Response.json({ jobId, status: "completed", report: completedReport });
  }

  if (isBackgroundJobActive(jobId)) {
    return Response.json({ jobId, status: "pending" }, { status: 202 });
  }

  startBackgroundJob(jobId);
  void runBackgroundAssessment(request, jobId, payload).catch((error) => {
    failBackgroundJob(jobId, error instanceof Error ? error.message : "The background assessment failed.");
  });

  return Response.json({ jobId, status: "pending" }, { status: 202 });
}

export async function GET(request: Request) {
  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!validJobId(jobId)) {
    return Response.json({ error: "A valid background job ID is required." }, { status: 400 });
  }

  const report = await getCompletedReport(jobId);
  if (report) return Response.json({ jobId, status: "completed", report });

  const error = getBackgroundJobError(jobId);
  if (error) return Response.json({ jobId, status: "failed", error });

  if (isBackgroundJobActive(jobId)) {
    return Response.json({ jobId, status: "pending" }, { status: 202 });
  }

  return Response.json({ jobId, status: "unknown" }, { status: 404 });
}
