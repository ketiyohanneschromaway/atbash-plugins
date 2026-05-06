# `@atbash/autogen`

Simple Atbash judge helper for AutoGen-style loops.

Use this when your app already has an orchestration loop and you only need one explicit Atbash check before model output, tool execution, or multi-agent handoff.

## What This Plugin Adds

- `judgeForAutoGen(input, agent, clientOpts?)`
- `AutoGenJudgeInput`

## Runtime Model

Your orchestration loop decides when an action is about to happen.

Before execution:

1. build an `action`
2. build `context`
3. optionally include `toolName` and `toolArgs`
4. call `judgeForAutoGen(...)`
5. handle verdict

## Basic Wiring

```ts
import { loadAgent } from "@atbash/sdk";
import { judgeForAutoGen } from "@atbash/autogen";

const agent = loadAgent(process.env.ATBASH_AGENT_PRIVKEY!);

const result = await judgeForAutoGen(
  {
    action: "Bank transfer $25 to a new external vendor account",
    context: "AutoGen agent checking transfer before execution",
    toolName: "send_bank_transfer",
    toolArgs: { amount: 25, recipient: "new vendor" },
  },
  agent,
  { endpoint: process.env.ATBASH_ENDPOINT },
);
```

## What To Do With Verdicts

- `ALLOW`
  Continue normal execution.
- `HOLD`
  Stop and wait for operator review. Use returned `tool_call_id`.
- `BLOCK`
  Stop and surface reason.

## Recommended Pattern

- use this when you want full control over the surrounding workflow
- call it right before real side effects
- store `tool_call_id` if your app needs manual review flow later

## Example

- [examples/autogen-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/autogen-runtime-agent/README.md)
