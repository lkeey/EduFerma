export type JsonSchema = Record<string, unknown>;

export function ref(name: string) {
  return { $ref: `#/components/schemas/${name}` };
}

export function arrayOf(schema: JsonSchema) {
  return { type: "array", items: schema };
}

export function objectSchema(
  properties: Record<string, JsonSchema>,
  required: string[] = Object.keys(properties),
  additionalProperties = false
) {
  return {
    type: "object",
    required,
    properties,
    additionalProperties
  };
}
