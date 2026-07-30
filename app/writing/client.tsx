"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpenText,
  ChevronRight,
  FileImage,
  FileClock,
  FileText,
  ImagePlus,
  LoaderCircle,
  PenLine,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import RobotIcon from "@/components/icons/logo";
import { ApiSettingsButton } from "@/components/api-settings-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  WritingAssessmentReport,
  type AssessmentData,
} from "@/components/writing/writing-assessment-report";
import { useI18n } from "@/lib/i18n/provider";
import type { Language } from "@/lib/i18n/translations";
import type { AiProviderSettings, CambridgeQuestionSource, WritingSubmission } from "@/lib/types";

type Screen = "form" | "report" | "history";

interface QuestionBankEntry {
  id: string;
  book: number;
  test: number;
  taskNumber: "1" | "2";
  prompt: string;
  topics: string[];
}

interface QuestionBank {
  source: {
    name: string;
    url: string;
  };
  questions: QuestionBankEntry[];
}

interface LoadedQuestion extends QuestionBankEntry {
  imageUrl?: string;
  chartFactsAvailable?: boolean;
}

interface HistoryRecordSummary {
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

interface HistoryRecordDetail {
  submission: WritingSubmission;
  feedback: Partial<Pick<AssessmentData, "overview" | "scoring" | "languageAnalysis" | "improvement">>;
  failedSections: Record<string, string>;
}

function createEmptyAssessment(): AssessmentData {
  return {
    overview: null,
    scoring: null,
    languageAnalysis: null,
    improvement: null,
    done: false,
    failedSections: {},
  };
}

export default function WritingPageClient() {
  const { language, t } = useI18n();
  const [screen, setScreen] = useState<Screen>("form");
  const [taskNumber, setTaskNumber] = useState<"1" | "2">("2");
  const [question, setQuestion] = useState("");
  const [questionSource, setQuestionSource] = useState<CambridgeQuestionSource | undefined>();
  const [localChartFactsAvailable, setLocalChartFactsAvailable] = useState(false);
  const [essay, setEssay] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [imageName, setImageName] = useState("");
  const [submission, setSubmission] = useState<WritingSubmission | null>(null);
  const [assessment, setAssessment] = useState<AssessmentData>(createEmptyAssessment);
  const [questionBank, setQuestionBank] = useState<QuestionBank | null>(null);
  const [questionBankUnavailable, setQuestionBankUnavailable] = useState(false);
  const [selectedBook, setSelectedBook] = useState(18);
  const [selectedTest, setSelectedTest] = useState(1);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecordSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [historyDeleteError, setHistoryDeleteError] = useState(false);
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null);
  const [providerSettings, setProviderSettings] = useState<AiProviderSettings | undefined>();
  const controllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const canAssess = question.trim().length > 0 && essay.trim().length > 0;

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/writing/questions")
      .then(async (response) => {
        if (!response.ok) throw new Error("Question bank is unavailable");
        return response.json() as Promise<QuestionBank>;
      })
      .then((bank) => {
        if (!cancelled) setQuestionBank(bank);
      })
      .catch(() => {
        if (!cancelled) setQuestionBankUnavailable(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(typeof reader.result === "string" ? reader.result : undefined);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageUrl(undefined);
    setImageName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function loadSelectedQuestion() {
    if (!questionBank || isLoadingQuestion) return;
    setIsLoadingQuestion(true);

    try {
      const response = await fetch(
        `/api/writing/questions?book=${selectedBook}&test=${selectedTest}&task=${taskNumber}`,
      );
      if (!response.ok) throw new Error("Question not found");
      const selectedQuestion = await response.json() as LoadedQuestion;

      setTaskNumber(selectedQuestion.taskNumber);
      setQuestion(selectedQuestion.prompt);
      setQuestionSource({
        kind: "cambridge",
        book: selectedQuestion.book,
        test: selectedQuestion.test,
        taskNumber: selectedQuestion.taskNumber,
      });
      setLocalChartFactsAvailable(Boolean(selectedQuestion.chartFactsAvailable));
      if (selectedQuestion.imageUrl) {
        setImageUrl(selectedQuestion.imageUrl);
        setImageName(`Cambridge ${selectedQuestion.book} · Test ${selectedQuestion.test} · Task 1`);
      } else {
        clearImage();
      }
    } finally {
      setIsLoadingQuestion(false);
    }
  }

  async function showHistory() {
    setScreen("history");
    setIsLoadingHistory(true);
    setHistoryError(false);
    setHistoryDeleteError(false);

    try {
      const response = await fetch("/api/writing/history");
      if (!response.ok) throw new Error("History is unavailable");
      const data = await response.json() as { records?: HistoryRecordSummary[] };
      setHistoryRecords(data.records ?? []);
    } catch {
      setHistoryError(true);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function openHistoryRecord(id: string) {
    try {
      const response = await fetch(`/api/writing/history?id=${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error("History record is unavailable");
      const record = await response.json() as HistoryRecordDetail;

      setSubmission(record.submission);
      setAssessment({
        overview: record.feedback.overview ?? null,
        scoring: record.feedback.scoring ?? null,
        languageAnalysis: record.feedback.languageAnalysis ?? null,
        improvement: record.feedback.improvement ?? null,
        done: true,
        failedSections: record.failedSections ?? {},
      });
      setScreen("report");
    } catch {
      setHistoryError(true);
    }
  }

  async function deleteHistoryRecord(id: string) {
    if (!window.confirm(t.writing.historyDeleteConfirm)) return;

    setDeletingHistoryId(id);
    setHistoryDeleteError(false);

    try {
      const response = await fetch(`/api/writing/history?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("History record could not be deleted");
      setHistoryRecords((current) => current.filter((record) => record.id !== id));
    } catch {
      setHistoryDeleteError(true);
    } finally {
      setDeletingHistoryId(null);
    }
  }

  async function requestAssessment(
    nextSubmission: WritingSubmission,
    sections?: string[],
  ) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    if (sections) {
      setAssessment((current) => {
        const failedSections = { ...current.failedSections };
        for (const section of sections) delete failedSections[section];
        return { ...current, failedSections, done: false };
      });
    }

    try {
      const response = await fetch("/api/writing/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nextSubmission,
          feedbackLanguage: language,
          providerSettings,
          ...(sections ? { sections } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? `Assessment failed: ${response.statusText || response.status}`);
      }
      if (!response.body) {
        throw new Error("Assessment response did not include a stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      function applyEvents(lines: string[]) {
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const { type, data } = JSON.parse(line.slice(6));
            setAssessment((current) => {
              if (type === "overview") return { ...current, overview: data };
              if (type === "scoring") return { ...current, scoring: data };
              if (type === "languageAnalysis") return { ...current, languageAnalysis: data };
              if (type === "improvement") return { ...current, improvement: data };
              if (type === "section_error") {
                return {
                  ...current,
                  failedSections: { ...current.failedSections, [data.section]: data.message },
                };
              }
              if (type === "done") return { ...current, done: true };
              return current;
            });
          } catch {
            // Ignore incomplete SSE fragments.
          }
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        applyEvents(lines);
      }
      if (buffer.trim()) applyEvents([buffer]);
      setAssessment((current) => (current.done ? current : { ...current, done: true }));
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : "Assessment failed";
      const failed = sections ?? ["overview", "scoring", "languageAnalysis", "improvement"];
      setAssessment((current) => ({
        ...current,
        done: true,
        failedSections: Object.fromEntries(failed.map((section) => [section, message])),
      }));
    }
  }

  function submitEssay() {
    if (!canAssess) return;
    const nextSubmission: WritingSubmission = {
      taskNumber,
      question: question.trim(),
      essay: essay.trim(),
      imageUrl,
      wordCount,
      questionSource,
    };
    setSubmission(nextSubmission);
    setAssessment(createEmptyAssessment());
    setScreen("report");
    void requestAssessment(nextSubmission);
  }

  function startNewEssay() {
    controllerRef.current?.abort();
    setScreen("form");
    setSubmission(null);
    setAssessment(createEmptyAssessment());
  }

  if (screen === "report" && submission) {
    return (
      <div className="h-dvh">
        <WritingAssessmentReport
          assessment={assessment}
          submission={submission}
          onNewEssay={startNewEssay}
          onHistory={() => void showHistory()}
          onRetry={(sections) => void requestAssessment(submission, sections)}
          providerSettings={providerSettings}
          onProviderSettingsChange={setProviderSettings}
        />
      </div>
    );
  }

  if (screen === "history") {
    return (
      <HistoryRecordsPage
        records={historyRecords}
        loading={isLoadingHistory}
        error={historyError}
        deleteError={historyDeleteError}
        deletingId={deletingHistoryId}
        questionBank={questionBank}
        providerSettings={providerSettings}
        onProviderSettingsChange={setProviderSettings}
        onNewEssay={startNewEssay}
        onReload={() => void showHistory()}
        onOpenRecord={(id) => void openHistoryRecord(id)}
        onDelete={(id) => void deleteHistoryRecord(id)}
      />
    );
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_right,_rgba(254,202,202,0.7),transparent_38%),linear-gradient(135deg,#fffafa_0%,#ffffff_55%,#fff7ed_100%)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <RobotIcon className="size-8 text-primary" />
          <div>
            <p className="font-[family-name:var(--font-brand)] text-xl font-bold tracking-tight text-foreground">
              Examin<span className="text-primary">ai</span>
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {t.writing.appSubtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ApiSettingsButton value={providerSettings} onChange={setProviderSettings} />
          <Button variant="outline" size="sm" onClick={() => void showHistory()}>
            <FileClock className="size-4" />
            <span className="ml-1.5 hidden sm:inline">{t.common.history}</span>
          </Button>
          <span className="hidden rounded-full border border-red-100 bg-white/80 px-3 py-1.5 text-xs font-medium text-primary shadow-sm sm:inline-flex">
            {t.writing.noAccount}
          </span>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 pb-10 pt-4 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <section className="pt-3 lg:sticky lg:top-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            {t.writing.instantFeedback}
          </div>
          <h1 className="mt-5 font-[family-name:var(--font-heading)] text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            {t.writing.heroTitleStart}
            <span className="block text-primary">{t.writing.heroTitleAccent}</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
            {t.writing.heroDescription}
          </p>
          <div className="mt-7 space-y-3">
            {[
              t.writing.featureScores,
              t.writing.featureCorrections,
              t.writing.featureVocabulary,
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-foreground/80">
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">✓</span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-red-100 bg-white p-5 shadow-[0_20px_60px_rgba(127,29,29,0.10)] sm:p-7">
          <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <PenLine className="size-4 text-primary" />
                {t.writing.startAssessment}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t.writing.noHistory}</p>
            </div>
            <div className="flex rounded-xl bg-muted p-1">
              {(["1", "2"] as const).map((task) => (
                <button
                  key={task}
                  type="button"
                  onClick={() => {
                    setTaskNumber(task);
                    if (task !== questionSource?.taskNumber) {
                      setQuestionSource(undefined);
                      setLocalChartFactsAvailable(false);
                    }
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                    taskNumber === task
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {task === "1" ? t.writing.task1 : t.writing.task2}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <section className="rounded-2xl border border-red-100 bg-red-50/45 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                  <BookOpenText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{t.writing.questionBank}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.writing.questionBankDescription}</p>
                </div>
              </div>

              {questionBank ? (
                <>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[11px] font-semibold text-muted-foreground">{t.writing.book}</span>
                      <select
                        value={selectedBook}
                        onChange={(event) => {
                          setSelectedBook(Number(event.target.value));
                          setSelectedTest(1);
                        }}
                        className="mt-1 min-h-10 w-full rounded-xl border border-border bg-white px-3 text-sm font-medium text-foreground shadow-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                      >
                        {[...new Set(questionBank.questions.map((entry) => entry.book))].sort((a, b) => a - b).map((book) => (
                          <option key={book} value={book}>Cambridge {book}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-semibold text-muted-foreground">{t.writing.test}</span>
                      <select
                        value={selectedTest}
                        onChange={(event) => setSelectedTest(Number(event.target.value))}
                        className="mt-1 min-h-10 w-full rounded-xl border border-border bg-white px-3 text-sm font-medium text-foreground shadow-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                      >
                        {[...new Set(questionBank.questions.filter((entry) => entry.book === selectedBook).map((entry) => entry.test))].sort((a, b) => a - b).map((test) => (
                          <option key={test} value={test}>Test {test}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[11px] text-muted-foreground">{t.writing.manualEditHint}</p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void loadSelectedQuestion()}
                      disabled={isLoadingQuestion}
                      className="min-h-9 px-3 text-xs font-semibold"
                    >
                      {isLoadingQuestion ? <LoaderCircle className="size-3.5 animate-spin" /> : <BookOpenText className="size-3.5" />}
                      <span className="ml-1.5">{isLoadingQuestion ? t.writing.loadingQuestion : t.writing.useQuestion}</span>
                    </Button>
                  </div>
                  <p className="mt-3 text-[10px] text-muted-foreground">
                    {t.writing.source} · <a href={questionBank.source.url} target="_blank" rel="noreferrer" className="underline decoration-muted-foreground/40 underline-offset-2 hover:text-primary">{questionBank.source.name}</a>
                  </p>
                </>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">
                  {questionBankUnavailable ? t.writing.bankUnavailable : t.writing.loadingQuestion}
                </p>
              )}
            </section>

            <label className="block">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText className="size-4 text-primary" />
                {t.writing.question}
              </span>
              <Textarea
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  setQuestionSource(undefined);
                  setLocalChartFactsAvailable(false);
                }}
                placeholder={t.writing.questionPlaceholder}
                className="mt-2 min-h-28 resize-y border-border bg-muted/20 leading-6 shadow-none focus-visible:border-primary/50 focus-visible:ring-primary/20"
              />
            </label>

            {taskNumber === "1" && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <FileImage className="size-4 text-primary" />
                    {t.writing.chart} <span className="font-normal text-muted-foreground">{t.writing.optional}</span>
                  </span>
                  {imageUrl && (
                    <button type="button" onClick={clearImage} className="text-xs font-medium text-primary hover:underline">
                      {t.writing.remove}
                    </button>
                  )}
                </div>
                {questionSource?.kind === "cambridge" ? (
                  <p className={`mt-2 rounded-xl px-3 py-2 text-xs font-medium leading-5 ${
                    localChartFactsAvailable
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-amber-50 text-amber-800"
                  }`}>
                    {localChartFactsAvailable ? t.writing.localChartFacts : t.writing.visionChartFallback}
                  </p>
                ) : null}
                {imageUrl ? (
                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                    <img src={imageUrl} alt={t.writing.uploadedChart} className="size-14 rounded-lg object-cover" />
                    <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{imageName}</p>
                    <button type="button" onClick={clearImage} className="rounded-full p-1.5 text-muted-foreground hover:bg-white hover:text-primary" aria-label={t.writing.remove}>
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    <ImagePlus className="size-4" />
                    {t.writing.uploadImage}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleImage(file);
                  }}
                />
              </div>
            )}

            <label className="block">
              <span className="flex items-center justify-between gap-3 text-sm font-semibold text-foreground">
                <span className="flex items-center gap-2"><PenLine className="size-4 text-primary" /> {t.writing.yourEssay}</span>
                <span className="text-xs font-normal text-muted-foreground">{t.writing.wordCount} {wordCount}</span>
              </span>
              <Textarea
                value={essay}
                onChange={(event) => setEssay(event.target.value)}
                placeholder={t.writing.essayPlaceholder}
                className="mt-2 min-h-64 resize-y border-border bg-muted/20 leading-7 shadow-none focus-visible:border-primary/50 focus-visible:ring-primary/20"
              />
            </label>

            <Button
              type="button"
              size="lg"
              onClick={submitEssay}
              disabled={!canAssess}
              className="w-full font-semibold"
            >
              <Sparkles className="size-4" />
              <span className="ml-2">{t.writing.assess}</span>
            </Button>
            <p className="text-center text-[11px] leading-5 text-muted-foreground">
              {t.writing.privacyNotice}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function HistoryRecordsPage({
  records,
  loading,
  error,
  deleteError,
  deletingId,
  questionBank,
  providerSettings,
  onProviderSettingsChange,
  onNewEssay,
  onReload,
  onOpenRecord,
  onDelete,
}: {
  records: HistoryRecordSummary[];
  loading: boolean;
  error: boolean;
  deleteError: boolean;
  deletingId: string | null;
  questionBank: QuestionBank | null;
  providerSettings: AiProviderSettings | undefined;
  onProviderSettingsChange: (settings: AiProviderSettings | undefined) => void;
  onNewEssay: () => void;
  onReload: () => void;
  onOpenRecord: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { language, t } = useI18n();

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_right,_rgba(254,202,202,0.7),transparent_38%),linear-gradient(135deg,#fffafa_0%,#ffffff_55%,#fff7ed_100%)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <button
          type="button"
          onClick={onNewEssay}
          aria-label={t.common.home}
          title={t.common.home}
          className="flex items-center gap-2.5 rounded-xl text-left transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <RobotIcon className="size-8 text-primary" />
          <div>
            <p className="font-[family-name:var(--font-brand)] text-xl font-bold tracking-tight text-foreground">
              Examin<span className="text-primary">ai</span>
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {t.writing.appSubtitle}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ApiSettingsButton value={providerSettings} onChange={onProviderSettingsChange} />
          <Button variant="outline" size="sm" onClick={onNewEssay}>
            <PenLine className="size-4" />
            <span className="ml-1.5 hidden sm:inline">{t.common.newEssay}</span>
          </Button>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-5 pb-12 pt-4 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-red-100 pb-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-primary">
              <FileClock className="size-3.5" />
              {t.common.history}
            </span>
            <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t.writing.historyTitle}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {t.writing.historyDescription}
            </p>
          </div>
          <p className="max-w-xs text-sm leading-5 text-muted-foreground sm:text-right">
            {t.writing.historyLocalOnly}
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin text-primary" />
            {t.feedback.waitingForFeedback}
          </div>
        ) : error ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/75 p-5 text-sm text-red-800">
            <span>{t.writing.historyLoadError}</span>
            <Button size="sm" variant="outline" onClick={onReload}>
              {t.common.retry}
            </Button>
          </div>
        ) : records.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-red-200 bg-white/75 p-10 text-center text-sm leading-6 text-muted-foreground shadow-sm">
            {t.writing.noHistoryRecords}
          </div>
        ) : (
          <>
            {deleteError ? (
              <p role="alert" className="mt-5 text-sm font-medium text-destructive">
                {t.writing.historyDeleteError}
              </p>
            ) : null}
            <div className="mt-6 grid gap-3">
              {records.map((record) => {
              const isComplete = record.scores.overall !== null && Object.keys(record.failedSections).length === 0;
              const questionSource = resolveQuestionSource(record, questionBank);
              const originLabel = formatQuestionSource(questionSource, language);
              const scoreItems = [
                { label: record.submission.taskNumber === "1" ? "TA" : "TR", score: record.scores.taskResponse },
                { label: "CC", score: record.scores.coherence },
                { label: "LR", score: record.scores.lexicalResource },
                { label: "GRA", score: record.scores.grammaticalRange },
              ];

                return (
                  <article
                  key={record.id}
                  className="group relative rounded-2xl border border-border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_14px_30px_rgba(127,29,29,0.10)] sm:p-5"
                >
                  <button
                    type="button"
                    onClick={() => onOpenRecord(record.id)}
                    className="w-full pr-10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <FileText className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{originLabel}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {isComplete ? t.writing.historyComplete : t.writing.historyPartial}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatHistoryDate(record.createdAt, language)} · {record.submission.wordCount} {t.writing.wordCount}
                          </span>
                        </div>
                        <p className="mt-2 max-h-12 overflow-hidden text-sm leading-6 text-foreground/75">
                          {record.submission.question}
                        </p>
                      </div>
                      <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4 sm:grid-cols-[repeat(4,minmax(0,1fr))_minmax(7.5rem,1.2fr)]">
                      {scoreItems.map((item) => (
                        <div key={item.label} className="rounded-xl bg-muted/55 px-3 py-2">
                          <p className="text-[10px] font-semibold text-muted-foreground">{item.label}</p>
                          <p className="mt-0.5 font-[family-name:var(--font-heading)] text-lg font-bold tabular-nums text-foreground">{item.score ?? "—"}</p>
                        </div>
                      ))}
                      <div className="col-span-2 rounded-xl bg-primary px-3 py-2 text-primary-foreground sm:col-span-1">
                        <p className="text-[10px] font-semibold text-white/75">{t.feedback.overall}</p>
                        <p className="mt-0.5 font-[family-name:var(--font-heading)] text-lg font-bold tabular-nums">{record.scores.overall ?? "—"}</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(record.id)}
                    disabled={deletingId === record.id}
                    aria-label={t.writing.historyDelete}
                    title={t.writing.historyDelete}
                    className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-wait disabled:opacity-60 sm:right-5 sm:top-5"
                  >
                    {deletingId === record.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </button>
                </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function normalizeQuestionForMatch(question: string) {
  return question.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function resolveQuestionSource(
  record: HistoryRecordSummary,
  questionBank: QuestionBank | null,
): CambridgeQuestionSource | undefined {
  if (record.submission.questionSource?.kind === "cambridge") {
    return record.submission.questionSource;
  }

  const matchingQuestion = questionBank?.questions.find((entry) => (
    entry.taskNumber === record.submission.taskNumber
    && normalizeQuestionForMatch(entry.prompt) === normalizeQuestionForMatch(record.submission.question)
  ));

  return matchingQuestion
    ? {
        kind: "cambridge",
        book: matchingQuestion.book,
        test: matchingQuestion.test,
        taskNumber: matchingQuestion.taskNumber,
      }
    : undefined;
}

function formatQuestionSource(source: CambridgeQuestionSource | undefined, language: Language) {
  if (!source) return language === "zh" ? "自定义作文" : "Custom writing";
  const prefix = language === "zh" ? "剑雅" : "Cambridge";
  return `${prefix} ${source.book} · Test ${source.test} · Task ${source.taskNumber}`;
}

function formatHistoryDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
