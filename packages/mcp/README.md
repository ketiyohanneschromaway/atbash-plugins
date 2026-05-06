# `@atbash/mcp`

Expose Atbash as an MCP server.

Use this when your agent already knows how to call MCP tools. Your agent does not import Atbash directly. It connects to a separate MCP server process and calls Atbash tools over MCP.

## What This Plugin Adds

- pre-execution judgment
- audit-only logging
- agent registration check
- policy lookup
- org / agent / tool-call query tools

## Runtime Model

Your MCP host calls tools like:

1. `atbash_judge`
2. your real sensitive tool, only if verdict is `ALLOW`

Typical flow:

1. agent plans sensitive action
2. MCP host calls `atbash_judge`
3. handle result:
   - `ALLOW`: continue
   - `HOLD`: stop and wait for human review
   - `BLOCK`: stop and surface reason

## Main Tools

- `atbash_judge`
  Main safety gate. Use before sensitive execution.
- `atbash_log`
  Audit-only logging without requesting verdict.
- `atbash_check_agent`
  Confirms this agent is registered.
- `atbash_get_policy`
  Returns active policy and jail status.
- `atbash_get_agent_detail`
  Returns agent metadata.
- `atbash_get_tool_calls`
- `atbash_get_agent_tool_calls`
- `atbash_get_org_tool_calls`
- `atbash_get_tool_call_full`
- `atbash_get_tool_call_count`
- `atbash_get_tier_info`
- `atbash_get_held_actions`
- `atbash_get_reviews`
- `atbash_get_safety_stats`

## Minimal MCP Usage

Point your MCP client at:

```text
node packages/mcp/dist/index.js
```

Then call:

```json
{
  "name": "atbash_judge",
  "arguments": {
    "action": "Bank transfer $25 to a new external vendor account",
    "context": "Treasury payout review before execution",
    "tool_name": "send_bank_transfer",
    "tool_args_json": "{\"amount\":25,\"recipient\":\"new vendor\"}"
  }
}
```

Expected result shape:

```json
{
  "verdict": "ALLOW | HOLD | BLOCK",
  "reason": "...",
  "confidence": 0.9,
  "tool_call_id": "tc-..."
}
```

## What To Do With Verdicts

- `ALLOW`
  Execute your real tool.
- `HOLD`
  Do not execute yet. Show operator review state.
- `BLOCK`
  Do not execute. Surface reason to user or agent.

## Notes

- This package is best when Atbash should be available to many different MCP clients from one server process.
- Query tools are read-only and useful for dashboards, support flows, and ops tooling.

## Example

- [examples/mcp-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/mcp-runtime-agent/README.md)
