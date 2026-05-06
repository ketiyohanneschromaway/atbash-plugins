import type { AgentAuth } from "@atbash/sdk";
import { getAgentPolicy } from "@atbash/sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type ResourceCapableServer = McpServer & {
  registerResource?: (
    name: string,
    uri: string,
    config: {
      description?: string;
      mimeType?: string;
      title?: string;
    },
    handler: (uri: URL) => Promise<{
      contents: Array<{ uri: string; mimeType: string; text: string }>;
    }>,
  ) => void;
};

export function registerPolicyResource(
  server: McpServer,
  agent: AgentAuth,
  endpoint?: string,
) {
  void server;
  void agent;
  void endpoint;

  // Current MCP SDK resource registration shape is unstable across versions.
  // Tool-based policy access remains available through `atbash_get_policy`.
  return;

  /*
  const resourceServer = server as ResourceCapableServer;

  if (!resourceServer.registerResource) {
    return;
  }

  resourceServer.registerResource(
    "atbash_policy",
    "atbash://policy",
    {
      description: "Read the current Atbash policy assigned to an agent.",
      mimeType: "application/json",
    },
    async () => {
      const policy = await getAgentPolicy(agent.pubkey, endpoint ? { endpoint } : undefined);
      return {
        contents: [
          {
            uri: `atbash://policy/${agent.pubkey}`,
            mimeType: "application/json",
            text: JSON.stringify(policy, null, 2),
          },
        ],
      };
    },
  );
  */
}
