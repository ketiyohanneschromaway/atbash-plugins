# Atbash Integrations — Handoff Document (Part 2: MCP Server)

## PACKAGE: `@atbash/mcp`

An MCP (Model Context Protocol) server that exposes all Atbash SDK functions as tools any MCP-compatible AI client (Claude Desktop, Cursor, etc.) can call.

### Dependencies

```json
{
  "name": "@atbash/mcp",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": { "atbash-mcp": "dist/index.js" },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "test": "vitest run"
  },
  "dependencies": {
    "@atbash/sdk": "^0.3.3",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  }
}
```

### File structure

```
packages/mcp/
├── package.json
├── tsconfig.json          # extends ../../tsconfig.base.json
├── README.md
└── src/
    ├── index.ts           # Server entry point
    ├── tools/
    │   ├── judge.ts       # atbash_judge + atbash_log + atbash_check_agent
    │   ├── status.ts      # atbash_judgment_status
    │   └── queries.ts     # All read-only query tools
    ├── resources/
    │   └── policy.ts      # atbash://policy resource
    └── prompts/
        └── safety.ts      # safety-check prompt template
```

### How MCP works (key concepts)

- **McpServer** — the server class from `@modelcontextprotocol/sdk/server/mcp.js`
- **Tools** — functions the AI can call. Defined with a name, description, Zod input schema, and async handler
- **Resources** — read-only data identified by URI that the AI can pull into context
- **Prompts** — reusable templates
- **Transport** — stdio (local process) or HTTP (remote). Use stdio for this project.

### IMPLEMENTATION: `src/index.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadAgent } from "@atbash/sdk";

// Import registration functions from tool files
import { registerJudgeTools } from "./tools/judge.js";
import { registerStatusTools } from "./tools/status.js";
import { registerQueryTools } from "./tools/queries.js";

const server = new McpServer({
  name: "atbash-safety",
  version: "1.0.0",
});

// Load agent from env — private key never passed as tool argument
const privkey = process.env.ATBASH_AGENT_PRIVKEY;
if (!privkey) {
  console.error("ATBASH_AGENT_PRIVKEY env var is required");
  process.exit(1);
}
const agent = loadAgent(privkey);
const endpoint = process.env.ATBASH_ENDPOINT; // optional override

// Register all tools
registerJudgeTools(server, agent, endpoint);
registerStatusTools(server, endpoint);
registerQueryTools(server, agent, endpoint);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

### IMPLEMENTATION: `src/tools/judge.ts`

Register three tools: `atbash_judge`, `atbash_log`, `atbash_check_agent`.

```typescript
import { z } from "zod";
import {
  judgeAction,
  logToolCall,
  checkAgentExists,
  type AgentAuth,
} from "@atbash/sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerJudgeTools(
  server: McpServer,
  agent: AgentAuth,
  endpoint?: string,
) {
  const opts = endpoint ? { endpoint } : undefined;

  // TOOL: atbash_judge
  server.registerTool(
    "atbash_judge",
    {
      description:
        "Submit an action for safety judgment BEFORE executing it. " +
        "Returns ALLOW (proceed), HOLD (needs operator review), or BLOCK (violates policy). " +
        "Always call this before any sensitive or irreversible action.",
      inputSchema: z.object({
        action: z.string().describe("Plain text description of the action to judge"),
        context: z.string().describe("Why this action is being taken"),
        provider: z.enum(["atbash", "openai", "google", "microsoft", "custom"]).optional()
          .describe("AI provider for evaluation"),
        model: z.string().optional().describe("Model override (e.g. gpt-4o)"),
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
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
  );

  // TOOL: atbash_log
  server.registerTool(
    "atbash_log",
    {
      description: "Log a tool call on-chain without requesting a verdict. For audit-only mode.",
      inputSchema: z.object({
        action: z.string().describe("Action description"),
        context: z.string().describe("Action context"),
        tool_name: z.string().optional().describe("Tool name"),
        tool_args_json: z.string().optional().describe("Tool arguments JSON"),
      }),
    },
    async ({ action, context, tool_name, tool_args_json }) => {
      try {
        const result = await logToolCall(action, context, agent, undefined,
          { toolName: tool_name, toolArgsJson: tool_args_json }, opts);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
  );

  // TOOL: atbash_check_agent
  server.registerTool(
    "atbash_check_agent",
    {
      description: "Check if an agent is registered on the Atbash platform.",
      inputSchema: z.object({
        pubkey: z.string().optional().describe("Agent public key (defaults to this agent)"),
      }),
    },
    async ({ pubkey }) => {
      const exists = await checkAgentExists(pubkey || agent.pubkey, opts);
      return {
        content: [{ type: "text", text: JSON.stringify({ registered: exists, pubkey: pubkey || agent.pubkey }) }],
      };
    },
  );
}
```

### IMPLEMENTATION: `src/tools/status.ts`

```typescript
import { z } from "zod";
import { getJudgmentStatus } from "@atbash/sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerStatusTools(server: McpServer, endpoint?: string) {
  const opts = endpoint ? { endpoint } : undefined;

  server.registerTool(
    "atbash_judgment_status",
    {
      description: "Poll the status of a previously submitted judgment. Use when verdict was HOLD.",
      inputSchema: z.object({
        tool_call_id: z.string().describe("The tool_call_id from a previous atbash_judge call"),
      }),
    },
    async ({ tool_call_id }) => {
      try {
        const status = await getJudgmentStatus(tool_call_id, opts);
        return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
  );
}
```

### IMPLEMENTATION: `src/tools/queries.ts`

Register these query tools — all follow the same pattern of calling the SDK function and returning JSON:

| Tool name | SDK function | Input params |
|-----------|-------------|-------------|
| `atbash_get_policy` | `getAgentPolicy(pubkey)` | `pubkey?: string` (defaults to this agent) |
| `atbash_get_agent_detail` | `getAgentDetail(pubkey)` | `pubkey?: string` |
| `atbash_get_tool_calls` | `getToolCalls(max)` | `max_count: number` (default 20) |
| `atbash_get_agent_tool_calls` | `getAgentToolCalls(pubkey, max)` | `pubkey?: string`, `max_count: number` |
| `atbash_get_org_tool_calls` | `getOrgToolCalls(org, max)` | `org_name: string`, `max_count: number` |
| `atbash_get_tool_call_full` | `getToolCallFull(id)` | `tool_call_id: string` |
| `atbash_get_tool_call_count` | `getToolCallCount()` | none |
| `atbash_get_tier_info` | `getOrgTierInfo(org)` | `org_name: string` |
| `atbash_get_held_actions` | `getPendingHeldActions(org, max)` | `org_name: string`, `max_count: number` |
| `atbash_get_reviews` | `getHeldActionReviews(org, max)` | `org_name: string`, `max_count: number` |
| `atbash_get_safety_stats` | `getSafetyStats()` | none |

All tools follow this pattern:

```typescript
server.registerTool("atbash_get_policy", {
  description: "Get agent's policy config and jail status",
  inputSchema: z.object({
    pubkey: z.string().optional().describe("Agent public key (defaults to this agent)"),
  }),
}, async ({ pubkey }) => {
  try {
    const result = await getAgentPolicy(pubkey || agent.pubkey, opts);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
  }
});
```

### Testing

Test with MCP Inspector (no AI agent needed):

```bash
npm run build -w packages/mcp
ATBASH_AGENT_PRIVKEY=<key> npx @modelcontextprotocol/inspector node packages/mcp/dist/index.js
```

### Consumer configuration (Claude Desktop)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "atbash": {
      "command": "node",
      "args": ["/absolute/path/to/packages/mcp/dist/index.js"],
      "env": {
        "ATBASH_AGENT_PRIVKEY": "your-64-hex-private-key"
      }
    }
  }
}
```
