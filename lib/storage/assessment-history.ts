import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WritingSubmission } from "@/lib/types";

export interface AssessmentHistoryEntry {
  id: string;
  createdAt: string;
  feedbackLanguage: "zh" | "en";
  submission: WritingSubmission;
  feedback: Record<string, unknown>;
  failedSections: Record<string, string>;
}

export interface AssessmentHistorySummary {
  id: string;
  createdAt: string;
  feedbackLanguage: "zh" | "en";
  submission: Pick<WritingSubmission, "taskNumber" | "question" | "wordCount" | "questionSource">;
  scores: {
    taskResponse: number | null;
    coherence: number | null;
    lexicalResource: number | null;
    grammaticalRange: number | null;
    overall: number | null;
  };
  failedSections: Record<string, string>;
}

const HISTORY_DIRECTORY = path.join(process.cwd(), "data", "assessment-history");

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toSummary(record: AssessmentHistoryEntry): AssessmentHistorySummary {
  const scoring = record.feedback.scoring as Record<string, unknown> | undefined;
  const languageAnalysis = record.feedback.languageAnalysis as Record<string, unknown> | undefined;
  const taskResponse = numberOrNull(scoring?.taskResponseScore);
  const coherence = numberOrNull(scoring?.coherenceScore);
  const lexicalResource = numberOrNull(languageAnalysis?.lexicalResourceScore);
  const grammaticalRange = numberOrNull(languageAnalysis?.grammaticalRangeScore);
  const scores = [taskResponse, coherence, lexicalResource, grammaticalRange];
  const overall = scores.every((score) => score !== null)
    ? Math.round((scores as number[]).reduce((sum, score) => sum + score, 0) / 4 * 2) / 2
    : null;

  return {
    id: record.id,
    createdAt: record.createdAt,
    feedbackLanguage: record.feedbackLanguage,
    submission: {
      taskNumber: record.submission.taskNumber,
      question: record.submission.question,
      wordCount: record.submission.wordCount,
      questionSource: record.submission.questionSource,
    },
    scores: { taskResponse, coherence, lexicalResource, grammaticalRange, overall },
    failedSections: record.failedSections,
  };
}

/** Saves a local-only history record. This directory is ignored by Git. */
export async function saveAssessmentHistory(
  entry: Omit<AssessmentHistoryEntry, "id" | "createdAt">,
) {
  await mkdir(HISTORY_DIRECTORY, { recursive: true });

  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`;
  const record: AssessmentHistoryEntry = {
    id,
    createdAt: new Date().toISOString(),
    ...entry,
  };

  await writeFile(
    path.join(HISTORY_DIRECTORY, `${id}.json`),
    `${JSON.stringify(record, null, 2)}\n`,
    "utf8",
  );

  return record;
}

/** Lists local assessment records without returning essays or chart images. */
export async function listAssessmentHistory(): Promise<AssessmentHistorySummary[]> {
  try {
    const fileNames = await readdir(HISTORY_DIRECTORY);
    const records = await Promise.all(
      fileNames
        .filter((fileName) => fileName.endsWith(".json"))
        .map(async (fileName) => {
          try {
            const content = await readFile(path.join(HISTORY_DIRECTORY, fileName), "utf8");
            return JSON.parse(content) as AssessmentHistoryEntry;
          } catch {
            return null;
          }
        }),
    );

    return records
      .filter((record): record is AssessmentHistoryEntry => record !== null)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map(toSummary);
  } catch {
    return [];
  }
}

/** Reads a single local record after validating its filename-safe identifier. */
export async function getAssessmentHistory(id: string): Promise<AssessmentHistoryEntry | null> {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return null;

  try {
    const content = await readFile(path.join(HISTORY_DIRECTORY, `${id}.json`), "utf8");
    return JSON.parse(content) as AssessmentHistoryEntry;
  } catch {
    return null;
  }
}

/** Deletes one filename-safe local assessment record. */
export async function deleteAssessmentHistory(id: string): Promise<boolean> {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return false;

  try {
    await unlink(path.join(HISTORY_DIRECTORY, `${id}.json`));
    return true;
  } catch {
    return false;
  }
}
