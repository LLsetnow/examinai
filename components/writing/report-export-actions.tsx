"use client";

import { useState } from "react";
import { FileDown, FileJson2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveJsonToLocalHistoryDirectory } from "@/lib/browser/local-history-directory";
import { useI18n } from "@/lib/i18n/provider";
import type {
  WritingImprovementFeedback,
  WritingLanguageFeedback,
  WritingOverviewFeedback,
  WritingScoringFeedback,
  WritingSubmission,
} from "@/lib/types";

interface ReportExportActionsProps {
  submission: WritingSubmission;
  overview: WritingOverviewFeedback | null;
  scoring: WritingScoringFeedback | null;
  languageAnalysis: WritingLanguageFeedback | null;
  improvement: WritingImprovementFeedback | null;
  overallScore: number | null;
}

function downloadJson(fileName: string, content: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ReportExportActions({
  submission,
  overview,
  scoring,
  languageAnalysis,
  improvement,
  overallScore,
}: ReportExportActionsProps) {
  const { t } = useI18n();
  const [exportNotice, setExportNotice] = useState("");

  function exportPdf() {
    window.print();
  }

  async function exportJson() {
    const exportedAt = new Date();
    const date = exportedAt.toISOString().slice(0, 10);
    const fileName = `examinai-ielts-task-${submission.taskNumber}-${date}.json`;
    const report = {
      format: "examinai-writing-report/v1",
      exportedAt: exportedAt.toISOString(),
      submission,
      scores: {
        overall: overallScore,
        taskResponse: scoring?.taskResponseScore ?? null,
        coherence: scoring?.coherenceScore ?? null,
        lexicalResource: languageAnalysis?.lexicalResourceScore ?? null,
        grammaticalRange: languageAnalysis?.grammaticalRangeScore ?? null,
      },
      feedback: { overview, scoring, languageAnalysis, improvement },
    };
    const json = `${JSON.stringify(report, null, 2)}\n`;
    const status = await saveJsonToLocalHistoryDirectory(fileName, json);

    if (status === "saved") {
      setExportNotice(t.feedback.exportJsonSaved);
      return;
    }

    downloadJson(fileName, json);
    setExportNotice(t.feedback.exportJsonDownloaded);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={exportPdf} title={t.feedback.exportPdf}>
        <FileDown className="size-4" />
        <span className="hidden md:inline">{t.feedback.exportPdf}</span>
      </Button>
      <Button variant="outline" size="sm" onClick={() => void exportJson()} title={t.feedback.exportJson}>
        <FileJson2 className="size-4" />
        <span className="hidden md:inline">{t.feedback.exportJson}</span>
      </Button>
      <span className="sr-only" aria-live="polite">{exportNotice}</span>
    </div>
  );
}
