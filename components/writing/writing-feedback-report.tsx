"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  FileText,
  Lightbulb,
  Target,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
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

interface WritingFeedbackReportProps {
  submission: WritingSubmission;
  overview: WritingOverviewFeedback | null;
  scoring: WritingScoringFeedback | null;
  languageAnalysis: WritingLanguageFeedback | null;
  improvement: WritingImprovementFeedback | null;
  overallScore: number | null;
  taskResponseLabel: string;
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

function findMatches(essay: string, sources: HighlightSource[]): HighlightMatch[] {
  const lowerEssay = essay.toLocaleLowerCase();
  const matches: HighlightMatch[] = [];

  for (const source of sources) {
    const needle = source.text.trim();
    if (!needle) continue;

    let from = 0;
    let index = lowerEssay.indexOf(needle.toLocaleLowerCase(), from);
    while (index !== -1) {
      const end = index + needle.length;
      const overlaps = matches.some(
        (match) => index < match.end && end > match.start,
      );
      if (!overlaps) {
        matches.push({ ...source, start: index, end });
        break;
      }
      from = index + 1;
      index = lowerEssay.indexOf(needle.toLocaleLowerCase(), from);
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

function ScoreValue({ score }: { score: number | null }) {
  return (
    <span className="font-[family-name:var(--font-heading)] text-2xl font-bold tabular-nums text-primary">
      {score ?? "—"}
    </span>
  );
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
}: WritingFeedbackReportProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ReportTab>("summary");
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const essayPanelRef = useRef<HTMLDivElement>(null);

  const sources = useMemo<HighlightSource[]>(() => {
    if (activeTab === "correction") {
      return (languageAnalysis?.essayHighlights ?? []).map((item, index) => ({
        id: `correction-${index}`,
        text: item.text,
        tone: item.kind,
      }));
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
  }, [activeTab, improvement?.topicPhrases, languageAnalysis?.essayHighlights, languageAnalysis?.synonymSuggestions]);

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
                />
              )}
              {activeTab === "correction" && (
                <CorrectionsPanel
                  languageAnalysis={languageAnalysis}
                  selectedId={activeHighlightId}
                  onSelect={selectHighlight}
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

function SummaryPanel({
  overview,
  scoring,
  languageAnalysis,
  overallScore,
  taskResponseLabel,
}: {
  overview: WritingOverviewFeedback | null;
  scoring: WritingScoringFeedback | null;
  languageAnalysis: WritingLanguageFeedback | null;
  overallScore: number | null;
  taskResponseLabel: string;
}) {
  const { t } = useI18n();
  const criteria = [
    { label: taskResponseLabel, score: scoring?.taskResponseScore ?? null },
    { label: t.feedback.coherenceCohesion, score: scoring?.coherenceScore ?? null },
    { label: t.feedback.lexicalResource, score: languageAnalysis?.lexicalResourceScore ?? null },
    { label: t.feedback.grammaticalRange, score: languageAnalysis?.grammaticalRangeScore ?? null },
  ];

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#8f151c] via-primary to-[#ef4444] p-5 text-primary-foreground shadow-[0_14px_28px_rgba(185,28,28,0.22)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white/85">{t.feedback.overall}</p>
            <p className="mt-1 text-xs leading-5 text-white/75">{t.feedback.bandScore}</p>
          </div>
          <div className="text-right">
            <span className="font-[family-name:var(--font-heading)] text-5xl font-bold tabular-nums tracking-tight">
              {overallScore ?? "—"}
            </span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {criteria.map((criterion) => (
            <div key={criterion.label} className="rounded-xl bg-white/12 px-3 py-2.5 backdrop-blur-sm">
              <p className="min-h-8 text-[10px] font-medium leading-4 text-white/70">
                {criterion.label}
              </p>
              <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-bold tabular-nums">
                {criterion.score ?? "—"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {overview ? (
        <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Target className="size-4 text-primary" />
            {t.feedback.overview}
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground/85">{overview.overview}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FeedbackList
              title={t.feedback.strengths}
              items={overview.strengths}
              tone="positive"
            />
            <FeedbackList
              title={t.feedback.weaknesses}
              items={overview.weaknesses}
              tone="improve"
            />
          </div>
        </div>
      ) : (
        <LoadingPanel label={t.feedback.waitingForFeedback} />
      )}

      {(scoring || languageAnalysis) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <CriterionCard
            label={taskResponseLabel}
            score={scoring?.taskResponseScore ?? null}
            summary={scoring?.taskResponseHighLevel ?? ""}
          />
          <CriterionCard
            label={t.feedback.coherenceCohesion}
            score={scoring?.coherenceScore ?? null}
            summary={scoring?.coherenceHighLevel ?? ""}
          />
          <CriterionCard
            label={t.feedback.lexicalResource}
            score={languageAnalysis?.lexicalResourceScore ?? null}
            summary={languageAnalysis?.lexicalResourceHighLevel ?? ""}
          />
          <CriterionCard
            label={t.feedback.grammaticalRange}
            score={languageAnalysis?.grammaticalRangeScore ?? null}
            summary={languageAnalysis?.grammaticalRangeHighLevel ?? ""}
          />
        </div>
      )}
    </div>
  );
}

function CorrectionsPanel({
  languageAnalysis,
  selectedId,
  onSelect,
}: {
  languageAnalysis: WritingLanguageFeedback | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const highlights = languageAnalysis?.essayHighlights ?? [];
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

      {highlights.length > 0 ? (
        highlights.map((item, index) => (
          <button
            key={`${item.text}-${index}`}
            type="button"
            onClick={() => onSelect(`correction-${index}`)}
            className={`w-full rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
              selectedId === `correction-${index}`
                ? "border-primary ring-2 ring-primary/20"
                : "border-border bg-white"
            }`}
          >
            <div className="flex gap-3">
              <StatusIcon kind={item.kind} />
              <div className="min-w-0 flex-1">
                <p className={`inline rounded px-1.5 py-0.5 text-sm font-semibold ${HIGHLIGHT_CLASSES[item.kind]}`}>
                  {item.text}
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground/80">{item.explanation}</p>
              </div>
            </div>
          </button>
        ))
      ) : languageAnalysis?.keyChanges?.length ? (
        <div className="space-y-3">
          {languageAnalysis.keyChanges.map((change, index) => (
            <div key={`${change}-${index}`} className="rounded-2xl border border-border bg-white p-4 text-sm leading-6 text-foreground/85">
              {change}
            </div>
          ))}
          <p className="px-1 text-xs text-muted-foreground">{t.feedback.noMappedFeedback}</p>
        </div>
      ) : (
        <EmptyMappedFeedback label={t.feedback.waitingForFeedback} />
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

function FeedbackList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "positive" | "improve";
}) {
  const positive = tone === "positive";
  return (
    <div className={`rounded-xl p-3 ${positive ? "bg-emerald-50" : "bg-amber-50"}`}>
      <p className={`text-xs font-semibold ${positive ? "text-emerald-800" : "text-amber-800"}`}>{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.length > 0 ? items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2 text-xs leading-5 text-foreground/75">
            <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${positive ? "bg-emerald-500" : "bg-amber-500"}`} />
            {item}
          </li>
        )) : (
          <li className="text-xs text-muted-foreground">—</li>
        )}
      </ul>
    </div>
  );
}

function CriterionCard({
  label,
  score,
  summary,
}: {
  label: string;
  score: number | null;
  summary: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold leading-5 text-foreground/80">{label}</p>
        <ScoreValue score={score} />
      </div>
      {summary && <p className="mt-2 text-xs leading-5 text-muted-foreground">{summary}</p>}
    </div>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
      <span className="size-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
      {label}
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
