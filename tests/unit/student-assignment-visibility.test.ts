import { describe, expect, it } from "vitest";
import {
  isStudentVisibleAssignmentStatus,
  studentVisibleAssignmentStatuses
} from "../../apps/web/src/server/services/db-services";

describe("student assignment visibility", () => {
  it("shows only published workflow states to students", () => {
    expect(studentVisibleAssignmentStatuses).toEqual([
      "assigned",
      "submitted",
      "reviewed"
    ]);
    expect(isStudentVisibleAssignmentStatus("assigned")).toBe(true);
    expect(isStudentVisibleAssignmentStatus("submitted")).toBe(true);
    expect(isStudentVisibleAssignmentStatus("reviewed")).toBe(true);
    expect(isStudentVisibleAssignmentStatus("draft")).toBe(false);
    expect(isStudentVisibleAssignmentStatus("archived")).toBe(false);
  });
});
