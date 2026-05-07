# `@atbash/autogen`

Use Atbash as an explicit judge call inside an AutoGen-style orchestration loop.

This package is intentionally small. It does not try to own your orchestration model. It gives you one focused helper to ask Atbash for a verdict at the point where your app chooses.

## What It Is

This is a thin helper around `judgeAction(...)` for apps that already have their own coordination loop.

## When To Use It

Use this package when:

- you already control your own orchestration steps
- you want one explicit Atbash check before a side effect
- you do not need a heavier plugin lifecycle

This is a good fit for:

- AutoGen-style multi-agent loops
- custom planners
- supervisor-worker systems
- approval chains where your app already owns the review UI

## What It Adds

- `judgeForAutoGen(input, agent, clientOpts?)`
- `AutoGenJudgeInput`

## Runtime Model

Your app decides where the safety gate belongs.

Typical flow:

1. build a clear `action`
2. build a useful `context`
3. optionally include `toolName`
4. optionally include `toolArgs`
5. call `judgeForAutoGen(...)`
6. branch on verdict before any real side effect

## How To Use It Properly

Send the same kind of detail you would want a human reviewer to see.

Weak:

```ts
await judgeForAutoGen(
  {
    action: "Do the transfer",
    context: "Finance task",
  },
  agent,
);
```

Better:

```ts
await judgeForAutoGen(
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

## Verdict Handling

- `ALLOW`
  Continue your orchestration.
- `HOLD`
  Stop and hand off to human review. Keep the returned `tool_call_id`.
- `BLOCK`
  Stop and surface the policy reason.

## What This Package Does Not Do

- It does not wrap your framework for you.
- It does not create a review queue.
- It does not log or execute the real action automatically.

That is intentional. The host loop stays in control.

## Example

- [AutoGen Runtime Example](../../examples/autogen-runtime-agent/README.md)
