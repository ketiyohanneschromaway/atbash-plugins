# Atbash Integrations

Monorepo for Atbash framework integrations built on top of `@atbash/sdk`.

The integrations assume the current published SDK behavior where the agent private key stays local, is used to sign blockchain actions, and `loadAgent()` derives the agent identity used for Atbash API and chain interactions.

## Packages

- `@atbash/mcp` — MCP server exposing Atbash safety and query tools
- `@atbash/eliza-plugin` — ElizaOS plugin for guardrails, audit logging, and policy context
- `@atbash/langgraph` — LangGraph safety gate, audit node, and advisory tool
- `@atbash/langchain` — LangChain tool wrapper for Atbash safety gating
- `@atbash/common` — shared private utilities used across the workspace

## Development

```bash
npm install
npm run build
```

The integrations expect `ATBASH_AGENT_PRIVKEY` to be provided by the consumer at runtime.
