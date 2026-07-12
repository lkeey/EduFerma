export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "EduFerma API",
    version: "0.1.0",
    description:
      "Versioned read-only API for EduFerma dashboards and task-bank status. Student-facing responses do not expose answers, solutions or teacher notes."
  },
  servers: [{ url: "/" }],
  paths: {
    "/api/v1/student/dashboard": {
      get: {
        operationId: "getStudentDashboard",
        summary: "Student dashboard data",
        description: "Returns student assignments and mastery rows without answers or solutions.",
        tags: ["student"],
        security: [{ ClerkSession: [] }],
        responses: {
          "200": {
            description: "Student dashboard payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StudentDashboardResponse" }
              }
            }
          },
          "401": {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/v1/teacher/dashboard": {
      get: {
        operationId: "getTeacherDashboard",
        summary: "Teacher dashboard data",
        description: "Teacher-only dashboard summary for students, mastery and task-bank counts.",
        tags: ["teacher"],
        security: [{ ClerkSession: [] }],
        responses: {
          "200": {
            description: "Teacher dashboard payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TeacherDashboardResponse" }
              }
            }
          },
          "401": {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "403": {
            description: "Teacher role required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/v1/task-bank": {
      get: {
        operationId: "getTaskBank",
        summary: "Task-bank status",
        description: "Returns task-bank counts and public task summaries. Answers and solutions are never included.",
        tags: ["task-bank"],
        security: [{ ClerkSession: [] }],
        responses: {
          "200": {
            description: "Task-bank payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskBankResponse" }
              }
            }
          },
          "401": {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/v1/diagnostics": {
      get: {
        operationId: "getDiagnostics",
        summary: "Safe diagnostics snapshot",
        description:
          "Authenticated diagnostics endpoint. Owner and teacher roles receive extended safe route checks; other authenticated roles receive a limited snapshot. Secret values and raw env values are never returned.",
        tags: ["diagnostics"],
        security: [{ ClerkSession: [] }],
        responses: {
          "200": {
            description: "Safe diagnostics snapshot",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DiagnosticsSnapshot" }
              }
            }
          },
          "401": {
            description: "Authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DiagnosticsDeniedResponse" }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      ClerkSession: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Clerk session"
      }
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["error", "role"],
        properties: {
          error: { type: "string" },
          role: { type: "string", enum: ["owner", "tutor", "student", "guardian", "guest"] }
        }
      },
      DiagnosticsEnvironment: {
        type: "object",
        required: ["clerkConfigured", "databaseConfigured", "ownerEmailConfigured"],
        properties: {
          clerkConfigured: { type: "boolean" },
          databaseConfigured: { type: "boolean" },
          ownerEmailConfigured: { type: "boolean" }
        }
      },
      DiagnosticsAccess: {
        type: "object",
        required: ["role", "emailMasked", "authenticated", "canViewExtended"],
        properties: {
          role: { type: "string", enum: ["owner", "tutor", "student", "guardian", "guest"] },
          emailMasked: { type: ["string", "null"] },
          authenticated: { type: "boolean" },
          canViewExtended: { type: "boolean" }
        }
      },
      DiagnosticCheck: {
        type: "object",
        required: ["name", "route", "status", "message", "checkedAt"],
        properties: {
          name: { type: "string" },
          route: { type: "string" },
          status: { type: "string", enum: ["ok", "warning", "error", "skipped"] },
          message: { type: "string" },
          checkedAt: { type: "string", format: "date-time" }
        }
      },
      DiagnosticsSnapshot: {
        type: "object",
        required: ["timestamp", "status", "summary", "safeForSharing", "environment", "access", "likelyIssues", "checks"],
        properties: {
          timestamp: { type: "string", format: "date-time" },
          status: { type: "string", enum: ["ok", "warning", "error"] },
          summary: { type: "string" },
          safeForSharing: { type: "boolean", const: true },
          environment: { $ref: "#/components/schemas/DiagnosticsEnvironment" },
          access: { $ref: "#/components/schemas/DiagnosticsAccess" },
          likelyIssues: { type: "array", items: { type: "string" } },
          checks: { type: "array", items: { $ref: "#/components/schemas/DiagnosticCheck" } }
        }
      },
      DiagnosticsDeniedResponse: {
        type: "object",
        required: ["error", "role", "timestamp", "message"],
        properties: {
          error: { type: "string", enum: ["Unauthorized", "Forbidden"] },
          role: { type: "string", enum: ["owner", "tutor", "student", "guardian", "guest"] },
          timestamp: { type: "string", format: "date-time" },
          message: { type: "string" }
        }
      },
      ApiSource: {
        type: "object",
        required: ["kind"],
        properties: {
          kind: { type: "string", enum: ["database", "demo-fallback"] },
          reason: { type: "string" }
        }
      },
      MasteryRow: {
        type: "object",
        required: ["skill", "value"],
        properties: {
          skill: { type: "string" },
          value: { type: "integer", minimum: 0, maximum: 100 }
        }
      },
      StudentAssignment: {
        type: "object",
        required: ["title", "status", "due", "score"],
        properties: {
          title: { type: "string" },
          status: { type: "string" },
          due: { type: "string" },
          score: { type: "string" }
        }
      },
      TeacherStudentRow: {
        type: "object",
        required: ["student", "track", "next", "risk"],
        properties: {
          student: { type: "string" },
          track: { type: "string" },
          next: { type: "string" },
          risk: { type: "string" }
        }
      },
      TaskSummary: {
        type: "object",
        required: [
          "id",
          "taskId",
          "learningTrack",
          "exam",
          "taskNumber",
          "topic",
          "prototypeId",
          "difficultyLevel",
          "sourceName",
          "sourceUrl",
          "status",
          "updatedAt"
        ],
        properties: {
          id: { type: "string" },
          taskId: { type: "string" },
          learningTrack: { type: "string" },
          exam: { type: ["string", "null"] },
          taskNumber: { type: ["string", "null"] },
          topic: { type: ["string", "null"] },
          prototypeId: { type: ["string", "null"] },
          difficultyLevel: { type: "string" },
          sourceName: { type: "string" },
          sourceUrl: { type: ["string", "null"] },
          status: { type: "string" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      TaskBankResponse: {
        type: "object",
        required: ["source", "totalTasks", "activeTasks", "tasks"],
        properties: {
          source: { $ref: "#/components/schemas/ApiSource" },
          totalTasks: { type: "integer", minimum: 0 },
          activeTasks: { type: "integer", minimum: 0 },
          tasks: { type: "array", items: { $ref: "#/components/schemas/TaskSummary" } }
        }
      },
      StudentDashboardResponse: {
        type: "object",
        required: ["source", "metrics", "assignments", "mastery"],
        properties: {
          source: { $ref: "#/components/schemas/ApiSource" },
          metrics: {
            type: "object",
            required: ["nextLesson", "activeAssignments", "averageProgress", "answers"],
            properties: {
              nextLesson: { type: "string" },
              activeAssignments: { type: "string" },
              averageProgress: { type: "string" },
              answers: { type: "string" }
            }
          },
          assignments: { type: "array", items: { $ref: "#/components/schemas/StudentAssignment" } },
          mastery: { type: "array", items: { $ref: "#/components/schemas/MasteryRow" } }
        }
      },
      TeacherDashboardResponse: {
        type: "object",
        required: ["source", "metrics", "students", "mastery", "taskBank"],
        properties: {
          source: { $ref: "#/components/schemas/ApiSource" },
          metrics: {
            type: "object",
            required: ["students", "assignmentsToReview", "taskBank", "consent"],
            properties: {
              students: { type: "string" },
              assignmentsToReview: { type: "string" },
              taskBank: { type: "string" },
              consent: { type: "string" }
            }
          },
          students: { type: "array", items: { $ref: "#/components/schemas/TeacherStudentRow" } },
          mastery: { type: "array", items: { $ref: "#/components/schemas/MasteryRow" } },
          taskBank: { $ref: "#/components/schemas/TaskBankResponse" }
        }
      }
    }
  }
} as const;
