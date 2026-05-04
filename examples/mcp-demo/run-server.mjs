if (!process.env.ATBASH_AGENT_PRIVKEY) {
  console.error("Set ATBASH_AGENT_PRIVKEY before running the MCP demo.");
  process.exit(1);
}

await import("../../packages/mcp/dist/index.js");
