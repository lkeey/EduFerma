import { requireStudentAccess } from "@/lib/platform/auth";
import { submitTaskAttempt } from "@/lib/platform/data";

export async function POST(request: Request) {
  await requireStudentAccess("demo_student_oge");
  const body = await request.json();
  const result = await submitTaskAttempt({
    studentId: "demo_student_oge",
    assignmentId: String(body.assignmentId ?? "assignment_demo_1"),
    taskId: String(body.taskId ?? ""),
    answer: String(body.answer ?? "")
  });

  return Response.json(result);
}
