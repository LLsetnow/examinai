"use client";

import { useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import RobotIcon from "@/components/icons/logo";
import { ApiSettingsButton } from "@/components/api-settings-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { WritingFeedbackReport } from "@/components/writing/writing-feedback-report";
import { ReportExportActions } from "@/components/writing/report-export-actions";
import { WritingTopNav } from "@/components/writing/writing-top-nav";
import { useI18n } from "@/lib/i18n/provider";
import type {
  WritingImprovementFeedback,
  WritingLanguageFeedback,
  WritingOverviewFeedback,
  WritingScoringFeedback,
  WritingSubmission,
  AiProviderSettings,
} from "@/lib/types";

export interface AssessmentData {
  overview: WritingOverviewFeedback | null;
  scoring: WritingScoringFeedback | null;
  languageAnalysis: WritingLanguageFeedback | null;
  improvement: WritingImprovementFeedback | null;
  done: boolean;
  /** True when the stream ended before the server signaled completion. */
  incomplete?: boolean;
  failedSections: Record<string, string>;
}

interface WritingAssessmentReportProps {
  assessment: AssessmentData;
  submission: WritingSubmission;
  onNewEssay: () => void;
  onHistory?: () => void;
  onRetry?: (sections: string[]) => void;
  onRegenerateCorrections?: () => void;
  isRegeneratingCorrections?: boolean;
  providerSettings?: AiProviderSettings;
  onProviderSettingsChange?: (settings: AiProviderSettings | undefined) => void;
  feedbackLanguage: "zh" | "en";
}

export function WritingAssessmentReport({
  assessment,
  submission,
  onNewEssay,
  onHistory,
  onRetry,
  onRegenerateCorrections,
  isRegeneratingCorrections = false,
  providerSettings,
  onProviderSettingsChange,
  feedbackLanguage,
}: WritingAssessmentReportProps) {
  const { t } = useI18n();
  const [showBackgroundNotice, setShowBackgroundNotice] = useState(true);
  const failedSections = Object.keys(assessment.failedSections);
  // Loaders should stop once the stream reaches any terminal state, whether it
  // completed successfully or ended early.
  const isStreaming = !assessment.done && !assessment.incomplete;
  const hasAnyFeedback =
    !!assessment.overview ||
    !!assessment.scoring ||
    !!assessment.languageAnalysis ||
    !!assessment.improvement;

  const overallScore = (() => {
    if (!assessment.scoring || !assessment.languageAnalysis) return null;
    const scores = [
      assessment.scoring.taskResponseScore,
      assessment.scoring.coherenceScore,
      assessment.languageAnalysis.lexicalResourceScore,
      assessment.languageAnalysis.grammaticalRangeScore,
    ];
    if (scores.some((score) => score === null)) return null;
    return Math.round(
      ((scores as number[]).reduce((sum, score) => sum + score, 0) / 4) * 2,
    ) / 2;
  })();

  const taskResponseLabel =
    submission.taskNumber === "1" ? t.feedback.taskAchievement : t.feedback.taskResponse;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5">
            <RobotIcon className="size-7 text-primary" />
            <div className="hidden sm:block">
              <p className="font-[family-name:var(--font-brand)] text-lg font-bold tracking-tight text-foreground">
                Examin<span className="text-primary">ai</span>
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t.writing.appSubtitle}
              </p>
            </div>
          </div>
          <WritingTopNav active="report" onNewEssay={onNewEssay} onHistory={onHistory} />
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {onProviderSettingsChange ? <ApiSettingsButton value={providerSettings} onChange={onProviderSettingsChange} /> : null}
          <ReportExportActions
            submission={submission}
            overview={assessment.overview}
            scoring={assessment.scoring}
            languageAnalysis={assessment.languageAnalysis}
            improvement={assessment.improvement}
            overallScore={overallScore}
            feedbackLanguage={feedbackLanguage}
            failedSections={assessment.failedSections}
          />
        </div>
      </header>

      {isStreaming && showBackgroundNotice ? (
        <div className="relative shrink-0 border-b border-amber-100 bg-amber-50 px-10 py-2 text-center text-xs font-medium text-amber-900 sm:px-12">
          {t.feedback.backgroundAssessmentNotice}
          <button
            type="button"
            onClick={() => setShowBackgroundNotice(false)}
            aria-label={t.feedback.backgroundAssessmentNoticeClose}
            title={t.feedback.backgroundAssessmentNoticeClose}
            className="absolute top-1/2 right-3 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-amber-700/75 transition-colors hover:bg-amber-100 hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/40 sm:right-5"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {failedSections.length > 0 && !hasAnyFeedback ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <Alert variant="destructive" className="mx-auto max-w-2xl">
            <AlertCircle />
            <AlertTitle>{t.feedback.assessmentFailed}</AlertTitle>
            <AlertDescription>{assessment.failedSections[failedSections[0]]}</AlertDescription>
            {onRetry && (
              <AlertAction>
                <Button variant="outline" size="sm" onClick={() => onRetry(failedSections)}>
                  <RotateCcw className="size-3.5" />
                  <span className="ml-1">{t.common.retry}</span>
                </Button>
              </AlertAction>
            )}
          </Alert>
        </div>
      ) : (
        <>
          {failedSections.length > 0 && (
            <div className="shrink-0 px-3 pt-3 sm:px-5">
              <Alert variant="destructive" className="mx-auto max-w-5xl">
                <AlertCircle />
                <AlertDescription>
                  {assessment.incomplete
                    ? t.feedback.assessmentIncomplete
                    : t.feedback.assessmentPartialError}
                </AlertDescription>
                {onRetry && (
                  <AlertAction>
                    <Button variant="outline" size="sm" onClick={() => onRetry(failedSections)}>
                      <RotateCcw className="size-3.5" />
                      <span className="ml-1">{t.common.retry}</span>
                    </Button>
                  </AlertAction>
                )}
              </Alert>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-hidden">
            <WritingFeedbackReport
              submission={submission}
              overview={assessment.overview}
              scoring={assessment.scoring}
              languageAnalysis={assessment.languageAnalysis}
              improvement={assessment.improvement}
              overallScore={overallScore}
              taskResponseLabel={taskResponseLabel}
              isStreaming={isStreaming}
              assessmentProgress={
                !assessment.done
                  ? <AssessmentProgress assessment={assessment} inline />
                  : undefined
              }
              onRegenerateCorrections={onRegenerateCorrections}
              isRegeneratingCorrections={isRegeneratingCorrections}
            />
          </div>
        </>
      )}
    </div>
  );
}

function AssessmentProgress({
  assessment,
  inline = false,
}: {
  assessment: AssessmentData;
  inline?: boolean;
}) {
  const { t } = useI18n();
  const steps = [
    { id: "scoring", label: t.feedback.assessmentProgressScoring },
    { id: "languageAnalysis", label: t.feedback.assessmentProgressLanguage },
    { id: "improvement", label: t.feedback.assessmentProgressImprovement },
  ] as const;

  return (
    <div
      className={inline
        ? "flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-2"
        : "shrink-0 border-b border-red-100 bg-red-50/45 px-4 py-3 sm:px-6"}
      role="status"
      aria-live="polite"
    >
      <p className={inline
        ? "shrink-0 text-xs font-semibold text-primary"
        : "shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"}
      >
        {t.feedback.assessmentProgressTitle}
      </p>
      <ol className={inline
        ? "flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1.5"
        : "flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2"}
      >
        {steps.map((step) => {
          const complete = isAssessmentProgressStepComplete(step.id, assessment);
          return (
            <li key={step.id} className="flex items-center gap-2 text-xs font-medium text-foreground/80">
              <span
                aria-hidden="true"
                className={`size-3 rounded-full ring-4 ${
                  complete
                    ? "bg-emerald-500 ring-emerald-500/15"
                    : "bg-red-500 ring-red-500/15"
                }`}
              />
              <span>{step.label}</span>
              <span className="sr-only">
                {complete
                  ? t.feedback.assessmentProgressComplete
                  : t.feedback.assessmentProgressPending}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function isAssessmentProgressStepComplete(
  step: "scoring" | "languageAnalysis" | "improvement",
  assessment: AssessmentData,
) {
  if (assessment.failedSections[step]) return false;
  if (step === "scoring") return !!assessment.scoring;
  if (step === "improvement") return !!assessment.improvement;
  return !!assessment.languageAnalysis
    && assessment.languageAnalysis.lexicalResourceScore !== null;
}
