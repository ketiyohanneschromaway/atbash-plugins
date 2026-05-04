import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

type PromptCapableServer = McpServer & {
  registerPrompt?: (
    name: string,
    config: {
      description?: string;
      inputSchema?: unknown;
    },
    handler: (input: { action: string; context: string }) => Promise<{
      messages: Array<{
        role: "user";
        content: { type: "text"; text: string };
      }>;
    }>,
  ) => void;
};

export function registerSafetyPrompt(server: McpServer) {
  const promptServer = server as PromptCapableServer;

  if (!promptServer.registerPrompt) {
    return;
  }

  promptServer.registerPrompt(
    "atbash_safety_check",
    {
      description: "Prepare a consistent pre-execution Atbash safety review request.",
      inputSchema: z.object({
        action: z.string().describe("Action to evaluate"),
        context: z.string().describe("Why the action is being taken"),
      }),
    },
    async ({ action, context }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Use the Atbash tools to evaluate the following action before execution.",
              `Action: ${action}`,
              `Context: ${context}`,
              "If the result is HOLD, explain that operator review is required before proceeding.",
            ].join("\n"),
          },
        },
      ],
    }),
  );
}
