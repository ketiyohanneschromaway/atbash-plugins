import { getJudgmentStatus } from "@atbash/sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createClientOpts, toErrorContent, toJsonContent } from "@atbash/common";

export function registerStatusTools(server: McpServer, endpoint?: string) {
  const opts = createClientOpts(endpoint);

  server.registerTool(
    "atbash_judgment_status",
    {
      description: "Poll the status of a previously submitted judgment.",
      inputSchema: z.object({
        tool_call_id: z.string().describe("The tool_call_id returned from atbash_judge"),
      }),
    },
    async ({ tool_call_id }) => {
      try {
        const status = await getJudgmentStatus(tool_call_id, opts);
        return toJsonContent(status);
      } catch (error) {
        return toErrorContent(error);
      }
    },
  );
}
