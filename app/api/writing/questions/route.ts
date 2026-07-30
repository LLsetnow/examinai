import { NextResponse } from "next/server";
import {
  getCambridgeQuestion,
  getCambridgeQuestionBank,
} from "@/lib/question-bank/cambridge";
import { getCambridgeChartFacts } from "@/lib/question-bank/chart-facts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const book = Number(searchParams.get("book"));
  const test = Number(searchParams.get("test"));
  const task = searchParams.get("task");

  if (Number.isFinite(book) && Number.isFinite(test) && (task === "1" || task === "2")) {
    const question = await getCambridgeQuestion(book, test, task);
    if (!question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }
    const chartFactsAvailable = question.taskNumber === "1"
      && Boolean(await getCambridgeChartFacts(question.id));
    return NextResponse.json({ ...question, chartFactsAvailable });
  }

  const bank = await getCambridgeQuestionBank();
  if (!bank) {
    return NextResponse.json({ error: "Question bank is not installed." }, { status: 404 });
  }

  return NextResponse.json({
    source: bank.source,
    questions: bank.questions.map((question) => ({
      id: question.id,
      book: question.book,
      test: question.test,
      taskNumber: question.taskNumber,
      prompt: question.prompt,
      topics: question.topics,
    })),
  });
}
