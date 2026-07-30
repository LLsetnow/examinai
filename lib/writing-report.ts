import type {
  WritingImprovementFeedback,
  WritingLanguageFeedback,
  WritingOverviewFeedback,
  WritingScoringFeedback,
  WritingSubmission,
} from "@/lib/types";

export const WRITING_REPORT_FORMAT = "examinai-writing-report/v1";

export interface WritingReportFile {
  format: typeof WRITING_REPORT_FORMAT;
  exportedAt: string;
  feedbackLanguage: "zh" | "en";
  submission: WritingSubmission;
  scores: {
    overall: number | null;
    taskResponse: number | null;
    coherence: number | null;
    lexicalResource: number | null;
    grammaticalRange: number | null;
  };
  feedback: {
    overview: WritingOverviewFeedback | null;
    scoring: WritingScoringFeedback | null;
    languageAnalysis: WritingLanguageFeedback | null;
    improvement: WritingImprovementFeedback | null;
  };
  failedSections: Record<string, string>;
}

export function createWritingReportFile({
  submission,
  overview,
  scoring,
  languageAnalysis,
  improvement,
  overallScore,
  feedbackLanguage,
  failedSections = {},
  exportedAt = new Date(),
}: {
  submission: WritingSubmission;
  overview: WritingOverviewFeedback | null;
  scoring: WritingScoringFeedback | null;
  languageAnalysis: WritingLanguageFeedback | null;
  improvement: WritingImprovementFeedback | null;
  overallScore: number | null;
  feedbackLanguage: "zh" | "en";
  failedSections?: Record<string, string>;
  exportedAt?: Date;
}): WritingReportFile {
  return {
    format: WRITING_REPORT_FORMAT,
    exportedAt: exportedAt.toISOString(),
    feedbackLanguage,
    submission,
    scores: {
      overall: overallScore,
      taskResponse: scoring?.taskResponseScore ?? null,
      coherence: scoring?.coherenceScore ?? null,
      lexicalResource: languageAnalysis?.lexicalResourceScore ?? null,
      grammaticalRange: languageAnalysis?.grammaticalRangeScore ?? null,
    },
    feedback: { overview, scoring, languageAnalysis, improvement },
    failedSections,
  };
}

export function createWritingReportFileName(
  taskNumber: WritingSubmission["taskNumber"],
  createdAt = new Date(),
) {
  const timestamp = createdAt.toISOString().replace(/[:.]/g, "-");
  return `examinai-assessment-${timestamp}-task-${taskNumber}.json`;
}

export function serializeWritingReport(report: WritingReportFile) {
  return `${JSON.stringify(report, null, 2)}\n`;
}
