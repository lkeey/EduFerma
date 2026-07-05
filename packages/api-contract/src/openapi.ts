import { routeDefinitions, type RouteDefinition } from "./registry";

type OpenApiOperation = {
  operationId: string;
  tags: string[];
  summary: string;
  security?: Array<Record<string, string[]>>;
  parameters?: unknown[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
};

function pathParams(path: string) {
  return Array.from(path.matchAll(/\{([^}]+)\}/g)).map((match) => ({
    name: match[1],
    in: "path",
    required: true,
    schema: { type: "string" }
  }));
}

function operation(route: RouteDefinition): OpenApiOperation {
  const op: OpenApiOperation = {
    operationId: route.operationId,
    tags: route.tags,
    summary: route.summary,
    responses: {
      "200": {
        description: "OK",
        content: {
          "application/json": {
            schema: { type: "object" }
          }
        }
      },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "500": { description: "Internal error" }
    }
  };

  if (!route.public) {
    op.security = [{ clerkAuth: [] }];
  }

  const params = pathParams(route.path);
  if (params.length > 0) {
    op.parameters = params;
  }

  if (route.requestBody) {
    op.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: { type: "object" }
        }
      }
    };
  }

  return op;
}

export function buildOpenApiDocument() {
  const paths: Record<string, Record<string, OpenApiOperation>> = {};

  for (const route of routeDefinitions) {
    paths[route.path] ||= {};
    paths[route.path][route.method] = operation(route);
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "EduFerma API",
      version: "1.0.0",
      description: "API-first contract for EduFerma web platform data access."
    },
    servers: [{ url: "/" }],
    tags: [
      { name: "Health" },
      { name: "Auth" },
      { name: "Student" },
      { name: "Teacher" },
      { name: "Tasks" },
      { name: "Assignments" },
      { name: "Attempts" },
      { name: "Plans" },
      { name: "Schedule" },
      { name: "Analytics" }
    ],
    components: {
      securitySchemes: {
        clerkAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "Clerk session"
        }
      },
      schemas: {
        ApiError: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                details: {}
              }
            }
          }
        }
      }
    },
    paths
  };
}

export const openApiDocument = buildOpenApiDocument();
