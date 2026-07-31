"use client";

import { FileClock, FilePlus2, RotateCcw } from "lucide-react";
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
  const failedSections = Object.keys(assessment.failedSections);
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
        <div className="flex items-center gap-2.5">
          <RobotIcon className="size-7 text-primary" />
          <div>
            <p className="font-[family-name:var(--font-brand)] text-lg font-bold tracking-tight text-foreground">
              Examin<span className="text-primary">ai</span>
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t.writing.appSubtitle}
            </p>
          </div>
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
          {onHistory && (
            <Button variant="outline" size="sm" onClick={onHistory}>
              <FileClock className="size-4" />
              <span className="ml-1.5 hidden sm:inline">{t.common.history}</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onNewEssay}>
            <FilePlus2 className="size-4" />
            <span className="ml-1.5">{t.common.newEssay}</span>
          </Button>
        </div>
      </header>

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
                  {t.feedback.assessmentPartialError}
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
              onRegenerateCorrections={onRegenerateCorrections}
              isRegeneratingCorrections={isRegeneratingCorrections}
            />
          </div>
        </>
      )}
    </div>
  );
}
