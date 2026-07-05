import { requireTeacherAccess } from "@/lib/platform/auth";
import { reviewAttempt } from "@/lib/platform/data";

export async function POST(request: Request) {
  await requireTeacherAccess();
  const body = await request.json();
  const result = await reviewAttempt({
    attemptId: String(body.attemptId ?? ""),
    scoreAwarded: Number(body.scoreAwarded ?? 0),
    feedbackMd: String(body.feedbackMd ?? ""),
    mistakeTags: Array.isArray(body.mistakeTags) ? body.mistakeTags : [],
    isCorrect: Boolean(body.isCorrect)
  });

  return Response.json(result);
}
