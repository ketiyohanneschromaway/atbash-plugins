# `@atbash/mcp`

Expose Atbash as an MCP server.

This package is for MCP hosts that want to call Atbash as tools instead of importing Atbash into the host process directly.

## What It Is

`@atbash/mcp` starts a standalone MCP server process.

That server:

- loads one Atbash agent identity from `ATBASH_AGENT_PRIVKEY`
- exposes safety and query tools over MCP
- returns structured Atbash results to the host

Your MCP client or host remains the real decision-maker. This package does not execute your business tools for you.

## When To Use It

Use this package when:

- your host already supports MCP
- you want one Atbash tool server to serve one or many MCP clients
- you want Atbash checks without coupling your app directly to the SDK

Do not use this package when:

- you need deep framework lifecycle integration
- you want Atbash to wrap in-process handlers automatically

In those cases, use a framework-native package like Eliza or LangGraph instead.

## What It Adds

Safety tools:

- `atbash_judge`
- `atbash_log`
- `atbash_check_agent`

Read/query tools:

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

Optional prompt helper:

- `atbash_safety_check`

## Runtime Model

Normal flow:

1. your host decides a sensitive action may happen
2. host calls `atbash_judge`
3. host inspects the returned verdict
4. only on `ALLOW` does the host continue to the real tool

So the Atbash MCP server sits in front of a sensitive operation, not inside it.

## Main Tool Contracts

### `atbash_judge`

Use this before a sensitive side effect.

Inputs:

- `action`
- `context`
- optional `provider`
- optional `model`
- optional `tool_name`
- optional `tool_args_json`

Returns a result with fields such as:

- `verdict`
- `reason`
- `confidence`
- `tool_call_id`

### `atbash_log`

Use this when you want audit logging without a live allow/block/hold decision.

### `atbash_check_agent`

Use this for startup checks or debugging to confirm that the server agent is registered.

### `atbash_get_policy`

Use this when the host needs to display the current policy or jail status.

## How To Use It Properly

Recommended host pattern:

1. describe the real action in plain language
2. include useful business context
3. include `tool_name` and `tool_args_json` when possible
4. branch on verdict before any real side effect

Better input gives better safety decisions.

Weak:

```json
{
  "action": "do payment",
  "context": "finance"
}
```

Better:

```json
{
  "action": "Bank transfer $25 to a new external vendor account",
  "context": "Treasury payout review before execution",
  "tool_name": "send_bank_transfer",
  "tool_args_json": "{\"amount\":25,\"recipient\":\"new vendor\"}"
}
```

## Verdict Handling

- `ALLOW`
  Execute the real downstream tool.
- `HOLD`
  Do not execute. Surface review state and keep the `tool_call_id`.
- `BLOCK`
  Do not execute. Return or display the policy reason.

## Current Notes

- The tool surface is the stable path in this package.
- The policy resource path is intentionally disabled right now because MCP resource registration behavior is inconsistent across SDK versions.
- Query tools are read-only and useful for ops dashboards, review UIs, and support tooling.

## Example

- [MCP Runtime Example](../../examples/mcp-runtime-agent/README.md)
