"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileDown, FileJson2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveJsonToLocalHistoryDirectory } from "@/lib/browser/local-history-directory";
import { useI18n } from "@/lib/i18n/provider";
import {
  createWritingReportFile,
  createWritingReportFileName,
  serializeWritingReport,
} from "@/lib/writing-report";
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
  feedbackLanguage: "zh" | "en";
  failedSections: Record<string, string>;
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
  feedbackLanguage,
  failedSections,
}: ReportExportActionsProps) {
  const { t } = useI18n();
  const [exportNotice, setExportNotice] = useState("");

  useEffect(() => {
    if (!exportNotice) return;
    const timer = window.setTimeout(() => setExportNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [exportNotice]);

  function exportPdf() {
    window.print();
  }

  async function exportJson() {
    const exportedAt = new Date();
    const fileName = createWritingReportFileName(submission.taskNumber, exportedAt);
    const json = serializeWritingReport(createWritingReportFile({
      submission,
      overview,
      scoring,
      languageAnalysis,
      improvement,
      overallScore,
      feedbackLanguage,
      failedSections,
      exportedAt,
    }));
    const status = await saveJsonToLocalHistoryDirectory(fileName, json);

    if (status === "saved") {
      setExportNotice(t.feedback.exportJsonSaved);
      return;
    }

    downloadJson(fileName, json);
    setExportNotice(t.feedback.exportJsonDownloaded);
  }

  return (
    <>
      {exportNotice ? (
        <div className="pointer-events-none fixed inset-x-0 top-5 z-[60] flex justify-center px-4" role="status" aria-live="polite">
          <div className="flex max-w-md items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-900 shadow-[0_16px_40px_rgba(6,78,59,0.16)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="size-4" />
            </span>
            <span>{exportNotice}</span>
          </div>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={exportPdf} title={t.feedback.exportPdf}>
          <FileDown className="size-4" />
          <span className="hidden md:inline">{t.feedback.exportPdf}</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => void exportJson()} title={t.feedback.exportJson}>
          <FileJson2 className="size-4" />
          <span className="hidden md:inline">{t.feedback.exportJson}</span>
        </Button>
      </div>
    </>
  );
}
