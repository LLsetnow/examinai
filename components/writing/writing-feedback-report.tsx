"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  FileText,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { computeSentenceDiffs } from "@/lib/writing/correction-diff";
import type {
  EssayHighlightKind,
  WritingImprovementFeedback,
  WritingLanguageFeedback,
  WritingOverviewFeedback,
  WritingScoringFeedback,
  WritingSubmission,
} from "@/lib/types";

type ReportTab = "summary" | "correction" | "synonyms" | "topics";
type HighlightTone = EssayHighlightKind | "synonym" | "topic";

interface HighlightSource {
  id: string;
  text: string;
  tone: HighlightTone;
}

interface HighlightMatch extends HighlightSource {
  start: number;
  end: number;
}

interface CorrectionItem extends Omit<HighlightSource, "tone"> {
  tone: EssayHighlightKind;
  explanation: string;
  recovered?: boolean;
}

interface WritingFeedbackReportProps {
  submission: WritingSubmission;
  overview: WritingOverviewFeedback | null;
  scoring: WritingScoringFeedback | null;
  languageAnalysis: WritingLanguageFeedback | null;
  improvement: WritingImprovementFeedback | null;
  overallScore: number | null;
  taskResponseLabel: string;
  /** Whether the assessment stream is still in progress (controls loaders). */
  isStreaming?: boolean;
  assessmentProgress?: ReactNode;
  onRegenerateCorrections?: () => void;
  isRegeneratingCorrections?: boolean;
}

const HIGHLIGHT_CLASSES: Record<HighlightTone, string> = {
  error: "bg-red-100 text-red-950 ring-1 ring-inset ring-red-200",
  suggestion: "bg-amber-100 text-amber-950 ring-1 ring-inset ring-amber-200",
  strength: "bg-emerald-100 text-emerald-950 ring-1 ring-inset ring-emerald-200",
  synonym: "bg-blue-100 text-blue-950 ring-1 ring-inset ring-blue-200",
  topic: "bg-violet-100 text-violet-950 ring-1 ring-inset ring-violet-200",
};

const ACTIVE_HIGHLIGHT_CLASSES: Record<HighlightTone, string> = {
  error: "ring-2 ring-red-500 ring-offset-2",
  suggestion: "ring-2 ring-amber-500 ring-offset-2",
  strength: "ring-2 ring-emerald-500 ring-offset-2",
  synonym: "ring-2 ring-blue-500 ring-offset-2",
  topic: "ring-2 ring-violet-500 ring-offset-2",
};

function rangesOverlap(start: number, end: number, matches: Array<{ start: number; end: number }>) {
  return matches.some((match) => start < match.end && end > match.start);
}

function flexibleExcerptPattern(text: string) {
  let pattern = "";
  let previousWasWhitespace = false;

  for (const character of text.trim()) {
    if (/\s/.test(character)) {
      if (!previousWasWhitespace) pattern += "\\s+";
      previousWasWhitespace = true;
      continue;
    }

    previousWasWhitespace = false;
    if (character === "'" || character === "’" || character === "‘") {
      pattern += "['‘’]";
    } else if (character === '"' || character === "“" || character === "”") {
      pattern += '["“”]';
    } else if (character === "-" || character === "–" || character === "—") {
      pattern += "[-–—]";
    } else {
      pattern += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }

  return pattern;
}

function findExcerptRange(
  essay: string,
  excerpt: string,
  matches: Array<{ start: number; end: number }> = [],
) {
  const needle = excerpt.trim();
  if (!needle) return null;

  const lowerEssay = essay.toLocaleLowerCase();
  const lowerNeedle = needle.toLocaleLowerCase();
  let index = lowerEssay.indexOf(lowerNeedle);
  while (index !== -1) {
    const end = index + needle.length;
    if (!rangesOverlap(index, end, matches)) return { start: index, end };
    index = lowerEssay.indexOf(lowerNeedle, index + 1);
  }

  const pattern = flexibleExcerptPattern(needle);
  if (!pattern) return null;
  const matcher = new RegExp(pattern, "gi");
  let result = matcher.exec(essay);
  while (result) {
    const start = result.index;
    const end = start + result[0].length;
    if (!rangesOverlap(start, end, matches)) return { start, end };
    result = matcher.exec(essay);
  }
  return null;
}

function normalizeSentenceForComparison(text: string) {
  return text
    .toLocaleLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function recoverCorrectionItems(
  essay: string,
  correctedEssay: string,
  explanation: string,
): CorrectionItem[] {
  const usedTexts = new Set<string>();
  const items: CorrectionItem[] = [];

  const diffs = computeSentenceDiffs(essay, correctedEssay);
  diffs.forEach((diff, sentenceIndex) => {
    diff.removedExcerpts.forEach((text, excerptIndex) => {
      const normalized = normalizeSentenceForComparison(text);
      if (!normalized || usedTexts.has(normalized)) return;

      usedTexts.add(normalized);
      items.push({
        id: `correction-recovered-${sentenceIndex}-${excerptIndex}`,
        text,
        tone: "error",
        explanation,
        recovered: true,
      });
    });
  });

  return items.slice(0, 6);
}

function buildCorrectionItems(
  essay: string,
  languageAnalysis: WritingLanguageFeedback | null,
  fallbackExplanation: string,
): CorrectionItem[] {
  const highlights = languageAnalysis?.essayHighlights ?? [];
  const mappableItems = highlights.flatMap((item, index) => (
    findExcerptRange(essay, item.text)
      ? [{
        id: `correction-${index}`,
        text: item.text,
        tone: item.kind,
        explanation: item.explanation,
      } satisfies CorrectionItem]
      : []
  ));

  const recoveredItems = recoverCorrectionItems(
    essay,
    languageAnalysis?.correctedEssay ?? "",
    fallbackExplanation,
  );

  if (highlights.length === 0) {
    return recoveredItems;
  }

  if (mappableItems.length === highlights.length || recoveredItems.length === 0) {
    return mappableItems;
  }

  const remaining = Math.max(0, Math.min(6, Math.max(highlights.length, 3)) - mappableItems.length);
  return [...mappableItems, ...recoveredItems.slice(0, remaining)];
}

function findMatches(essay: string, sources: HighlightSource[]): HighlightMatch[] {
  const matches: HighlightMatch[] = [];

  for (const source of sources) {
    const range = findExcerptRange(essay, source.text, matches);
    if (range) matches.push({ ...source, ...range });
  }

  return matches.sort((a, b) => a.start - b.start);
}

function EmptyMappedFeedback({ label }: { label: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-8 text-center">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {t.feedback.noMappedFeedback}
      </p>
    </div>
  );
}

export function WritingFeedbackReport({
  submission,
  overview,
  scoring,
  languageAnalysis,
  improvement,
  overallScore,
  taskResponseLabel,
  isStreaming = false,
  assessmentProgress,
  onRegenerateCorrections,
  isRegeneratingCorrections = false,
}: WritingFeedbackReportProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ReportTab>("summary");
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const essayPanelRef = useRef<HTMLDivElement>(null);

  const correctionItems = useMemo(
    () => buildCorrectionItems(
      submission.essay,
      languageAnalysis,
      t.feedback.correctionFallbackExplanation,
    ),
    [languageAnalysis, submission.essay, t.feedback.correctionFallbackExplanation],
  );
  const hasUnmappableCorrections = useMemo(
    () => (languageAnalysis?.essayHighlights ?? []).some(
      (item) => !findExcerptRange(submission.essay, item.text),
    ),
    [languageAnalysis?.essayHighlights, submission.essay],
  );

  const sources = useMemo<HighlightSource[]>(() => {
    if (activeTab === "correction") {
      return correctionItems;
    }
    if (activeTab === "synonyms") {
      return (languageAnalysis?.synonymSuggestions ?? []).map((item, index) => ({
        id: `synonym-${index}`,
        text: item.text,
        tone: "synonym",
      }));
    }
    if (activeTab === "topics") {
      return (improvement?.topicPhrases ?? []).map((item, index) => ({
        id: `topic-${index}`,
        text: item.text,
        tone: "topic",
      }));
    }
    return [];
  }, [activeTab, correctionItems, improvement?.topicPhrases, languageAnalysis?.synonymSuggestions]);

  const matches = useMemo(
    () => findMatches(submission.essay, sources),
    [sources, submission.essay],
  );

  function selectHighlight(id: string) {
    setActiveHighlightId(id);
    const panel = essayPanelRef.current;
    const target = panel?.querySelector<HTMLElement>(`[data-highlight-id="${id}"]`);
    if (!panel || !target) return;
    panel.scrollTo({
      top: Math.max(0, target.offsetTop - panel.clientHeight * 0.28),
      behavior: "smooth",
    });
  }

  const tabs: Array<{ id: ReportTab; label: string }> = [
    { id: "summary", label: t.feedback.overview },
    { id: "correction", label: t.feedback.correction },
    { id: "synonyms", label: t.feedback.synonyms },
    { id: "topics", label: t.feedback.topicPhrases },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#fffafa]">
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)]">
        <aside className="min-h-0 border-b border-border/80 bg-background lg:border-r lg:border-b-0">
          <div className="h-full overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar]:w-2">
            <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6 lg:p-7">
              <section>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {t.writing.questionText}
                </p>
                <div className="mt-2 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                    {submission.question}
                  </p>
                </div>
                {submission.imageUrl && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-white p-3 shadow-sm">
                    <img
                      src={submission.imageUrl}
                      alt={t.writing.taskChart}
                      className="h-auto w-full rounded-xl object-contain"
                    />
                  </div>
                )}
              </section>

              <section className="min-h-[20rem]">
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    <FileText className="size-3.5" />
                    {t.feedback.original}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {t.writing.wordCount}: {submission.wordCount}
                  </span>
                </div>
                <div
                  ref={essayPanelRef}
                  className="max-h-[32rem] overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-sm [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/25 [&::-webkit-scrollbar]:w-2 sm:p-5 lg:max-h-[calc(100dvh-22rem)]"
                >
                  <p className="whitespace-pre-wrap text-[15px] leading-8 text-foreground/90">
                    {renderEssay(submission.essay, matches, activeHighlightId)}
                  </p>
                </div>
              </section>
            </div>
          </div>
        </aside>

        <section className="min-h-0 bg-[#fffafa] p-3 sm:p-5 lg:p-6">
          <div className="flex h-full min-h-[36rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-red-100 bg-background shadow-[0_12px_32px_rgba(153,27,27,0.07)] lg:min-h-0">
            <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setActiveHighlightId(null);
                  }}
                  className={`relative whitespace-nowrap rounded-t-lg px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4 ${
                    activeTab === tab.id
                      ? "bg-red-50 text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                  aria-pressed={activeTab === tab.id}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:rgba(220,38,38,0.35)_transparent] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/35 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2 sm:p-5">
              {activeTab === "summary" && (
                <SummaryPanel
                  overview={overview}
                  scoring={scoring}
                  languageAnalysis={languageAnalysis}
                  overallScore={overallScore}
                  taskResponseLabel={taskResponseLabel}
                  taskNumber={submission.taskNumber}
                  isStreaming={isStreaming}
                  assessmentProgress={assessmentProgress}
                />
              )}
              {activeTab === "correction" && (
                <CorrectionsPanel
                  corrections={correctionItems}
                  keyChanges={languageAnalysis?.keyChanges ?? []}
                  selectedId={activeHighlightId}
                  onSelect={selectHighlight}
                  needsRegeneration={hasUnmappableCorrections}
                  onRegenerate={onRegenerateCorrections}
                  isRegenerating={isRegeneratingCorrections}
                />
              )}
              {activeTab === "synonyms" && (
                <SynonymsPanel
                  languageAnalysis={languageAnalysis}
                  selectedId={activeHighlightId}
                  onSelect={selectHighlight}
                />
              )}
              {activeTab === "topics" && (
                <TopicsPanel
                  improvement={improvement}
                  selectedId={activeHighlightId}
                  onSelect={selectHighlight}
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function renderEssay(
  essay: string,
  matches: HighlightMatch[],
  activeHighlightId: string | null,
) {
  if (matches.length === 0) return essay;
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      nodes.push(essay.slice(cursor, match.start));
    }
    nodes.push(
      <mark
        key={match.id}
        data-highlight-id={match.id}
        className={`rounded px-0.5 py-0.5 transition-shadow ${HIGHLIGHT_CLASSES[match.tone]} ${
          activeHighlightId === match.id
            ? ACTIVE_HIGHLIGHT_CLASSES[match.tone]
            : ""
        }`}
      >
        {essay.slice(match.start, match.end)}
      </mark>,
    );
    cursor = match.end;
  }
  if (cursor < essay.length) nodes.push(essay.slice(cursor));
  return nodes;
}

const SIGNAL_STYLES = {
  good: {
    container: "bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-700",
  },
  warning: {
    container: "bg-amber-50",
    icon: "bg-amber-100 text-amber-700",
  },
  alert: {
    container: "bg-red-50",
    icon: "bg-red-100 text-red-700",
  },
} as const;

type SignalTone = keyof typeof SIGNAL_STYLES;

function signalTone(score: number | null): SignalTone {
  if (score === null || score === 6) return "warning";
  return score >= 7 ? "good" : "alert";
}

function SummaryPanel({
  overview,
  scoring,
  languageAnalysis,
  overallScore,
  taskResponseLabel,
  taskNumber,
  isStreaming,
  assessmentProgress,
}: {
  overview: WritingOverviewFeedback | null;
  scoring: WritingScoringFeedback | null;
  languageAnalysis: WritingLanguageFeedback | null;
  overallScore: number | null;
  taskResponseLabel: string;
  taskNumber: WritingSubmission["taskNumber"];
  isStreaming: boolean;
  assessmentProgress?: ReactNode;
}) {
  const { t } = useI18n();
  const taskResponseCode = taskResponseLabel === t.feedback.taskAchievement ? "TA" : "TR";
  const criteria = [
    {
      code: taskResponseCode,
      fullLabel: taskResponseLabel,
      score: scoring?.taskResponseScore ?? null,
      summary: scoring?.taskResponseHighLevel ?? "",
    },
    {
      code: "CC",
      fullLabel: t.feedback.coherenceCohesion,
      score: scoring?.coherenceScore ?? null,
      summary: scoring?.coherenceHighLevel ?? "",
    },
    {
      code: "LR",
      fullLabel: t.feedback.lexicalResource,
      score: languageAnalysis?.lexicalResourceScore ?? null,
      summary: languageAnalysis?.lexicalResourceHighLevel ?? "",
    },
    {
      code: "GRA",
      fullLabel: t.feedback.grammaticalRange,
      score: languageAnalysis?.grammaticalRangeScore ?? null,
      summary: languageAnalysis?.grammaticalRangeHighLevel ?? "",
    },
  ];
  const signals = criteria.filter((criterion) => criterion.score !== null || criterion.summary);
  const heroDescription = overview
    ? [
      overview.strengths[0] ? `${t.feedback.strengths}: ${overview.strengths[0]}` : "",
      overview.weaknesses[0] ? `${t.feedback.weaknesses}: ${overview.weaknesses[0]}` : "",
    ].filter(Boolean).join(" · ")
    : "";
  const detailItems = overview
    ? [
      ...overview.strengths.map((item) => ({ label: t.feedback.strengths, item, positive: true })),
      ...overview.weaknesses.map((item) => ({ label: t.feedback.weaknesses, item, positive: false })),
    ].slice(0, 4)
    : [];

  return (
    <div className="space-y-5">
      <div className="grid gap-[18px] rounded-2xl border border-red-200/70 bg-[linear-gradient(122deg,#fff8f8_0%,#fff_66%,#fff0f0_100%)] p-5 sm:grid-cols-[minmax(0,1fr)_13.125rem] sm:p-6">
        <div className="min-w-0">
          <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.09em] text-primary">
            {taskNumber === "1" ? t.writing.task1 : t.writing.task2} · {t.feedback.assessmentLabel}
          </p>
          <h1 className="max-w-2xl text-xl font-extrabold leading-[1.32] tracking-tight text-[#26283a] sm:text-2xl">
            {overview?.overview ?? (isStreaming ? t.feedback.waitingForFeedback : "—")}
          </h1>
          {heroDescription && (
            <p className="mt-2.5 max-w-2xl text-[13px] leading-6 text-[#686b7b]">{heroDescription}</p>
          )}
        </div>
        <div className="relative isolate flex min-h-[9.375rem] flex-col items-center justify-center overflow-hidden rounded-[14px] bg-primary text-primary-foreground">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-9 -top-9 size-[8.125rem] rounded-full border-[22px] border-white/10"
          />
          <p className="relative z-10 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/80">
            {t.feedback.overall}
          </p>
          <strong className="relative z-10 mt-px font-[family-name:var(--font-heading)] text-[3.4375rem] font-extrabold leading-none tracking-[-0.25rem]">
            {overallScore ?? "—"}
          </strong>
          <em className="relative z-10 mt-1 text-[11px] font-bold not-italic text-white/80">
            {t.feedback.forReference}
          </em>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" aria-label={t.feedback.overall}>
        {criteria.map((criterion) => (
          <div
            key={criterion.code}
            className="min-w-0 rounded-xl border border-border bg-white px-2 py-3 text-center"
            title={criterion.fullLabel}
            aria-label={`${criterion.fullLabel}: ${criterion.score ?? "—"}`}
          >
            <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-extrabold text-[#858896]">
              {criterion.code}
            </p>
            <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-extrabold leading-none tabular-nums text-primary">
              {criterion.score ?? "—"}
            </p>
          </div>
        ))}
      </div>

      {overview || signals.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
          <article className="rounded-2xl border border-border bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-[#303346]">
              <b className="grid size-[22px] place-items-center rounded-[7px] bg-primary font-sans text-[11px] text-white">01</b>
              {t.feedback.overview}
            </h2>
            {overview ? (
              <>
                <p className="mt-2.5 text-[13px] leading-6 text-[#626575]">{overview.overview}</p>
                {detailItems.length > 0 && (
                  <ul className="mt-3.5 grid gap-2.5 pl-0">
                    {detailItems.map((detail, index) => (
                      <li key={`${detail.item}-${index}`} className="relative pl-4 text-xs leading-5 text-[#525566] before:absolute before:left-0 before:top-2 before:size-1.5 before:rounded-full before:bg-primary">
                        <span className={detail.positive ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                          {detail.label}: {" "}
                        </span>
                        {detail.item}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="mt-2.5 text-sm text-muted-foreground">{t.feedback.waitingForFeedback}</p>
            )}
          </article>

          <aside className="rounded-2xl border border-border bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-[#303346]">
              <b className="grid size-[22px] place-items-center rounded-[7px] bg-primary font-sans text-[11px] text-white">02</b>
              {t.feedback.keySignals}
            </h2>
            <div className="mt-2.5 grid gap-2.5">
              {signals.length > 0 ? signals.map((criterion) => {
                const tone = signalTone(criterion.score);
                const styles = SIGNAL_STYLES[tone];
                return (
                  <div key={criterion.code} className={`grid grid-cols-[28px_1fr] items-start gap-2.5 rounded-[10px] p-2.5 ${styles.container}`}>
                    <span className={`grid size-[25px] place-items-center rounded-lg text-[11px] font-extrabold ${styles.icon}`}>
                      {tone === "good" ? "✓" : tone === "warning" ? "!" : "×"}
                    </span>
                    <div>
                      <strong className="block text-xs text-[#3c3f50]">{criterion.fullLabel}</strong>
                      <span className="mt-0.5 block text-[11px] leading-[1.45] text-[#747786]">
                        {criterion.summary || `${t.feedback.bandScore}: ${criterion.score ?? "—"}`}
                      </span>
                    </div>
                  </div>
                );
              }) : (
                <p className="text-xs text-muted-foreground">{t.feedback.waitingForFeedback}</p>
              )}
            </div>
          </aside>
        </div>
      ) : isStreaming ? (
        <LoadingPanel
          label={t.feedback.waitingForFeedback}
          progress={assessmentProgress}
        />
      ) : null}
    </div>
  );
}

function CorrectionsPanel({
  corrections,
  keyChanges,
  selectedId,
  onSelect,
  needsRegeneration,
  onRegenerate,
  isRegenerating,
}: {
  corrections: CorrectionItem[];
  keyChanges: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  needsRegeneration: boolean;
  onRegenerate?: () => void;
  isRegenerating: boolean;
}) {
  const { t } = useI18n();
  const legend = [
    { kind: "error" as const, label: t.feedback.severeError },
    { kind: "suggestion" as const, label: t.feedback.suggestion },
    { kind: "strength" as const, label: t.feedback.highlight },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/35 p-3">
        <p className="text-xs font-semibold text-foreground">{t.feedback.correction}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {legend.map((item) => (
            <span key={item.kind} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={`size-2.5 rounded-full ${legendDot(item.kind)}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {corrections.some((item) => item.recovered) && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          {t.feedback.correctionFallbackNotice}
        </p>
      )}

      {needsRegeneration && onRegenerate && (
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-3">
          <p className="text-xs leading-5 text-red-900">{t.feedback.correctionRegenerateNotice}</p>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="mt-2 border-red-200 bg-white text-primary hover:bg-red-100"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            <RotateCcw className={`size-3 ${isRegenerating ? "animate-spin" : ""}`} />
            {t.feedback.correctionRegenerateAction}
          </Button>
        </div>
      )}

      {corrections.length > 0 ? (
        corrections.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`w-full rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
              selectedId === item.id
                ? "border-primary ring-2 ring-primary/20"
                : "border-border bg-white"
            }`}
          >
            <div className="flex gap-3">
              <StatusIcon kind={item.tone} />
              <div className="min-w-0 flex-1">
                <p className={`inline rounded px-1.5 py-0.5 text-sm font-semibold ${HIGHLIGHT_CLASSES[item.tone]}`}>
                  {item.text}
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground/80">{item.explanation}</p>
              </div>
            </div>
          </button>
        ))
      ) : keyChanges.length ? (
        <div className="space-y-3">
          {keyChanges.map((change, index) => (
            <div key={`${change}-${index}`} className="rounded-2xl border border-border bg-white p-4 text-sm leading-6 text-foreground/85">
              {change}
            </div>
          ))}
          <p className="px-1 text-xs text-muted-foreground">{t.feedback.noMappedFeedback}</p>
        </div>
      ) : isRegenerating ? (
        <EmptyMappedFeedback label={t.feedback.waitingForFeedback} />
      ) : (
        <EmptyMappedFeedback label={t.feedback.noCorrectionsGenerated} />
      )}
    </div>
  );
}

function SynonymsPanel({
  languageAnalysis,
  selectedId,
  onSelect,
}: {
  languageAnalysis: WritingLanguageFeedback | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const suggestions = languageAnalysis?.synonymSuggestions ?? [];
  if (suggestions.length === 0) return <EmptyMappedFeedback label={t.feedback.synonyms} />;

  return (
    <div className="space-y-3">
      {suggestions.map((item, index) => (
        <button
          key={`${item.text}-${index}`}
          type="button"
          onClick={() => onSelect(`synonym-${index}`)}
          className={`w-full rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
            selectedId === `synonym-${index}`
              ? "border-primary ring-2 ring-primary/20"
              : "border-border bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-foreground">
            <span className={`rounded px-1.5 py-0.5 ${HIGHLIGHT_CLASSES.synonym}`}>{item.text}</span>
            <span className="ml-2 text-muted-foreground">→</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.alternatives.map((alternative) => (
              <span key={alternative} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
                {alternative}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{item.note}</p>
        </button>
      ))}
    </div>
  );
}

function TopicsPanel({
  improvement,
  selectedId,
  onSelect,
}: {
  improvement: WritingImprovementFeedback | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const phrases = improvement?.topicPhrases ?? [];
  if (phrases.length === 0) return <EmptyMappedFeedback label={t.feedback.topicPhrases} />;

  return (
    <div className="space-y-3">
      {phrases.map((item, index) => (
        <button
          key={`${item.text}-${index}`}
          type="button"
          onClick={() => onSelect(`topic-${index}`)}
          className={`w-full rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
            selectedId === `topic-${index}`
              ? "border-primary ring-2 ring-primary/20"
              : "border-border bg-white"
          }`}
        >
          <div className="flex items-start gap-3">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-violet-600" />
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                {item.label}
              </span>
              <p className={`mt-2 inline rounded px-1.5 py-0.5 text-sm font-semibold ${HIGHLIGHT_CLASSES.topic}`}>
                {item.text}
              </p>
              <p className="mt-3 text-sm leading-6 text-foreground/80">{item.explanation}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function LoadingPanel({
  label,
  progress,
}: {
  label: string;
  progress?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-muted-foreground">
      <div className="flex items-center gap-3 text-sm">
        <span className="size-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        {label}
      </div>
      {progress}
    </div>
  );
}

function StatusIcon({ kind }: { kind: EssayHighlightKind }) {
  if (kind === "strength") return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />;
  if (kind === "suggestion") return <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />;
  return <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-600" />;
}

function legendDot(kind: EssayHighlightKind) {
  if (kind === "strength") return "bg-emerald-500";
  if (kind === "suggestion") return "bg-amber-500";
  return "bg-red-500";
}
