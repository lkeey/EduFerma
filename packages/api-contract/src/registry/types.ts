export type HttpMethod = "get" | "post" | "patch" | "put" | "delete";

export type RouteDefinition = {
  path: string;
  method: HttpMethod;
  operationId: string;
  tags: string[];
  summary: string;
  public?: boolean;
  responseContentType?: "application/json" | "text/html";
  requestBody?: boolean;
  requestSchema?: string;
  responseSchema?: string;
};
