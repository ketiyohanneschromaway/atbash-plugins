import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toErrorContent, toJsonContent } from "@atbash/common";

function normalizeVerdict(raw: unknown) {
  if (raw == null) return "No verdict";
  const value = String(raw).toUpperCase();
  if (value === "ALLOW" || value === "GREEN") return "ALLOW";
  if (value === "HOLD" || value === "YELLOW") return "HOLD";
  if (value === "BLOCK" || value === "RED") return "BLOCK";
  return value;
}

function normalizeStatus(raw: unknown) {
  const value = String(raw ?? "").toLowerCase();
  if (value === "pending" || value === "answered" || value === "error") {
    return value;
  }
  return "error";
}

export function registerStatusTools(server: McpServer, defaultPubkey: string, endpoint?: string) {
  const baseUrl = (endpoint ?? "https://atbash.ai").replace(/\/$/, "");

  server.registerTool(
    "atbash_judgment_status",
    {
      description: "Poll the status of a previously submitted judgment.",
      inputSchema: z.object({
        tool_call_id: z.string().describe("The tool_call_id returned from atbash_judge"),
        agent_pubkey: z
          .string()
          .optional()
          .describe("Agent public key, defaults to the server agent"),
      }),
    },
    async ({ tool_call_id, agent_pubkey }) => {
      try {
        const pubkey = agent_pubkey ?? defaultPubkey;
        const url = new URL(`${baseUrl}/api/v1/judge`);
        url.searchParams.set("tool_call_id", tool_call_id);
        url.searchParams.set("agent_pubkey", pubkey);

        const response = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new Error(`API error ${response.status}: ${body || response.statusText}`);
        }

        const data = (await response.json()) as Record<string, unknown>;
        return toJsonContent({
          status: normalizeStatus(data.status),
          verdict: normalizeVerdict(data.verdict),
          reason: String(data.reason ?? ""),
          judgmentId: String(data.judgmentId ?? tool_call_id),
          onChain: Boolean(data.onChain),
          cached: Boolean(data.cached),
          responseTimeMs: Number(data.responseTimeMs ?? 0),
          tool_call_id,
          agent_pubkey: pubkey,
        });
      } catch (error) {
        return toErrorContent(error);
      }
    },
  );
}
