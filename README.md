# Atbash Integrations

Monorepo for Atbash framework integrations built on top of `@atbash/sdk`.

The integrations assume the current published SDK behavior where the agent private key stays local, is used to sign blockchain actions, and `loadAgent()` derives the agent identity used for Atbash API and chain interactions.

## What This Repo Gives You

This repo is for teams that already have an agent and want to add Atbash safety controls without rewriting that agent from scratch.

- If your agent already speaks MCP, use `@atbash/mcp`
- If your agent already runs on ElizaOS, use `@atbash/eliza-plugin`
- If your agent already runs on LangGraph, use `@atbash/langgraph`

Each package wraps the same Atbash flow:

1. Load the agent from `ATBASH_AGENT_PRIVKEY`
2. Let the SDK derive the public agent identity
3. Sign blockchain writes locally with the private key
4. Ask Atbash for a verdict before or around sensitive tool execution

## Packages

- `@atbash/mcp` — MCP server exposing Atbash safety and query tools
- `@atbash/eliza-plugin` — ElizaOS plugin for guardrails, audit logging, and policy context
- `@atbash/langgraph` — LangGraph safety gate, audit node, and advisory tool
- `@atbash/common` — shared private utilities used across the workspace

## Environment

All integrations expect:

- `ATBASH_AGENT_PRIVKEY` — required, used for local signing and agent identity derivation
- `ATBASH_ENDPOINT` — optional, overrides the default Atbash API base URL

## Existing Agent Examples

- MCP client/server setup:
  [examples/mcp-demo/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/mcp-demo/README.md)
- Existing ElizaOS character and action wiring:
  [examples/eliza-demo/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/eliza-demo/README.md)
- Existing LangGraph graph wiring:
  [examples/langgraph-demo/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/langgraph-demo/README.md)

## Package Docs

- [packages/mcp/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/packages/mcp/README.md)
- [packages/eliza/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/packages/eliza/README.md)
- [packages/langgraph/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/packages/langgraph/README.md)

## Development

```bash
npm install
npm run build
npm test
```
