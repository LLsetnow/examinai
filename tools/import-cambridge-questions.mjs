import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_URL = "https://ieltswritingchecker.org/zh-CN/cambridge-ielts-academic-writing";
const DATA_DIRECTORY = path.join(process.cwd(), "data", "cambridge-questions");
const IMAGE_DIRECTORY = path.join(DATA_DIRECTORY, "images");

function decodeHtml(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseQuestions(html) {
  const questions = [];
  const testPattern = /<article class="cambridge-test-card" id="cambridge-(\d+)-test-(\d+)">([\s\S]*?)<\/article>/g;

  for (const testMatch of html.matchAll(testPattern)) {
    const book = Number(testMatch[1]);
    const test = Number(testMatch[2]);
    if (book < 10 || book > 21 || test < 1 || test > 4) continue;

    const taskPattern = /<section class="cambridge-task-block writing-question-card-content" id="cambridge-(\d+)-test-(\d+)-task-([12])"[^>]*>([\s\S]*?)<\/section>/g;
    for (const taskMatch of testMatch[3].matchAll(taskPattern)) {
      const taskNumber = taskMatch[3];
      const taskHtml = taskMatch[4];
      const promptMatch = taskHtml.match(/<div class="cambridge-prompt-copy">([\s\S]*?)<\/div>/);
      const topicsMatch = taskHtml.match(/<nav class="writing-question-topics[^"]*"[^>]*>([\s\S]*?)<\/nav>/);
      const imageMatch = taskHtml.match(/<img src="([^"]+)"[^>]*>/);
      const prompt = promptMatch ? decodeHtml(promptMatch[1]) : "";
      if (!prompt) continue;

      const topics = topicsMatch
        ? decodeHtml(topicsMatch[1]).split("·").map((topic) => topic.trim()).filter(Boolean)
        : [];
      const imageSource = imageMatch ? new URL(imageMatch[1], SOURCE_URL).href : undefined;
      const extension = imageSource ? path.extname(new URL(imageSource).pathname).toLowerCase() || ".png" : "";
      const imageFile = imageSource
        ? `images/cambridge-${book}-test-${test}-task-${taskNumber}${extension}`
        : undefined;

      questions.push({
        id: `cambridge-${book}-test-${test}-task-${taskNumber}`,
        book,
        test,
        taskNumber,
        prompt,
        topics,
        imageSource,
        imageFile,
      });
    }
  }

  return questions.sort((a, b) => a.book - b.book || a.test - b.test || a.taskNumber.localeCompare(b.taskNumber));
}

async function downloadImage(question) {
  if (!question.imageSource || !question.imageFile) return;
  const response = await fetch(question.imageSource);
  if (!response.ok) throw new Error(`Unable to download ${question.imageSource}: ${response.status}`);
  await writeFile(path.join(DATA_DIRECTORY, question.imageFile), Buffer.from(await response.arrayBuffer()));
}

const sourceResponse = await fetch(SOURCE_URL);
if (!sourceResponse.ok) throw new Error(`Unable to load source page: ${sourceResponse.status}`);

const questions = parseQuestions(await sourceResponse.text());
if (questions.length !== 96 || questions.filter((question) => question.taskNumber === "1" && question.imageSource).length !== 48) {
  throw new Error(`Unexpected source structure: parsed ${questions.length} questions.`);
}

await mkdir(IMAGE_DIRECTORY, { recursive: true });
for (let index = 0; index < questions.length; index += 4) {
  await Promise.all(questions.slice(index, index + 4).map(downloadImage));
}

const questionIndex = {
  source: {
    name: "IELTS Writing Checker",
    url: SOURCE_URL,
    importedAt: new Date().toISOString(),
  },
  questions: questions.map(({ imageSource: _imageSource, ...question }) => question),
};
await writeFile(
  path.join(DATA_DIRECTORY, "index.json"),
  `${JSON.stringify(questionIndex, null, 2)}\n`,
  "utf8",
);

console.log(`Imported ${questions.length} Cambridge Academic Writing tasks and ${questions.filter((question) => question.imageFile).length} Task 1 images.`);
