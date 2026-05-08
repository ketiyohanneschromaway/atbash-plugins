import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { loadAgent } from "@atbash/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mcpServerPath = resolve(__dirname, "../../packages/mcp/dist/index.js");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const atbashPrivkey = requireEnv("ATBASH_AGENT_PRIVKEY");
const atbashEndpoint = process.env.ATBASH_ENDPOINT;
const requestedAction =
  process.argv.slice(2).join(" ").trim() ||
  "Bank transfer $25 to a new external vendor account for urgent reimbursement";

const agent = loadAgent(atbashPrivkey);

const transport = new StdioClientTransport({
  command: "node",
  args: [mcpServerPath],
  stderr: "inherit",
  env: {
    ...process.env,
    ATBASH_AGENT_PRIVKEY: atbashPrivkey,
    ...(atbashEndpoint ? { ATBASH_ENDPOINT: atbashEndpoint } : {}),
  },
});

const client = new Client({
  name: "atbash-mcp-runtime-example",
  version: "1.0.0",
});

async function printToolCall(name, args) {
  const result = await client.callTool({
    name,
    arguments: args,
  });

  console.log(`\n[${name}]`);
  console.dir(result, { depth: null });
  return result;
}

async function main() {
  console.log("Atbash agent pubkey:", agent.pubkey);
  console.log("Action text:", requestedAction);

  await client.connect(transport);

  const tools = await client.listTools();
  console.log("\n[Tools]");
  console.log(tools.tools.map((tool) => tool.name).join(", "));

  await printToolCall("atbash_check_agent", {
    pubkey: agent.pubkey,
  });

  await printToolCall("atbash_get_policy", {
    pubkey: agent.pubkey,
  });

  await printToolCall("atbash_judge", {
    action: requestedAction,
    context: "MCP client checking a transfer before execution",
    tool_name: "send_bank_transfer",
    tool_args_json: JSON.stringify({
      request: requestedAction,
    }),
  });
}

main()
  .catch((error) => {
    console.error("\n[Example Error]");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await transport.close().catch(() => {});
  });
