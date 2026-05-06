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
- `@atbash/langchain` — LangChain tool wrapper for Atbash safety gating
- `@atbash/autogen` — AutoGen safety-judge helper for pre-execution gating
- `@atbash/common` — shared private utilities used across the workspace

## Environment

All integrations expect:

- `ATBASH_AGENT_PRIVKEY` — required, used for local signing and agent identity derivation
- `ATBASH_ENDPOINT` — optional, overrides the default Atbash API base URL

## Example

- Real Eliza runtime example:
  [examples/eliza-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/eliza-runtime-agent/README.md)
- Real LangGraph runtime example:
  [examples/langgraph-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/langgraph-runtime-agent/README.md)
- Real MCP runtime example:
  [examples/mcp-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/mcp-runtime-agent/README.md)
- Real LangChain runtime example:
  [examples/langchain-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/langchain-runtime-agent/README.md)
- Real AutoGen runtime example:
  [examples/autogen-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/autogen-runtime-agent/README.md)

## Package Docs

- [packages/mcp/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/packages/mcp/README.md)
- [packages/eliza/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/packages/eliza/README.md)
- [packages/langgraph/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/packages/langgraph/README.md)

## Development

```bash
npm install
npm run build
```
