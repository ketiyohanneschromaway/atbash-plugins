# Real AutoGen Runtime Example

This is one real AutoGen helper example for `@atbash/autogen`.

It does not need a model API key. It:

1. loads a real Atbash agent identity
2. calls `judgeForAutoGen()`
3. prints the live verdict from Atbash

## Run

From repo root:

```bash
ATBASH_AGENT_PRIVKEY=your_key_here node examples/autogen-runtime-agent/run.mjs
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
