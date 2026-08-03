import { generateText } from "ai";
import { z } from "zod";
import { chatModel, zhipuVisionConfig } from "@/lib/ai/models";
import { formatChartFactsForAssessment, getCambridgeChartFacts } from "@/lib/question-bank/chart-facts";
import { resolveCambridgeQuestion } from "@/lib/question-bank/cambridge";
import { saveAssessmentHistory } from "@/lib/storage/assessment-history";
import type { AiProviderSettings, CambridgeQuestionSource } from "@/lib/types";
import {
  WRITING_EXPERT_1_PROMPT,
  WRITING_EXPERT_2_PROMPT,
  WRITING_EXPERT_3_CORRECTION_PROMPT,
  WRITING_EXPERT_3_ANNOTATION_PROMPT,
  WRITING_EXPERT_3_SCORE_PROMPT,
  WRITING_EXPERT_4_TASK1_PROMPT,
  WRITING_EXPERT_4_TASK2_PROMPT,
} from "@/lib/ai/prompts";

export const maxDuration = 120;

type FeedbackLanguage = "zh" | "en";

function parseCambridgeQuestionSource(value: unknown): CambridgeQuestionSource | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  if (
    source.kind !== "cambridge"
    || !Number.isInteger(source.book)
    || !Number.isInteger(source.test)
    || (source.taskNumber !== "1" && source.taskNumber !== "2")
  ) {
    return undefined;
  }

  return {
    kind: "cambridge",
    book: source.book as number,
    test: source.test as number,
    taskNumber: source.taskNumber,
  };
}

function parseProviderSettings(value: unknown): AiProviderSettings | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;

  function parseProvider(provider: unknown) {
    if (!provider || typeof provider !== "object") return undefined;
    const values = provider as Record<string, unknown>;
    const baseURL = typeof values.baseURL === "string" ? values.baseURL.trim() : undefined;
    const apiKey = typeof values.apiKey === "string" ? values.apiKey.trim() : undefined;
    const model = typeof values.model === "string" ? values.model.trim() : undefined;
    return baseURL || apiKey || model ? { baseURL, apiKey, model } : undefined;
  }

  const scoring = parseProvider(candidate.scoring);
  const vision = parseProvider(candidate.vision);
  return scoring || vision ? { scoring, vision } : undefined;
}

function localizePrompt(prompt: string, language: FeedbackLanguage) {
  const languageInstruction = language === "zh"
    ? "Write all feedback explanations, summaries, labels, definitions, and usage notes in Simplified Chinese. Keep the JSON keys, enum values, original excerpts, corrected essays, improved essays, and suggested English words or phrases in English."
    : "Write all feedback explanations, summaries, labels, definitions, and usage notes in English. Keep the JSON keys and enum values exactly as specified.";

  return `${prompt}\n\nOutput language rule:\n- ${languageInstruction}`;
}

function zhipuImageInput(imageUrl: string): string {
  if (imageUrl.startsWith("data:")) {
    const match = imageUrl.match(/^data:image\/(?:png|jpe?g|webp);base64,([a-z0-9+/=\s]+)$/i);
    if (!match) throw new Error("Unsupported chart image data.");
    // GLM-4V expects a bare Base64 payload for local images, not a data URL.
    return match[1].replace(/\s/g, "");
  }

  const parsedUrl = new URL(imageUrl);
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("Chart images must use an HTTP(S) URL or Base64 data.");
  }
  return parsedUrl.toString();
}

async function analyseTask1Chart(imageUrl: string, providerSettings?: AiProviderSettings): Promise<string> {
  const { apiKey, baseURL, modelId } = zhipuVisionConfig(providerSettings);
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract factual notes for an IELTS Task 1 assessor. First transcribe every clearly readable data point by series and year. Then identify title, units, main trends, crossings, extremes, and projections. Explicitly state any rise-then-fall or fall-then-rise pattern; never call a series continuously rising or falling if it changes direction. Do not grade the essay and do not invent unreadable values. Write concise notes in English." },
            { type: "image_url", image_url: { url: zhipuImageInput(imageUrl) } },
          ],
        },
      ],
      max_tokens: 1800,
      temperature: 0,
    }),
  });

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || `Zhipu returned HTTP ${response.status}.`);
  }

  const message = payload.choices?.[0]?.message;
  // Some GLM-4.6V responses put the useful vision analysis solely in the
  // reasoning field. It is still factual model output suitable for the
  // downstream text assessor when the final content field is empty.
  const text = (message?.content || message?.reasoning_content)?.trim();
  if (!text) throw new Error("Zhipu returned an empty chart analysis.");
  return text;
}

// --- Zod schemas for structured output ---

const overviewSchema = z.object({
  overview: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

const bandScoreSchema = z.number().int().min(0).max(9);

const scoringSchema = z.object({
  taskResponseHighLevel: z.string(),
  taskResponseStrengths: z.array(z.string()),
  taskResponseWeaknesses: z.array(z.string()),
  coherenceHighLevel: z.string(),
  coherenceStrengths: z.array(z.string()),
  coherenceWeaknesses: z.array(z.string()),
  taskResponseScore: bandScoreSchema,
  coherenceScore: bandScoreSchema,
});

const languageCorrectionSchema = z.object({
  correctedEssay: z.string(),
});

const essayHighlightSchema = z.object({
  text: z.string(),
  kind: z.enum(["error", "suggestion", "strength"]),
  explanation: z.string(),
});

const synonymSuggestionSchema = z.object({
  text: z.string(),
  alternatives: z.array(z.string()),
  note: z.string(),
});

const topicPhraseSchema = z.object({
  text: z.string(),
  label: z.string(),
  explanation: z.string(),
});

const languageAssessmentSchema = z.object({
  keyChanges: z.array(z.string()),
  lexicalResourceHighLevel: z.string(),
  lexicalResourceStrengths: z.array(z.string()),
  lexicalResourceWeaknesses: z.array(z.string()),
  grammaticalRangeHighLevel: z.string(),
  grammaticalRangeStrengths: z.array(z.string()),
  grammaticalRangeWeaknesses: z.array(z.string()),
  lexicalResourceScore: bandScoreSchema,
  grammaticalRangeScore: bandScoreSchema,
});

const languageAnnotationSchema = z.object({
  essayHighlights: z.array(essayHighlightSchema),
  synonymSuggestions: z.array(synonymSuggestionSchema),
});

const vocabularySchema = z.object({
  word: z.string(),
  meaning: z.string(),
  usage: z.string(),
});

const improvementTask1Schema = z.object({
  improvedEssay: z.string(),
  vocabularyExplanations: z.array(vocabularySchema),
  topicPhrases: z.array(topicPhraseSchema),
});

const improvementTask2Schema = z.object({
  expandIdeas: z.array(z.string()),
  improvedEssay: z.string(),
  vocabularyExplanations: z.array(vocabularySchema),
  topicPhrases: z.array(topicPhraseSchema),
  alternativeDirection: z.string(),
  alternativeEssay: z.string(),
  alternativeVocabulary: z.array(vocabularySchema),
});

// --- Normalize helpers (fill defaults for partial/missing fields) ---

/** Ensure a value is a string array. Wraps a bare string, defaults to []. */
function ensureArray(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.trim()) return [val];
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeOverview(raw: any) {
  return {
    overview: raw.overview ?? "",
    strengths: ensureArray(raw.strengths),
    weaknesses: ensureArray(raw.weaknesses),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeScoring(raw: any) {
  const taskResponseWeaknesses = ensureArray(raw.taskResponseWeaknesses);
  const coherenceWeaknesses = ensureArray(raw.coherenceWeaknesses);
  return {
    taskResponseHighLevel: raw.taskResponseHighLevel ?? "",
    taskResponseStrengths: ensureArray(raw.taskResponseStrengths),
    taskResponseWeaknesses,
    taskResponseScore: raw.taskResponseScore ?? null,
    coherenceHighLevel: raw.coherenceHighLevel ?? "",
    coherenceStrengths: ensureArray(raw.coherenceStrengths),
    coherenceWeaknesses,
    coherenceScore: raw.coherenceScore ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeLanguageAnalysis(raw: any) {
  const lexicalResourceWeaknesses = ensureArray(raw.lexicalResourceWeaknesses);
  const grammaticalRangeWeaknesses = ensureArray(raw.grammaticalRangeWeaknesses);
  return {
    lexicalResourceHighLevel: raw.lexicalResourceHighLevel ?? "",
    lexicalResourceStrengths: ensureArray(raw.lexicalResourceStrengths),
    lexicalResourceWeaknesses,
    grammaticalRangeHighLevel: raw.grammaticalRangeHighLevel ?? "",
    grammaticalRangeStrengths: ensureArray(raw.grammaticalRangeStrengths),
    grammaticalRangeWeaknesses,
    correctedEssay: raw.correctedEssay ?? "",
    keyChanges: ensureArray(raw.keyChanges),
    essayHighlights: Array.isArray(raw.essayHighlights) ? raw.essayHighlights : [],
    synonymSuggestions: Array.isArray(raw.synonymSuggestions)
      ? raw.synonymSuggestions
      : [],
    lexicalResourceScore: raw.lexicalResourceScore ?? null,
    grammaticalRangeScore: raw.grammaticalRangeScore ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeImprovement(raw: any, taskNumber: string, essay: string) {
  const base = {
    improvedEssay: raw.improvedEssay ?? "",
    vocabularyExplanations: filterRedundantVocabulary(
      Array.isArray(raw.vocabularyExplanations) ? raw.vocabularyExplanations : [],
      essay,
    ),
    topicPhrases: Array.isArray(raw.topicPhrases) ? raw.topicPhrases : [],
  };
  if (taskNumber === "2") {
    return {
      ...base,
      expandIdeas: ensureArray(raw.expandIdeas),
      alternativeDirection: raw.alternativeDirection ?? "",
      alternativeEssay: raw.alternativeEssay ?? "",
      alternativeVocabulary: filterRedundantVocabulary(
        Array.isArray(raw.alternativeVocabulary) ? raw.alternativeVocabulary : [],
        essay,
      ),
    };
  }
  return base;
}

function uniqueFeedback(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function buildScoreAlignedOverview(
  scoring: ReturnType<typeof normalizeScoring>,
  language: ReturnType<typeof normalizeLanguageAnalysis>,
) {
  return {
    overview: [
      scoring.taskResponseHighLevel,
      scoring.coherenceHighLevel,
      language.lexicalResourceHighLevel,
      language.grammaticalRangeHighLevel,
    ].filter(Boolean).join(" "),
    strengths: uniqueFeedback([
      ...scoring.taskResponseStrengths,
      ...scoring.coherenceStrengths,
      ...language.lexicalResourceStrengths,
      ...language.grammaticalRangeStrengths,
    ]).slice(0, 4),
    weaknesses: uniqueFeedback([
      ...scoring.taskResponseWeaknesses,
      ...scoring.coherenceWeaknesses,
      ...language.lexicalResourceWeaknesses,
      ...language.grammaticalRangeWeaknesses,
    ]).slice(0, 4),
  };
}

// --- Sentence-level diff for two-stage Expert 3 pipeline ---

interface SentenceDiff {
  sentence: string;
  removed: string;
  added: string;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function computeSentenceDiffs(
  original: string,
  corrected: string,
): SentenceDiff[] {
  const origSentences = splitSentences(original);
  const corrSentences = splitSentences(corrected);
  const diffs: SentenceDiff[] = [];

  // Use LCS on words within aligned sentences
  const len = Math.max(origSentences.length, corrSentences.length);
  for (let i = 0; i < len; i++) {
    const origSent = origSentences[i] ?? "";
    const corrSent = corrSentences[i] ?? "";
    if (origSent === corrSent) continue;

    const origWords = origSent.split(/\s+/).filter(Boolean);
    const corrWords = corrSent.split(/\s+/).filter(Boolean);

    // LCS to find common words
    const n = origWords.length;
    const m = corrWords.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () =>
      new Array(m + 1).fill(0),
    );
    for (let a = 1; a <= n; a++) {
      for (let b = 1; b <= m; b++) {
        dp[a][b] =
          origWords[a - 1] === corrWords[b - 1]
            ? dp[a - 1][b - 1] + 1
            : Math.max(dp[a - 1][b], dp[a][b - 1]);
      }
    }

    // Backtrack to find removed/added words
    const removed: string[] = [];
    const added: string[] = [];
    let a = n,
      b = m;
    while (a > 0 || b > 0) {
      if (a > 0 && b > 0 && origWords[a - 1] === corrWords[b - 1]) {
        a--;
        b--;
      } else if (b > 0 && (a === 0 || dp[a][b - 1] >= dp[a - 1][b])) {
        added.unshift(corrWords[b - 1]);
        b--;
      } else {
        removed.unshift(origWords[a - 1]);
        a--;
      }
    }

    if (removed.length > 0 || added.length > 0) {
      diffs.push({
        sentence: origSent || corrSent,
        removed: removed.join(" "),
        added: added.join(" "),
      });
    }
  }

  return diffs;
}

function formatDiffsForPrompt(diffs: SentenceDiff[]): string {
  if (diffs.length === 0) return "No changes were made.";
  return diffs
    .map((d, i) => {
      const parts = [`Change ${i + 1}:`];
      parts.push(`  Sentence: "${d.sentence}"`);
      if (d.removed) parts.push(`  Removed: "${d.removed}"`);
      if (d.added) parts.push(`  Added: "${d.added}"`);
      return parts.join("\n");
    })
    .join("\n\n");
}

/**
 * Normalise smart quotes, dash variants, whitespace and case so a model excerpt
 * that only differs cosmetically from the essay still counts as present. The
 * report locates highlights with its own flexible matcher, so keeping these
 * near-verbatim excerpts avoids falling back to a generic per-sentence notice.
 */
function normalizeExcerptForMatch(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[‘’′'`]/g, "'")
    .replace(/[“”″"]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function isExactOriginalExcerpt(essay: string, excerpt: string) {
  const normalizedExcerpt = normalizeExcerptForMatch(excerpt);
  return Boolean(normalizedExcerpt)
    && normalizeExcerptForMatch(essay).includes(normalizedExcerpt);
}

function mappableInlineAnnotations(
  annotations: z.infer<typeof languageAnnotationSchema>,
  essay: string,
  diffs: SentenceDiff[],
  feedbackLanguage: FeedbackLanguage,
): z.infer<typeof languageAnnotationSchema> {
  const usedHighlights = new Set<string>();
  const essayHighlights = annotations.essayHighlights.filter((item) => {
    const key = item.text.trim().toLocaleLowerCase();
    if (!isExactOriginalExcerpt(essay, item.text) || usedHighlights.has(key)) return false;
    usedHighlights.add(key);
    return true;
  });

  const usedSynonyms = new Set<string>();
  const synonymSuggestions = annotations.synonymSuggestions.filter((item) => {
    const key = item.text.trim().toLocaleLowerCase();
    if (!isExactOriginalExcerpt(essay, item.text) || usedSynonyms.has(key)) return false;
    usedSynonyms.add(key);
    return true;
  });

  if (essayHighlights.length > 0) {
    return { essayHighlights, synonymSuggestions };
  }

  const fallbackExplanation = feedbackLanguage === "zh"
    ? "该句与校正版存在修改，已在考生原文中标记。"
    : "This sentence differs from the corrected essay and has been marked in the original.";
  const fallbackTexts = new Set<string>();
  const fallbackHighlights = diffs.flatMap((diff) => {
    const text = diff.sentence.trim();
    const key = text.toLocaleLowerCase();
    if (!isExactOriginalExcerpt(essay, text) || fallbackTexts.has(key)) return [];
    fallbackTexts.add(key);
    return [{ text, kind: "error" as const, explanation: fallbackExplanation }];
  }).slice(0, 6);

  return { essayHighlights: fallbackHighlights, synonymSuggestions };
}

/** Remove vocabulary items whose word already appears in the student's essay. */
function filterRedundantVocabulary(
  vocabulary: { word: string; meaning: string; usage: string }[],
  essay: string,
): { word: string; meaning: string; usage: string }[] {
  const essayLower = essay.toLowerCase();
  return vocabulary.filter((item) => !essayLower.includes(item.word.toLowerCase()));
}

/** Retry a fn once on failure. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return await fn();
  }
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fencedJson = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  const candidate = (fencedJson ?? trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end <= start) {
    throw new Error("The model response did not contain a JSON object.");
  }

  const json = candidate.slice(start, end + 1);
  try {
    return JSON.parse(json);
  } catch {
    // Models occasionally include literal line breaks inside a JSON string.
    // Escape only those line breaks, preserving formatting outside strings.
    let repaired = "";
    let inString = false;
    let escaping = false;

    for (const character of json) {
      if (inString && (character === "\n" || character === "\r")) {
        if (character === "\n") repaired += "\\n";
        continue;
      }
      repaired += character;
      if (character === '"' && !escaping) inString = !inString;
      escaping = character === "\\" && !escaping;
      if (character !== "\\") escaping = false;
    }

    try {
      return JSON.parse(repaired.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      throw new Error("The model returned invalid JSON.");
    }
  }
}

async function generateJsonObject<S extends z.ZodType>(config: {
  model: Parameters<typeof generateText>[0]["model"];
  system: string;
  messages: NonNullable<Parameters<typeof generateText>[0]["messages"]>;
  maxOutputTokens: number;
  schema: S;
  /**
   * Optional semantic check for values that pass the schema but are clearly
   * wrong (e.g. an all-zero band set for a non-empty essay). Returning false
   * triggers a fresh regeneration rather than accepting the bad result.
   */
  validate?: (value: z.infer<S>) => boolean;
}): Promise<z.infer<S>> {
  const system = `${config.system}\n\nReturn exactly one valid JSON object. Do not use Markdown fences or add commentary outside the JSON.`;

  // Produce one schema-valid object, repairing an ill-formed reply if needed.
  const generateOnce = async (): Promise<z.infer<S>> => {
    const { text } = await generateText({
      model: config.model,
      system,
      messages: config.messages,
      maxOutputTokens: config.maxOutputTokens,
      temperature: 0,
      topP: 1,
    });
    try {
      return config.schema.parse(parseJsonObject(text));
    } catch {
      // Keep the assessment usable when an OpenAI-compatible endpoint replies
      // with prose despite the JSON-only instruction. A focused repair turn is
      // more reliable than failing an entire assessment section.
      const { text: repairedText } = await generateText({
        model: config.model,
        system: `${system}\n\nYou are repairing a prior response. Preserve its meaning, but output only a valid JSON object matching the requested fields.`,
        prompt: `Prior response to repair:\n${text}`,
        maxOutputTokens: config.maxOutputTokens,
        temperature: 0,
        topP: 1,
      });
      return config.schema.parse(parseJsonObject(repairedText));
    }
  };

  const result = await generateOnce();
  if (!config.validate || config.validate(result)) return result;

  // The result is schema-valid but implausible (seen with some models emitting
  // all-zero band scores). Regenerate from scratch instead of a meaning-
  // preserving repair, which would simply reproduce the bad values.
  const retried = await generateOnce();
  if (config.validate(retried)) return retried;
  throw new Error("The model returned implausible scores.");
}

/**
 * Run an expert with JSON requested in the prompt and validated server-side.
 * DeepSeek's current compatible endpoint does not accept OpenAI's JSON-schema
 * response_format, so the SDK's Output.object mode cannot be used here.
 */
async function streamExpert<S extends z.ZodType>(config: {
  model: Parameters<typeof generateText>[0]["model"];
  system: string;
  messages: NonNullable<Parameters<typeof generateText>[0]["messages"]>;
  maxOutputTokens: number;
  schema: S;
  eventName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  normalize: (raw: any, isFinal?: boolean) => any;
  sendEvent: (type: string, data: unknown) => void;
  validate?: (value: z.infer<S>) => boolean;
}) {
  const raw = await generateJsonObject({
    model: config.model,
    system: config.system,
    messages: config.messages,
    maxOutputTokens: config.maxOutputTokens,
    schema: config.schema,
    validate: config.validate,
  });

  const finalData = config.normalize(raw, true);
  config.sendEvent(config.eventName, finalData);
  return finalData;
}

export async function POST(req: Request) {
  const {
    taskNumber,
    question,
    essay,
    imageUrl,
    wordCount,
    questionSource,
    providerSettings,
    feedbackLanguage: requestedLanguage,
    sections: requestedSections,
  } = await req.json();
  const feedbackLanguage: FeedbackLanguage = requestedLanguage === "en" ? "en" : "zh";
  const parsedQuestionSource = parseCambridgeQuestionSource(questionSource);
  const parsedProviderSettings = parseProviderSettings(providerSettings);

  // Which sections to run — default to all four
  const sectionsToRun: Set<string> = requestedSections
    ? new Set(requestedSections as string[])
    : new Set(["overview", "scoring", "languageAnalysis", "improvement"]);

  let chartAnalysis = "";
  if (taskNumber === "1") {
    const cambridgeQuestion = await resolveCambridgeQuestion(
      question,
      taskNumber,
      parsedQuestionSource,
    );
    const localFacts = cambridgeQuestion
      ? await getCambridgeChartFacts(cambridgeQuestion.id)
      : null;

    if (localFacts) {
      // A manually verified fact set is more reliable than runtime OCR/vision,
      // so known Cambridge questions deliberately bypass Zhipu altogether.
      chartAnalysis = formatChartFactsForAssessment(localFacts);
    } else if (imageUrl) {
      try {
        chartAnalysis = await analyseTask1Chart(imageUrl, parsedProviderSettings);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown chart analysis error";
        return Response.json(
          {
            error: feedbackLanguage === "zh"
              ? `图表识别失败，请检查智谱 API 配置后重试：${message}`
              : `Chart analysis failed. Check the Zhipu API configuration and try again: ${message}`,
          },
          { status: 502 },
        );
      }
    }
  }

  const userMessage = [
    `Task ${taskNumber} Question:\n${question}`,
    `Student's Essay (${wordCount ?? 0} words):\n${essay}`,
    chartAnalysis ? `Chart analysis from the uploaded image:\n${chartAnalysis}` : "",
  ].filter(Boolean).join("\n\n");

  // DeepSeek grades every criterion. Zhipu is used only once above to read a Task 1 image.
  const model = chatModel(parsedProviderSettings);

  const improvementPrompt =
    taskNumber === "1"
      ? WRITING_EXPERT_4_TASK1_PROMPT
      : WRITING_EXPERT_4_TASK2_PROMPT;

  const improvementSchema =
    taskNumber === "1" ? improvementTask1Schema : improvementTask2Schema;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(type: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: Record<string, any> = {};
      const failedSections: Record<string, string> = {};
      const messages = [{ role: "user" as const, content: userMessage }];
      const promises: Promise<void>[] = [];

      if (sectionsToRun.has("overview")) {
        promises.push(
          withRetry(() =>
            streamExpert({
              model,
              system: localizePrompt(WRITING_EXPERT_1_PROMPT, feedbackLanguage),
              messages,
              maxOutputTokens: 2000,
              schema: overviewSchema,
              eventName: "overview",
              normalize: normalizeOverview,
              sendEvent,
            })
          ).then((data) => {
            results.overview = data;
          }).catch((err) => {
            failedSections.overview = err instanceof Error ? err.message : "Overview failed";
            sendEvent("section_error", { section: "overview", message: failedSections.overview });
          })
        );
      }

      if (sectionsToRun.has("scoring")) {
        promises.push(
          withRetry(() =>
            streamExpert({
              model,
              system: localizePrompt(WRITING_EXPERT_2_PROMPT, feedbackLanguage),
              messages,
              // Task Response + Coherence are graded in one call whose JSON holds
              // two summaries and four strength/weakness arrays. Longer Task 2
              // responses can overflow a tighter budget, truncating the JSON so
              // both scores drop out together. Give this section ample room.
              maxOutputTokens: 8192,
              schema: scoringSchema,
              eventName: "scoring",
              normalize: normalizeScoring,
              sendEvent,
              // A submitted, non-empty essay cannot be Band 0 (that band is for
              // a blank/absent answer). Reject all-zero glitches and regenerate.
              validate: (v) => v.taskResponseScore >= 1 && v.coherenceScore >= 1,
            })
          ).then((data) => {
            results.scoring = data;
          }).catch((err) => {
            failedSections.scoring = err instanceof Error ? err.message : "Scoring failed";
            sendEvent("section_error", { section: "scoring", message: failedSections.scoring });
          })
        );
      }

      if (sectionsToRun.has("languageAnalysis")) {
        promises.push(
          // Language analysis: Two-stage pipeline (correction → diff → feedback)
          withRetry(async () => {
            // Stage 1: Generate corrected essay
            const correction = await generateJsonObject({
              model,
              // The corrected essay is the whole essay rewritten. A reasoning
              // model (deepseek-v4-pro) spends most of the budget thinking, so a
              // tight limit is exhausted before it emits the essay JSON and the
              // field comes back empty — which then falls back to the original,
              // producing no diff and therefore no sentence corrections. Give it
              // ample room, and regenerate if it still returns nothing.
              system: localizePrompt(WRITING_EXPERT_3_CORRECTION_PROMPT, feedbackLanguage),
              messages,
              maxOutputTokens: 8192,
              schema: languageCorrectionSchema,
              validate: (v) => v.correctedEssay.trim().length > 0,
            });
            // If the correction still comes back empty, the original essay is the
            // only safe fallback because the report must always show a full text.
            const correctedEssay = correction.correctedEssay.trim() || essay;
            sendEvent("languageAnalysis", normalizeLanguageAnalysis({ correctedEssay }));

            // Stage 2: Compute diffs using code
            const diffs = computeSentenceDiffs(essay, correctedEssay);
            const diffsText = formatDiffsForPrompt(diffs);

            // Stage 3: Generate feedback with diffs provided
            const feedbackMessages = [
              {
                role: "user" as const,
                content: `Task ${taskNumber} Question:\n${question}\n\nStudent's Essay:\n${essay}\n\nCorrected Essay:\n${correctedEssay}\n\nExact changes made (computed by comparing original and corrected versions):\n${diffsText}`,
              },
            ];

            // Rubric scoring and inline annotations share the same input and
            // do not depend on each other, so run them concurrently to shorten
            // the time the client waits on the language section.
            const emptyAnnotations: z.infer<typeof languageAnnotationSchema> = {
              essayHighlights: [],
              synonymSuggestions: [],
            };
            const [languageAssessment, rawAnnotations] = await Promise.all([
              generateJsonObject({
                model,
                system: localizePrompt(WRITING_EXPERT_3_SCORE_PROMPT, feedbackLanguage),
                messages: feedbackMessages,
                maxOutputTokens: 2400,
                schema: languageAssessmentSchema,
                // Guard against the intermittent all-zero band glitch: a real
                // essay is never Band 0 for lexis/grammar, so regenerate instead.
                validate: (v) => v.lexicalResourceScore >= 1 && v.grammaticalRangeScore >= 1,
              }),
              generateJsonObject({
                model,
                system: localizePrompt(WRITING_EXPERT_3_ANNOTATION_PROMPT, feedbackLanguage),
                messages: feedbackMessages,
                maxOutputTokens: 1800,
                schema: languageAnnotationSchema,
              }).catch((error) => {
                // Inline annotations are optional. Keep reliable rubric scores
                // even if this cosmetic enrichment cannot be parsed.
                console.warn("Failed to generate language annotations:", error);
                return emptyAnnotations;
              }),
            ]);

            const annotations = mappableInlineAnnotations(
              rawAnnotations,
              essay,
              diffs,
              feedbackLanguage,
            );

            const finalData = normalizeLanguageAnalysis({
              correctedEssay,
              ...languageAssessment,
              ...annotations,
            });
            sendEvent("languageAnalysis", finalData);
            return finalData;
          }).then((data) => {
            results.languageAnalysis = data;
          }).catch((err) => {
            failedSections.languageAnalysis = err instanceof Error ? err.message : "Language analysis failed";
            // Server-side visibility for the section most prone to partial
            // failure. Log only the section label and error message — never the
            // student's essay or provider API keys.
            console.error("Language analysis section failed:", failedSections.languageAnalysis);
            sendEvent("section_error", { section: "languageAnalysis", message: failedSections.languageAnalysis });
          })
        );
      }

      if (sectionsToRun.has("improvement")) {
        promises.push(
          withRetry(() =>
            streamExpert({
              model,
              system: localizePrompt(improvementPrompt, feedbackLanguage),
              messages,
              maxOutputTokens: 4096,
              schema: improvementSchema,
              eventName: "improvement",
              normalize: (raw) => normalizeImprovement(raw, taskNumber, essay),
              sendEvent,
            })
          ).then((data) => {
            results.improvement = data;
          }).catch((err) => {
            failedSections.improvement = err instanceof Error ? err.message : "Improvement failed";
            sendEvent("section_error", { section: "improvement", message: failedSections.improvement });
          })
        );
      }

      await Promise.all(promises);

      // The four rubric responses are the source of truth for the final
      // summary. Rebuild it after all criteria arrive so that it cannot praise
      // an essay for a feature another rubric has identified as a weakness.
      if (results.scoring && results.languageAnalysis) {
        results.overview = buildScoreAlignedOverview(
          results.scoring,
          results.languageAnalysis,
        );
        delete failedSections.overview;
        sendEvent("overview", results.overview);
      }

      try {
        await saveAssessmentHistory({
          feedbackLanguage,
          submission: {
            taskNumber,
            question,
            essay,
          imageUrl,
          wordCount: wordCount ?? 0,
          questionSource: parsedQuestionSource,
          },
          feedback: results,
          failedSections,
        });
      } catch (error) {
        console.error("Failed to save local assessment history:", error);
      }

      sendEvent("done", {});

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
