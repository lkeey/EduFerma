import { routeDefinitions, type RouteDefinition } from "./registry";
import { ref } from "./openapi/helpers";
import { schemas } from "./openapi/schemas";

type OpenApiOperation = {
  operationId: string;
  tags: string[];
  summary: string;
  security?: Array<Record<string, string[]>>;
  parameters?: unknown[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
};

function apiErrorResponse(description: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: ref("ApiError")
      }
    }
  };
}

function jsonResponse(schemaName: string | undefined, contentType = "application/json") {
  return {
    description: "OK",
    content: {
      [contentType]: {
        schema: ref(schemaName ?? "GenericObject")
      }
    }
  };
}

function jsonRequestBody(schemaName: string | undefined) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: ref(schemaName ?? "GenericObject")
      }
    }
  };
}

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
      "200": jsonResponse(route.responseSchema, route.responseContentType),
      "401": apiErrorResponse("Unauthorized"),
      "403": apiErrorResponse("Forbidden"),
      "500": apiErrorResponse("Internal error")
    }
  };

  if (!route.public) {
    op.security = [{ clerkAuth: [] }];
    op.responses["503"] = apiErrorResponse("Remote database setup is required or temporarily unavailable");
  }

  const params = pathParams(route.path);
  if (params.length > 0) {
    op.parameters = params;
  }

  if (route.requestBody) {
    op.requestBody = jsonRequestBody(route.requestSchema);
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
      { name: "Docs" },
      { name: "Diagnostics" },
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
      schemas
    },
    paths
  };
}

export const openApiDocument = buildOpenApiDocument();
