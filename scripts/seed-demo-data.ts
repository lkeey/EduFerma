import { assignmentRows, masteryRows, teacherRows } from "../apps/web/src/lib/demo-data";

const demoSeed = {
  users: [{ email: process.env.OWNER_EMAIL || "owner@example.com", role: "owner" }],
  students: teacherRows.map((row, index) => ({
    publicCode: `demo-${index + 1}`,
    displayName: row.student,
    learningTrack: row.track,
    nextTopic: row.next
  })),
  assignments: assignmentRows,
  mastery: masteryRows
};

console.log(JSON.stringify(demoSeed, null, 2));
