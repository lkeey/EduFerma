import {
  assignmentTasks,
  assignments,
  attempts,
  lessons,
  skillMastery,
  students,
  tasks,
  users
} from "./schema";
import { getDb } from "./client";
import { pathToFileURL } from "node:url";

const ids = {
  owner: "00000000-0000-4000-8000-000000000001",
  tutor: "00000000-0000-4000-8000-000000000002",
  studentUser: "00000000-0000-4000-8000-000000000003",
  student: "00000000-0000-4000-8000-000000000101",
  task: "00000000-0000-4000-8000-000000000201",
  assignment: "00000000-0000-4000-8000-000000000301",
  assignmentTask: "00000000-0000-4000-8000-000000000401",
  attempt: "00000000-0000-4000-8000-000000000501",
  lesson: "00000000-0000-4000-8000-000000000601",
  mastery: "00000000-0000-4000-8000-000000000701"
};

export function buildDemoSeed(ownerEmail = process.env.OWNER_EMAIL || "owner@example.com") {
  return {
    users: [
      {
        id: ids.owner,
        clerkUserId: "demo-owner",
        email: ownerEmail,
        displayName: "EduFerma Owner",
        role: "owner" as const
      },
      {
        id: ids.tutor,
        clerkUserId: "demo-tutor",
        email: "tutor@example.com",
        displayName: "Demo Tutor",
        role: "tutor" as const
      },
      {
        id: ids.studentUser,
        clerkUserId: "demo-student",
        email: "student@example.com",
        displayName: "Demo Student",
        role: "student" as const
      }
    ],
    students: [
      {
        id: ids.student,
        userId: ids.studentUser,
        tutorUserId: ids.tutor,
        publicCode: "demo-student",
        displayName: "Демо-ученик",
        learningTrack: "ege_informatics",
        goalSummary: "ЕГЭ информатика: стабильная домашняя работа"
      }
    ],
    tasks: [
      {
        id: ids.task,
        taskId: "demo-ege-7-graph",
        learningTrack: "ege_informatics",
        exam: "ЕГЭ",
        taskNumber: "7",
        topic: "Графики и таблицы",
        prototypeId: "ege_7_graph_reading",
        skillAtoms: ["graph_reading"],
        difficultyLevel: "basic",
        sourceName: "original",
        statementMd: "Демо-задача: определите значение по графику.",
        answerJson: { answers: ["42"] },
        solutionMd: "Учительское решение: прочитать значение по оси Y.",
        verificationStatus: "verified",
        licenseStatus: "original",
        status: "active" as const
      }
    ],
    lessons: [
      {
        id: ids.lesson,
        studentId: ids.student,
        tutorUserId: ids.tutor,
        title: "ЕГЭ 7: графики",
        status: "planned"
      }
    ],
    mastery: [
      {
        id: ids.mastery,
        studentId: ids.student,
        skillAtom: "graph_reading",
        prototypeId: "ege_7_graph_reading",
        attempts: 3,
        correct: 2,
        level: "practicing"
      }
    ],
    assignments: [
      {
        id: ids.assignment,
        studentId: ids.student,
        tutorUserId: ids.tutor,
        title: "ЕГЭ 7: прототипы",
        status: "assigned" as const
      }
    ],
    assignmentTasks: [
      {
        id: ids.assignmentTask,
        assignmentId: ids.assignment,
        taskId: ids.task,
        position: 1,
        points: 1,
        revealAnswerAfterSubmit: false
      }
    ],
    attempts: [
      {
        id: ids.attempt,
        assignmentTaskId: ids.assignmentTask,
        studentId: ids.student,
        submittedAnswer: "41",
        isCorrect: false,
        status: "needs_review" as const,
        feedback: "Проверь чтение оси Y."
      }
    ]
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const seed = buildDemoSeed();

  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", ...seed }, null, 2));
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("--apply requires DATABASE_URL");
  }

  const db = getDb();
  await db.insert(users).values(seed.users).onConflictDoNothing();
  await db.insert(students).values(seed.students).onConflictDoNothing();
  await db.insert(tasks).values(seed.tasks).onConflictDoNothing();
  await db.insert(lessons).values(seed.lessons).onConflictDoNothing();
  await db.insert(skillMastery).values(seed.mastery).onConflictDoNothing();
  await db.insert(assignments).values(seed.assignments).onConflictDoNothing();
  await db.insert(assignmentTasks).values(seed.assignmentTasks).onConflictDoNothing();
  await db.insert(attempts).values(seed.attempts).onConflictDoNothing();

  console.log(JSON.stringify({ ok: true, mode: "apply", seeded: true }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
