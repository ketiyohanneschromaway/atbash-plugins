# Real LangChain Runtime Example

This is one real LangChain example for `@atbash/langchain`.

It does not need an LLM API key. It:

1. creates a real `DynamicStructuredTool`
2. wraps it with `withAtbashGuard()`
3. sends a live Atbash judgment
4. either executes the tool on `ALLOW` or throws on `HOLD` / `BLOCK`

## Run

From repo root:

```bash
ATBASH_AGENT_PRIVKEY=your_key_here node examples/langchain-runtime-agent/run.mjs
```

Default action in example is hold-like:

```text
Bank transfer $25 to a new external vendor account for urgent reimbursement
```

Custom action:

```bash
node examples/langchain-runtime-agent/run.mjs "Bank transfer $25 to a new external vendor account for urgent reimbursement"
```

Override key or endpoint:

```bash
ATBASH_AGENT_PRIVKEY=your_key_here node examples/langchain-runtime-agent/run.mjs
ATBASH_ENDPOINT=https://atbash.ai node examples/langchain-runtime-agent/run.mjs
```
