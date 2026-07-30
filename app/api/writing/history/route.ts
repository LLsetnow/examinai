import {
  deleteAssessmentHistory,
  getAssessmentHistory,
  listAssessmentHistory,
} from "@/lib/storage/assessment-history";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");

  if (id) {
    const record = await getAssessmentHistory(id);
    if (!record) return Response.json({ error: "History record not found." }, { status: 404 });
    return Response.json(record);
  }

  return Response.json({ records: await listAssessmentHistory() });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !await deleteAssessmentHistory(id)) {
    return Response.json({ error: "History record not found." }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
