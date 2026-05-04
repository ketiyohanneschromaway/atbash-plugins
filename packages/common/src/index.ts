export type JsonContent = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export function createClientOpts(endpoint?: string) {
  return endpoint ? { endpoint } : undefined;
}

export function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function toJsonContent(value: unknown): JsonContent {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

export function toErrorContent(error: unknown): JsonContent {
  return {
    content: [{ type: "text", text: `Error: ${safeErrorMessage(error)}` }],
    isError: true,
  };
}

export function truncateText(value: string, max = 500) {
  return value.length <= max ? value : `${value.slice(0, max - 3)}...`;
}
