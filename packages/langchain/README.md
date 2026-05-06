# `@atbash/langchain`

Guard LangChain tools with Atbash.

Use this when you already have `DynamicStructuredTool` instances and want a lightweight wrapper that checks Atbash before the tool executes.

## What This Plugin Adds

- `withAtbashGuard(tool, agent, options)`

This mutates a `DynamicStructuredTool` in place by replacing its `func` with a guarded version.

## Runtime Model

When guarded tool is invoked:

1. wrapper serializes tool arguments
2. wrapper sends action + tool description to Atbash
3. verdict:
   - `ALLOW` → original tool runs
   - `HOLD` → wrapper throws with `tool_call_id`
   - `BLOCK` → wrapper throws with block reason

## Basic Wiring

```ts
import { loadAgent } from "@atbash/sdk";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { withAtbashGuard } from "@atbash/langchain";
import { z } from "zod";

const agent = loadAgent(process.env.ATBASH_AGENT_PRIVKEY!);

const tool = new DynamicStructuredTool({
  name: "send_bank_transfer",
  description: "Send a bank transfer to an external vendor account",
  schema: z.object({
    request: z.string(),
  }),
  func: async (input) => {
    return `Executed: ${input.request}`;
  },
});

withAtbashGuard(tool, agent, {
  endpoint: process.env.ATBASH_ENDPOINT,
});
```

## What To Do With Verdicts

This package signals non-allow results by throwing:

- `ALLOW`
  Normal tool result returns.
- `HOLD`
  Error message includes `tool_call_id`.
- `BLOCK`
  Error message is policy reason.

So caller should wrap tool invocation in `try/catch`.

## Recommended Pattern

- use tool descriptions that clearly explain intent
- include meaningful argument names and values
- catch `HOLD` separately if you want operator-review UI
- keep this wrapper at tool boundary, not deep inside business logic

## Example

- [examples/langchain-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/langchain-runtime-agent/README.md)
