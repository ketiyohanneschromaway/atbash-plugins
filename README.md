# Atbash Integrations

Usage docs for Atbash plugins built on top of `@atbash/sdk`.

All plugins follow same base flow:

1. load agent identity from `ATBASH_AGENT_PRIVKEY`
2. optionally use `ATBASH_ENDPOINT`
3. send action description + context to Atbash
4. handle verdict:
   - `ALLOW` = continue
   - `HOLD` = wait for operator review
   - `BLOCK` = do not execute

## Shared Runtime Inputs

- `ATBASH_AGENT_PRIVKEY`
- `ATBASH_ENDPOINT` optional

## Which Plugin To Use

- `@atbash/mcp`
  Use when your agent already consumes MCP tools.
- `@atbash/eliza-plugin`
  Use when your agent runs on ElizaOS.
- `@atbash/langgraph`
  Use when your workflow is a LangGraph state machine.
- `@atbash/langchain`
  Use when you want to guard LangChain tools directly.
- `@atbash/autogen`
  Use when you want a simple pre-execution judge call in an AutoGen-style loop.

## Docs

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
