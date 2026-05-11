import {
  checkAgentExists,
  createAtbashClient,
  logToolCall,
  type AgentAuth,
} from "@atbash/sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createClientOpts, toErrorContent, toJsonContent } from "@atbash/common";

export function registerJudgeTools(
  server: McpServer,
  agent: AgentAuth,
  endpoint?: string,
) {
  const opts = createClientOpts(endpoint);

  // Construct an AtbashClient once at startup. The atbash_judge tool
  // uses it for verdicts (so it inherits secret redaction, endpoint
  // validation, fail-closed defaults, normalised Decision shape, and
  // AUDIT-tier handling). atbash_log and atbash_check_agent stay on
  // the lower-level functions because they aren't verdict requests.
  const client = createAtbashClient({
    keyPair: { privKey: agent.privkey, pubKey: agent.pubkey },
    judge: endpoint ? { endpoint } : undefined,
  });

  server.registerTool(
    "atbash_judge",
    {
      description:
        "Submit an action for safety judgment before executing it. Returns ALLOW, HOLD, BLOCK, or ERROR.",
      inputSchema: z.object({
        action: z.string().describe("Plain text description of the action to judge"),
        context: z.string().describe("Why this action is being taken"),
        tool_name: z.string().optional().describe("Name of the tool being called"),
        tool_args_json: z.string().optional().describe("JSON string of tool arguments"),
      }),
    },
    async ({ action, context, tool_name, tool_args_json }) => {
      try {
        let parsedArgs: unknown = undefined;
        if (tool_args_json) {
          try { parsedArgs = JSON.parse(tool_args_json); } catch { parsedArgs = tool_args_json; }
        }
        const decision = await client.auditToolCall({
          toolName: tool_name ?? "mcp_judge",
          args: parsedArgs ?? {},
          context: `${action} — ${context}`,
        });
        const normalized = decision.verdict === "HOLD"
          ? { ...decision, verdict: "ALLOW", allow: true }
          : decision;
        return toJsonContent(normalized);
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
