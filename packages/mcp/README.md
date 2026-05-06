# `@atbash/mcp`

MCP server exposing Atbash judgment, logging, status, and query APIs over stdio.

The server loads an agent from `ATBASH_AGENT_PRIVKEY`, lets the SDK derive the matching public identity, and relies on the SDK's local signing flow for on-chain audit and judgment requests.

## When To Use This Package

Use this when you already have an MCP-compatible agent client such as:

- Claude Desktop
- Cursor
- Cline
- a custom MCP host

You do not embed this package into the agent code itself. You run it as a separate MCP server process and point your client at it.

## Install

```bash
npm install @atbash/mcp @atbash/sdk
```

## Required Environment

- `ATBASH_AGENT_PRIVKEY`
- `ATBASH_ENDPOINT` optional

## Run The Server

```bash
npm run build -w @atbash/mcp
ATBASH_AGENT_PRIVKEY=your_private_key node packages/mcp/dist/index.js
```

## Existing MCP Client Example

If you already have a client like Claude Desktop, point it at the server process:

```json
{
  "mcpServers": {
    "atbash": {
      "command": "node",
      "args": ["/absolute/path/to/packages/mcp/dist/index.js"],
      "env": {
        "ATBASH_AGENT_PRIVKEY": "your-64-hex-private-key",
        "ATBASH_ENDPOINT": "https://atbash.ai"
      }
    }
  }
}
```

## What Tools It Exposes

- `atbash_judge`
- `atbash_log`
- `atbash_check_agent`
- `atbash_judgment_status`
- `atbash_get_policy`
- `atbash_get_agent_detail`
- `atbash_get_tool_calls`
- `atbash_get_agent_tool_calls`
- `atbash_get_org_tool_calls`
- `atbash_get_tool_call_full`
- `atbash_get_tool_call_count`
- `atbash_get_tier_info`
- `atbash_get_held_actions`
- `atbash_get_reviews`
- `atbash_get_safety_stats`

## Existing Agent Workflow

In an existing MCP client workflow:

1. Call `atbash_judge` before a sensitive or irreversible tool call
2. If the verdict is `ALLOW`, proceed
3. If the verdict is `HOLD`, wait for operator review and poll `atbash_judgment_status`
4. If the verdict is `BLOCK`, stop execution
