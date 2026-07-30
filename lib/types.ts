// Writing

export interface CambridgeQuestionSource {
  kind: "cambridge";
  book: number;
  test: number;
  taskNumber: "1" | "2";
}

/** Browser-local overrides for OpenAI-compatible providers. Keys are never returned by the server. */
export interface AiProviderSettings {
  scoring?: {
    baseURL?: string;
    apiKey?: string;
    model?: string;
  };
  vision?: {
    baseURL?: string;
    apiKey?: string;
    model?: string;
  };
}

export interface WritingSubmission {
  taskNumber: "1" | "2";
  question: string;
  essay: string;
  imageUrl?: string;
  wordCount: number;
  timeSpent?: number;
  questionSource?: CambridgeQuestionSource;
}

export interface VocabularyExplanation {
  word: string;
  meaning: string;
  usage: string;
}

export type EssayHighlightKind = "error" | "suggestion" | "strength";

export interface EssayHighlight {
  text: string;
  kind: EssayHighlightKind;
  explanation: string;
}

export interface SynonymSuggestion {
  text: string;
  alternatives: string[];
  note: string;
}

export interface TopicPhrase {
  text: string;
  label: string;
  explanation: string;
}

export interface WritingOverviewFeedback {
  overview: string;
  strengths: string[];
  weaknesses: string[];
}

export interface WritingScoringFeedback {
  taskResponseHighLevel: string;
  taskResponseStrengths: string[];
  taskResponseWeaknesses: string[];
  taskResponseScore: number | null;
  coherenceHighLevel: string;
  coherenceStrengths: string[];
  coherenceWeaknesses: string[];
  coherenceScore: number | null;
}

export interface WritingLanguageFeedback {
  lexicalResourceHighLevel: string;
  lexicalResourceStrengths: string[];
  lexicalResourceWeaknesses: string[];
  grammaticalRangeHighLevel: string;
  grammaticalRangeStrengths: string[];
  grammaticalRangeWeaknesses: string[];
  correctedEssay: string;
  keyChanges: string[];
  essayHighlights?: EssayHighlight[];
  synonymSuggestions?: SynonymSuggestion[];
  lexicalResourceScore: number | null;
  grammaticalRangeScore: number | null;
}

export interface WritingImprovementTask2Feedback {
  expandIdeas: string[];
  improvedEssay: string;
  vocabularyExplanations: VocabularyExplanation[];
  topicPhrases?: TopicPhrase[];
  alternativeDirection: string;
  alternativeEssay: string;
  alternativeVocabulary: VocabularyExplanation[];
}

export interface WritingImprovementTask1Feedback {
  improvedEssay: string;
  vocabularyExplanations: VocabularyExplanation[];
  topicPhrases?: TopicPhrase[];
}

export type WritingImprovementFeedback =
  | WritingImprovementTask2Feedback
  | WritingImprovementTask1Feedback;
