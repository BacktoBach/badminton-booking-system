export const jsonBody = (schema: object, required = true) => ({
  required,
  content: { "application/json": { schema } },
});

export const jsonResponse = (description: string, schema: object, example?: object) => ({
  description,
  content: {
    "application/json": {
      schema,
      ...(example ? { example } : {}),
    },
  },
});

export const messageResponse = (description: string, message: string) =>
  jsonResponse(description, {
    type: "object",
    required: ["message"],
    properties: { message: { type: "string" } },
  }, { message });

export const paginatedResponse = (description: string, itemSchema: object) =>
  jsonResponse(description, {
    type: "object",
    required: ["data", "meta"],
    properties: {
      data: { type: "array", items: itemSchema },
      meta: { $ref: "#/components/schemas/PaginationMeta" },
    },
  });

export const dataResponse = (description: string, dataSchema: object) =>
  jsonResponse(description, {
    type: "object",
    required: ["data"],
    properties: { data: dataSchema },
  });
