# `@atbash/eliza-plugin`

ElizaOS plugin that adds Atbash safety judgment, policy context, and audit logging.

## When To Use This Package

Use this when you already have an ElizaOS agent and want to add Atbash with minimal changes.

This package gives you two integration styles:

- add the plugin to an existing character
- wrap specific high-risk custom actions with `withAtbashGuard()`

## Install

```bash
npm install @atbash/eliza-plugin @atbash/sdk
```

## Required Settings

- `ATBASH_AGENT_PRIVKEY`
- `ATBASH_ENDPOINT` optional

## What It Registers

- `atbashPlugin` registers the service, provider, evaluator, and explicit safety action
- `withAtbashGuard()` wraps custom Eliza actions behind an Atbash verdict gate
- Reads `ATBASH_AGENT_PRIVKEY` and optional `ATBASH_ENDPOINT` from the runtime settings
- Uses the SDK's local private-key signing flow so Eliza actions are attributed to the derived Atbash agent identity

## Existing Character Example

If you already have a character, add the plugin and settings:

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

## Existing Custom Action Example

If you already have a sensitive custom action, wrap it:

```ts
import { withAtbashGuard } from "@atbash/eliza-plugin";

export const sendFundsAction = {
  name: "SEND_FUNDS",
  description: "Send funds to an external destination",
  validate: async () => true,
  handler: withAtbashGuard(async () => {
    await sendFundsSomehow();
    return { success: true, text: "Transfer submitted" };
  }),
};
```

## What Happens At Runtime

1. Eliza loads the plugin
2. `AtbashService` loads the private key and derives the agent identity
3. `policyProvider` adds Atbash context to the runtime
4. `auditEvaluator` can log completed actions
5. `withAtbashGuard()` or `ATBASH_JUDGE` performs pre-execution checks

## Example Files

- [examples/eliza-demo/existing-character.ts](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/eliza-demo/existing-character.ts)
- [examples/eliza-demo/sendFundsAction.ts](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/eliza-demo/sendFundsAction.ts)
- [examples/eliza-demo/guarded-action.mjs](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/eliza-demo/guarded-action.mjs)
- [examples/eliza-demo/README.md](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/eliza-demo/README.md)
