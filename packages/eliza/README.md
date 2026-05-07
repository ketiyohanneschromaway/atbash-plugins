# `@atbash/eliza-plugin`

Add Atbash to an ElizaOS agent.

This package plugs into the Eliza runtime and gives you a safety service, a policy provider, an audit evaluator, and action-level guarding.

## What It Is

This is the Eliza-native Atbash integration.

It is meant for agents that already run inside ElizaOS and want Atbash woven into normal runtime behavior.

## When To Use It

Use this package when:

- your app is already an Eliza agent
- you want sensitive Eliza actions to be gated by Atbash
- you want current Atbash policy available in runtime context
- you want post-action audit logging

## What It Adds

- `atbashPlugin`
  Main plugin export. Registers service, provider, evaluator, and explicit judge action.
- `AtbashService`
  Loads the agent identity and optional endpoint from runtime settings.
- `ATBASH_JUDGE`
  Explicit action that asks Atbash for a verdict.
- `withAtbashGuard(handler)`
  Wraps a sensitive action handler so Atbash judges before the real handler runs.
- `policyProvider`
  Exposes current policy and jail status in provider form.
- `auditEvaluator`
  Best-effort logging after action completion.

## Runtime Model

At startup:

1. Eliza loads the plugin
2. `AtbashService` derives the Atbash agent from `ATBASH_AGENT_PRIVKEY`
3. optional `ATBASH_ENDPOINT` is attached as client config

During runtime:

1. provider can expose current safety status
2. `ATBASH_JUDGE` can be called directly
3. guarded actions call Atbash before they execute
4. evaluator logs completed activity after execution

## Main Usage Patterns

### 1. Register The Plugin

Add `atbashPlugin` to the Eliza character or runtime plugin list so the service, provider, evaluator, and action are available.

### 2. Guard Sensitive Actions

Use `withAtbashGuard()` on actions that create irreversible effects:

- sending funds
- creating approvals
- changing permissions
- touching production infrastructure

Keep low-risk read-only actions unguarded.

### 3. Use `ATBASH_JUDGE` For Explicit Checks

Use this when you want the agent or runtime to request a decision directly before choosing a path.

This action only asks for a verdict. It does not execute the real business action for you.

## How To Use It Properly

Good pattern:

- wrap the real action closest to the side effect
- keep action text specific and descriptive
- use the provider to make the agent aware of the current policy
- leave the evaluator enabled unless you intentionally do not want audit logging

Example guarded action shape:

```ts
import { withAtbashGuard } from "@atbash/eliza-plugin";

export const sendFundsAction = {
  name: "SEND_FUNDS",
  description: "Send funds to an external destination",
  validate: async () => true,
  handler: withAtbashGuard(async (_runtime, message) => {
    await sendFundsSomehow(message);
    return { success: true, text: "Transfer submitted" };
  }),
};
```

## Verdict Handling

### `withAtbashGuard()`

- `ALLOW`
  Original action handler runs.
- `HOLD`
  Original action handler does not run. The wrapper returns a held result.
- `BLOCK`
  Original action handler does not run. The wrapper returns a blocked result.

### `ATBASH_JUDGE`

- returns a structured result in `data`
- emits callback text that summarizes verdict, reason, and confidence
- leaves the next step up to your runtime or agent logic

## What This Package Does Not Do

- It does not automatically discover which actions are risky. You choose what to guard.
- It does not replace your business action implementation.
- It does not create a human-review UI. It only surfaces hold/block information back into Eliza.

## Example

- [examples/eliza-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/eliza-runtime-agent/README.md)
