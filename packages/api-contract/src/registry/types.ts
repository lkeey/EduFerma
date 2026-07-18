export type HttpMethod = "get" | "post" | "patch" | "put" | "delete";

export type QueryParameterDefinition = {
  name: string;
  description?: string;
  required?: boolean;
  schema: Record<string, unknown>;
};

export type RouteDefinition = {
  path: string;
  method: HttpMethod;
  operationId: string;
  tags: string[];
  summary: string;
  public?: boolean;
  securityScheme?: "clerkAuth" | "cronSecret";
  responseContentType?: "application/json" | "text/html";
  queryParameters?: QueryParameterDefinition[];
  requestBody?: boolean;
  requestContentType?: "application/json" | "multipart/form-data" | "application/octet-stream";
  requestSchema?: string;
  responseSchema?: string;
};
