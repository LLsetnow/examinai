import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CambridgeQuestionSource } from "@/lib/types";

export interface CambridgeQuestion {
  id: string;
  book: number;
  test: number;
  taskNumber: "1" | "2";
  prompt: string;
  topics: string[];
  imageFile?: string;
}

interface CambridgeQuestionBank {
  source: {
    name: string;
    url: string;
    importedAt: string;
  };
  questions: CambridgeQuestion[];
}

const QUESTION_BANK_DIRECTORY = path.join(process.cwd(), "data", "cambridge-questions");
const QUESTION_BANK_FILE = path.join(QUESTION_BANK_DIRECTORY, "index.json");

function normalizePrompt(prompt: string) {
  return prompt.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export async function getCambridgeQuestionBank(): Promise<CambridgeQuestionBank | null> {
  try {
    const content = await readFile(QUESTION_BANK_FILE, "utf8");
    const bank = JSON.parse(content) as CambridgeQuestionBank;
    return Array.isArray(bank.questions) ? bank : null;
  } catch {
    return null;
  }
}

export async function getCambridgeQuestion(
  book: number,
  test: number,
  taskNumber: "1" | "2",
) {
  const bank = await getCambridgeQuestionBank();
  const question = bank?.questions.find(
    (entry) => entry.book === book && entry.test === test && entry.taskNumber === taskNumber,
  );

  if (!question) return null;

  let imageUrl: string | undefined;
  const imageName = question.imageFile ? path.basename(question.imageFile) : "";
  if (question.imageFile === `images/${imageName}` && /^[a-z0-9._-]+$/i.test(imageName)) {
    const imagePath = path.join(QUESTION_BANK_DIRECTORY, "images", imageName);
    const imageBuffer = await readFile(imagePath);
    const extension = path.extname(imageName).toLowerCase();
    const mediaType = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png";
    imageUrl = `data:${mediaType};base64,${imageBuffer.toString("base64")}`;
  }

  return { ...question, imageUrl };
}

/** Matches a submitted prompt to a local Cambridge question without trusting client metadata alone. */
export async function resolveCambridgeQuestion(
  prompt: string,
  taskNumber: "1" | "2",
  source?: CambridgeQuestionSource,
) {
  const bank = await getCambridgeQuestionBank();
  if (!bank) return null;

  const normalizedPrompt = normalizePrompt(prompt);
  const sourcedQuestion = source?.kind === "cambridge"
    ? bank.questions.find((entry) => (
        entry.book === source.book
        && entry.test === source.test
        && entry.taskNumber === source.taskNumber
      ))
    : undefined;

  if (sourcedQuestion?.taskNumber === taskNumber && normalizePrompt(sourcedQuestion.prompt) === normalizedPrompt) {
    return sourcedQuestion;
  }

  return bank.questions.find((entry) => (
    entry.taskNumber === taskNumber && normalizePrompt(entry.prompt) === normalizedPrompt
  )) ?? null;
}
