import type {
  WritingImprovementFeedback,
  WritingLanguageFeedback,
  WritingOverviewFeedback,
  WritingScoringFeedback,
  WritingSubmission,
} from "@/lib/types";
import { WRITING_REPORT_FORMAT } from "@/lib/writing-report";

export type LocalHistoryDirectoryStatus =
  | "saved"
  | "unavailable"
  | "unsupported"
  | "permission-denied";

interface LocalFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<{ text(): Promise<string> }>;
  createWritable(): Promise<{
    write(contents: string): Promise<void>;
    close(): Promise<void>;
  }>;
}

interface LocalDirectoryHandle {
  kind: "directory";
  name: string;
  getFileHandle(name: string, options: { create: boolean }): Promise<LocalFileHandle>;
  values?: () => AsyncIterable<LocalFileHandle | LocalDirectoryHandle>;
  removeEntry?: (name: string) => Promise<void>;
  queryPermission?: (options: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (options: { mode: "readwrite" }) => Promise<PermissionState>;
}

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: (options: { id: string; mode: "readwrite" }) => Promise<LocalDirectoryHandle>;
}

export interface BrowserHistoryRecord {
  id: string;
  fileName: string;
  createdAt: string;
  feedbackLanguage: "zh" | "en";
  submission: WritingSubmission;
  scores: {
    taskResponse: number | null;
    coherence: number | null;
    lexicalResource: number | null;
    grammaticalRange: number | null;
    overall: number | null;
  };
  feedback: {
    overview: WritingOverviewFeedback | null;
    scoring: WritingScoringFeedback | null;
    languageAnalysis: WritingLanguageFeedback | null;
    improvement: WritingImprovementFeedback | null;
  };
  failedSections: Record<string, string>;
}

interface BrowserHistoryReadResult {
  status: LocalHistoryDirectoryStatus;
  records: BrowserHistoryRecord[];
}

const DATABASE_NAME = "examinai-browser-settings";
const STORE_NAME = "handles";
const DIRECTORY_KEY = "local-history-directory";
const DIRECTORY_NAME_KEY = "examinai-local-history-directory-name-v1";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readDirectoryHandle(): Promise<LocalDirectoryHandle | null> {
  try {
    const database = await openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(DIRECTORY_KEY);
      request.onsuccess = () => resolve((request.result as LocalDirectoryHandle | undefined) ?? null);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
    });
  } catch {
    return null;
  }
}

async function writeDirectoryHandle(handle: LocalDirectoryHandle | null) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = handle ? store.put(handle, DIRECTORY_KEY) : store.delete(DIRECTORY_KEY);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
  });
}

async function requestDirectoryPermission(directory: LocalDirectoryHandle): Promise<LocalHistoryDirectoryStatus> {
  const options = { mode: "readwrite" as const };
  let permission = await directory.queryPermission?.(options);
  if (permission !== "granted" && directory.requestPermission) {
    permission = await directory.requestPermission(options);
  }
  return permission && permission !== "granted" ? "permission-denied" : "saved";
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function recordOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isWritingSubmission(value: unknown): value is WritingSubmission {
  const submission = recordOrEmpty(value);
  return (submission.taskNumber === "1" || submission.taskNumber === "2")
    && typeof submission.question === "string"
    && typeof submission.essay === "string"
    && typeof submission.wordCount === "number";
}

function feedbackLanguage(value: unknown): "zh" | "en" {
  return value === "en" ? "en" : "zh";
}

function failedSections(value: unknown): Record<string, string> {
  const sections: Record<string, string> = {};
  for (const [name, message] of Object.entries(recordOrEmpty(value))) {
    if (typeof message === "string") sections[name] = message;
  }
  return sections;
}

function parseBrowserHistoryRecord(fileName: string, content: string): BrowserHistoryRecord | null {
  try {
    const raw = JSON.parse(content) as unknown;
    const source = recordOrEmpty(raw);
    if (!isWritingSubmission(source.submission)) return null;

    const feedback = recordOrEmpty(source.feedback);
    const scoring = recordOrEmpty(feedback.scoring);
    const languageAnalysis = recordOrEmpty(feedback.languageAnalysis);
    const reportScores = source.format === WRITING_REPORT_FORMAT ? recordOrEmpty(source.scores) : {};
    const taskResponse = numberOrNull(reportScores.taskResponse ?? scoring.taskResponseScore);
    const coherence = numberOrNull(reportScores.coherence ?? scoring.coherenceScore);
    const lexicalResource = numberOrNull(reportScores.lexicalResource ?? languageAnalysis.lexicalResourceScore);
    const grammaticalRange = numberOrNull(reportScores.grammaticalRange ?? languageAnalysis.grammaticalRangeScore);
    const calculatedOverall = [taskResponse, coherence, lexicalResource, grammaticalRange].every((score) => score !== null)
      ? Math.round(([taskResponse, coherence, lexicalResource, grammaticalRange] as number[]).reduce((sum, score) => sum + score, 0) / 4 * 2) / 2
      : null;
    const createdAt = typeof source.exportedAt === "string"
      ? source.exportedAt
      : typeof source.createdAt === "string" ? source.createdAt : "";

    if (!createdAt || Number.isNaN(Date.parse(createdAt))) return null;

    return {
      id: fileName,
      fileName,
      createdAt,
      feedbackLanguage: feedbackLanguage(source.feedbackLanguage),
      submission: source.submission,
      scores: {
        taskResponse,
        coherence,
        lexicalResource,
        grammaticalRange,
        overall: numberOrNull(reportScores.overall) ?? calculatedOverall,
      },
      feedback: {
        overview: (feedback.overview ?? null) as unknown as WritingOverviewFeedback | null,
        scoring: (feedback.scoring ?? null) as unknown as WritingScoringFeedback | null,
        languageAnalysis: (feedback.languageAnalysis ?? null) as unknown as WritingLanguageFeedback | null,
        improvement: (feedback.improvement ?? null) as unknown as WritingImprovementFeedback | null,
      },
      failedSections: failedSections(source.failedSections),
    };
  } catch {
    return null;
  }
}

export function isLocalHistoryDirectorySupported() {
  return typeof window !== "undefined" && typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function";
}

export function getLocalHistoryDirectoryName() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(DIRECTORY_NAME_KEY) ?? "";
}

export async function selectLocalHistoryDirectory(): Promise<LocalHistoryDirectoryStatus> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) return "unsupported";

  try {
    const handle = await picker({ id: "examinai-history", mode: "readwrite" });
    await writeDirectoryHandle(handle);
    window.localStorage.setItem(DIRECTORY_NAME_KEY, handle.name);
    return "saved";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "unavailable";
    return "permission-denied";
  }
}

export async function clearLocalHistoryDirectory() {
  window.localStorage.removeItem(DIRECTORY_NAME_KEY);
  try {
    await writeDirectoryHandle(null);
  } catch {
    // The visible browser-local setting has still been cleared.
  }
}

export async function readLocalHistoryDirectory(): Promise<BrowserHistoryReadResult> {
  const directory = await readDirectoryHandle();
  if (!directory) return { status: "unavailable", records: [] };
  if (!directory.values) return { status: "unsupported", records: [] };

  const permission = await requestDirectoryPermission(directory);
  if (permission !== "saved") return { status: permission, records: [] };

  const records: BrowserHistoryRecord[] = [];
  try {
    for await (const entry of directory.values()) {
      if (entry.kind !== "file" || !entry.name.endsWith(".json")) continue;
      const record = parseBrowserHistoryRecord(entry.name, await entry.getFile().then((file) => file.text()));
      if (record) records.push(record);
    }
  } catch {
    return { status: "permission-denied", records: [] };
  }

  return {
    status: "saved",
    records: records.sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
  };
}

export async function saveJsonToLocalHistoryDirectory(
  fileName: string,
  content: string,
): Promise<LocalHistoryDirectoryStatus> {
  const directory = await readDirectoryHandle();
  if (!directory) return "unavailable";

  const permission = await requestDirectoryPermission(directory);
  if (permission !== "saved") return permission;

  try {
    const file = await directory.getFileHandle(fileName, { create: true });
    const writable = await file.createWritable();
    await writable.write(content);
    await writable.close();
    return "saved";
  } catch {
    return "permission-denied";
  }
}

export async function deleteJsonFromLocalHistoryDirectory(fileName: string): Promise<LocalHistoryDirectoryStatus> {
  if (!/^[^/\\]+\.json$/.test(fileName)) return "unavailable";

  const directory = await readDirectoryHandle();
  if (!directory) return "unavailable";
  if (!directory.removeEntry) return "unsupported";

  const permission = await requestDirectoryPermission(directory);
  if (permission !== "saved") return permission;

  try {
    await directory.removeEntry(fileName);
    return "saved";
  } catch {
    return "permission-denied";
  }
}
