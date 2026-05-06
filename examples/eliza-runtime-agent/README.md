# Real Eliza Runtime Example

This is one real ElizaOS runtime example for `@atbash/eliza-plugin`.

It does not need an OpenAI or other model API key because it does not run a chat model. Instead, it:

1. creates a real `AgentRuntime`
2. loads `@atbash/eliza-plugin`
3. registers a guarded `SEND_FUNDS` action
4. prints the Atbash policy provider output
5. runs both `ATBASH_JUDGE` and the guarded action against the live Atbash API

Default Atbash private key in this example:

- pubkey: `0324a56ad3d2d57c96e67e14c22da1f87d204f4739a53a9a96ae47dc9ee9f0a86d`

## Run

From repo root:

```bash
npm install
npm run build
node examples/eliza-runtime-agent/run.mjs
```

Default action in example is hold-likely:

```text
Transfer $25 to a new external wallet 0xabc for urgent vendor reimbursement
```

Optional overrides:

```bash
ATBASH_AGENT_PRIVKEY=your_key_here node examples/eliza-runtime-agent/run.mjs
ATBASH_ENDPOINT=https://your-endpoint.example node examples/eliza-runtime-agent/run.mjs
node examples/eliza-runtime-agent/run.mjs "Transfer $250 to wallet 0xabc for invoice 1042"
```

If you later want a full model-driven Eliza chat agent on top of this, then yes, you will also need a model provider API key. This example itself does not require one.
