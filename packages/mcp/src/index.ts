#!/usr/bin/env node

import { loadAgent } from "@atbash/sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSafetyPrompt } from "./prompts/safety.js";
import { registerPolicyResource } from "./resources/policy.js";
import { registerJudgeTools } from "./tools/judge.js";
import { registerQueryTools } from "./tools/queries.js";
import { registerStatusTools } from "./tools/status.js";

const privkey = process.env.ATBASH_AGENT_PRIVKEY;

if (!privkey) {
  console.error("ATBASH_AGENT_PRIVKEY env var is required");
  process.exit(1);
}

const agent = loadAgent(privkey);
const endpoint = process.env.ATBASH_ENDPOINT;

const server = new McpServer({
  name: "atbash-safety",
  version: "1.0.0",
});

registerJudgeTools(server, agent, endpoint);
registerStatusTools(server, agent.pubkey, endpoint);
registerQueryTools(server, agent, endpoint);
registerPolicyResource(server, agent, endpoint);
registerSafetyPrompt(server);

const transport = new StdioServerTransport();
await server.connect(transport);
