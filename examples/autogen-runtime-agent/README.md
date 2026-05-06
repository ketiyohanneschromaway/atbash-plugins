# Real AutoGen Runtime Example

This is one real AutoGen helper example for `@atbash/autogen`.

It does not need a model API key. It:

1. loads a real Atbash agent identity
2. calls `judgeForAutoGen()`
3. prints the live verdict from Atbash

Default Atbash private key in this example:

- pubkey: `0324a56ad3d2d57c96e67e14c22da1f87d204f4739a53a9a96ae47dc9ee9f0a86d`

## Run

From repo root:

```bash
npm install
npm run build
node examples/autogen-runtime-agent/run.mjs
```

Default action in example is hold-like:

```text
Bank transfer $25 to a new external vendor account for urgent reimbursement
```

Custom action:

```bash
node examples/autogen-runtime-agent/run.mjs "Bank transfer $25 to a new external vendor account for urgent reimbursement"
```

Override key or endpoint:

```bash
ATBASH_AGENT_PRIVKEY=your_key_here node examples/autogen-runtime-agent/run.mjs
ATBASH_ENDPOINT=https://atbash.ai node examples/autogen-runtime-agent/run.mjs
```
