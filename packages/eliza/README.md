# `@atbash/eliza-plugin`

Add Atbash to an ElizaOS agent.

Use this when your agent already runs inside ElizaOS and you want safety checks around actions, policy context in runtime, and audit logging after execution.

## What This Plugin Adds

- `atbashPlugin`
  Registers service, provider, evaluator, and explicit safety action.
- `withAtbashGuard()`
  Wraps sensitive actions so Atbash decides before execution.
- `AtbashService`
  Loads agent identity from runtime settings.
- `ATBASH_JUDGE`
  Explicit Eliza action for direct safety checks.

## Runtime Model

Eliza loads plugin once at startup.

Plugin then:

1. derives agent pubkey from private key
2. exposes policy context through provider
3. lets actions call Atbash before executing
4. logs completed actions through evaluator

## Basic Wiring

Add plugin to your character:

```ts
import atbashPlugin from "@atbash/eliza-plugin";

export const character = {
  name: "TreasuryBot",
  bio: ["Treasury operations agent"],
  plugins: [atbashPlugin],
  settings: {
    ATBASH_ENDPOINT: process.env.ATBASH_ENDPOINT,
  },
  secrets: {
    ATBASH_AGENT_PRIVKEY: process.env.ATBASH_AGENT_PRIVKEY,
  },
};
```

## Guarding A Sensitive Action

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

## Explicit Safety Check

If you want agent or app to call Atbash directly, use `ATBASH_JUDGE`.

Expected behavior:

- returns `Verdict: ALLOW` on success path
- returns held/block reason in callback text
- does not execute your real action for you

## What To Do With Verdicts

- `ALLOW`
  Proceed with original action handler.
- `HOLD`
  Stop action and surface operator-review requirement.
- `BLOCK`
  Stop action and surface policy reason.

## Recommended Pattern

- wrap every irreversible action with `withAtbashGuard()`
- keep low-risk informational actions unguarded
- let `policyProvider` add safety context for planning
- keep `auditEvaluator` enabled for post-action logging

## Example

- [examples/eliza-runtime-agent/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/eliza-runtime-agent/README.md)
