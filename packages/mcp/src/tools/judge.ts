import type { AgentAuth } from "@atbash/sdk";
import { checkAgentExists, judgeAction, logToolCall } from "@atbash/sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createClientOpts, toErrorContent, toJsonContent } from "@atbash/common";

export function registerJudgeTools(
  server: McpServer,
  agent: AgentAuth,
  endpoint?: string,
) {
  const opts = createClientOpts(endpoint);

  server.registerTool(
    "atbash_judge",
    {
      description:
        "Submit an action for safety judgment before executing it. Returns ALLOW, HOLD, BLOCK, or audit-mode No verdict.",
      inputSchema: z.object({
        action: z.string().describe("Plain text description of the action to judge"),
        context: z.string().describe("Why this action is being taken"),
        provider: z
          .enum(["atbash", "openai", "google", "microsoft", "custom"])
          .optional()
          .describe("Provider override"),
        model: z.string().optional().describe("Model override"),
        tool_name: z.string().optional().describe("Name of the tool being called"),
        tool_args_json: z.string().optional().describe("JSON string of tool arguments"),
      }),
    },
    async ({ action, context, provider, model, tool_name, tool_args_json }) => {
      try {
        const result = await judgeAction(action, context, agent, {
          ...opts,
          provider,
          model,
          toolName: tool_name,
          toolArgsJson: tool_args_json,
        });
        return toJsonContent(result);
      } catch (error) {
        return toErrorContent(error);
      }
    },
  );

  server.registerTool(
    "atbash_log",
    {
      description: "Log a tool call on-chain without requesting a verdict.",
      inputSchema: z.object({
        action: z.string().describe("Action description"),
        context: z.string().describe("Action context"),
        tool_name: z.string().optional().describe("Tool name"),
        tool_args_json: z.string().optional().describe("Tool arguments JSON"),
      }),
    },
    async ({ action, context, tool_name, tool_args_json }) => {
      try {
        const result = await logToolCall(
          action,
          context,
          agent,
          undefined,
          {
            toolName: tool_name,
            toolArgsJson: tool_args_json,
          },
          opts,
        );
        return toJsonContent(result);
      } catch (error) {
        return toErrorContent(error);
      }
    },
  );

  server.registerTool(
    "atbash_check_agent",
    {
      description: "Check whether an agent is registered on the Atbash platform.",
      inputSchema: z.object({
        pubkey: z.string().optional().describe("Agent public key, defaults to this server agent"),
      }),
    },
    async ({ pubkey }) => {
      try {
        const selectedPubkey = pubkey ?? agent.pubkey;
        const registered = await checkAgentExists(selectedPubkey, opts);
        return toJsonContent({ registered, pubkey: selectedPubkey });
      } catch (error) {
        return toErrorContent(error);
      }
    },
  );
}
