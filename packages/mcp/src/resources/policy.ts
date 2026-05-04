import type { AgentAuth } from "@atbash/sdk";
import { getAgentPolicy } from "@atbash/sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

type ResourceCapableServer = McpServer & {
  registerResource?: (
    name: string,
    config: {
      description?: string;
      mimeType?: string;
      uri?: string;
      inputSchema?: unknown;
    },
    handler: (input: { pubkey?: string }) => Promise<{
      contents: Array<{ uri: string; mimeType: string; text: string }>;
    }>,
  ) => void;
};

export function registerPolicyResource(
  server: McpServer,
  agent: AgentAuth,
  endpoint?: string,
) {
  const resourceServer = server as ResourceCapableServer;

  if (!resourceServer.registerResource) {
    return;
  }

  resourceServer.registerResource(
    "atbash_policy",
    {
      description: "Read the current Atbash policy assigned to an agent.",
      mimeType: "application/json",
      uri: "atbash://policy",
      inputSchema: z.object({
        pubkey: z.string().optional().describe("Agent public key, defaults to the server agent"),
      }),
    },
    async ({ pubkey }) => {
      const policy = await getAgentPolicy(pubkey ?? agent.pubkey, endpoint ? { endpoint } : undefined);
      return {
        contents: [
          {
            uri: `atbash://policy/${pubkey ?? agent.pubkey}`,
            mimeType: "application/json",
            text: JSON.stringify(policy, null, 2),
          },
        ],
      };
    },
  );
}
