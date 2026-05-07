# `@atbash/langchain`

Guard LangChain tools with Atbash.

This package is the smallest in-process integration in the repo. It wraps a `DynamicStructuredTool` and adds a safety check before the tool runs.

## What It Is

This is a lightweight tool wrapper, not a full framework plugin.

You keep your existing LangChain flow. This package only guards the tool boundary.

## When To Use It

Use this package when:

- you already use `DynamicStructuredTool`
- you want minimal ceremony
- you only need Atbash directly around a tool execution step

Do not use this package when:

- you need human-review pause and resume semantics at the graph level
- you want a framework-native plugin lifecycle

In those cases, LangGraph or Eliza is usually a better fit.

## What It Adds

- `withAtbashGuard(tool, agent, options)`

This mutates the passed tool in place by replacing its `func` with a guarded wrapper.

## Runtime Model

When the tool is invoked:

1. tool input is serialized
2. wrapper sends an action description and context to Atbash
3. Atbash returns a verdict
4. wrapper either runs the original tool or throws

## How To Use It Properly

Best results come when:

- tool name clearly reflects the real side effect
- tool description explains intent, not just implementation
- tool arguments are meaningful and specific
- caller wraps invocation in `try/catch`

Example:

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

## Verdict Handling

This package signals non-allow outcomes by throwing errors.

- `ALLOW`
  Original tool result returns normally.
- `HOLD`
  Wrapper throws an error message that includes `tool_call_id`.
- `BLOCK`
  Wrapper throws an error message containing the policy reason.

That means the caller should interpret exceptions deliberately, not treat them all as generic tool crashes.

## Recommended Caller Pattern

- catch the thrown error
- if message contains hold semantics, move into review flow
- if message contains block semantics, surface policy reason
- only retry if your app intentionally wants to present a changed action for review

## What This Package Does Not Do

- It does not manage a queue or review workflow.
- It does not pause and resume execution like LangGraph.
- It does not guard arbitrary business code unless that code is behind a wrapped tool.

## Example

- [examples/langchain-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/langchain-runtime-agent/README.md)
