# Atbash Integrations

This repo contains framework-specific Atbash integrations built on top of `@atbash/sdk`.

These packages all do the same core job:

1. identify an agent from `ATBASH_AGENT_PRIVKEY`
2. optionally talk to a custom `ATBASH_ENDPOINT`
3. send an action to Atbash before a sensitive step runs
4. react to the returned verdict

Common verdict meaning:

- `ALLOW`
  Safe to continue.
- `HOLD`
  Stop and wait for operator review.
- `BLOCK`
  Do not execute. Surface the reason.

## Shared Runtime Inputs

- `ATBASH_AGENT_PRIVKEY`
  Required. Used to derive the Atbash agent identity and sign requests.
- `ATBASH_ENDPOINT`
  Optional. Overrides the default Atbash API base URL.

## Which Package To Use

- `@atbash/mcp`
  Use when your host already supports MCP and should call Atbash as external tools.
- `@atbash/eliza-plugin`
  Use when your runtime is ElizaOS and you want service, provider, evaluator, and guarded actions.
- `@atbash/langgraph`
  Use when your workflow is already a LangGraph graph with explicit agent and tools phases.
- `@atbash/langchain`
  Use when you want to guard `DynamicStructuredTool` instances directly.
- `@atbash/autogen`
  Use when you want one explicit judge call inside your own orchestration loop.

## Integration Styles

There are two big styles in this repo.

Framework-native integrations:

- `@atbash/eliza-plugin`
- `@atbash/langgraph`

These plug into a framework lifecycle and add Atbash to that framework's normal execution model.

Lightweight guard wrappers or helpers:

- `@atbash/langchain`
- `@atbash/autogen`

These do not own the full agent lifecycle. They only add a safety check around a step you already control.

External tooling surface:

- `@atbash/mcp`

This is not an agent by itself. It is an MCP server that exposes Atbash capabilities to an MCP-capable host.

## Docs By Package

- [packages/mcp/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/packages/mcp/README.md)
- [packages/eliza/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/packages/eliza/README.md)
- [packages/langgraph/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/packages/langgraph/README.md)
- [packages/langchain/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/packages/langchain/README.md)
- [packages/autogen/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/packages/autogen/README.md)

## Runtime Examples

- [examples/mcp-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/mcp-runtime-agent/README.md)
- [examples/eliza-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/eliza-runtime-agent/README.md)
- [examples/langgraph-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/langgraph-runtime-agent/README.md)
- [examples/langchain-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/langchain-runtime-agent/README.md)
- [examples/autogen-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/autogen-runtime-agent/README.md)

## Quick Guidance

- If your framework already has a first-class plugin model, prefer the framework-native integration.
- If you only need a check right before a real side effect, prefer the smallest wrapper that matches your stack.
- The more structured action context you pass to Atbash, the better and more explainable the judgment will be.
