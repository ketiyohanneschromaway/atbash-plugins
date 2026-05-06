# Real LangGraph Runtime Example

This is one real LangGraph example for `@atbash/langgraph`.

It does not need an LLM API key. It:

1. builds a real `StateGraph`
2. inserts `@atbash/langgraph` safety nodes
3. creates a simulated `send_funds` tool call
4. triggers a live Atbash verdict
5. if verdict is `HOLD`, resumes with operator approval

Default Atbash private key in this example:

- pubkey: `0324a56ad3d2d57c96e67e14c22da1f87d204f4739a53a9a96ae47dc9ee9f0a86d`

## Run

From repo root:

```bash
npm install
npm run build
node examples/langgraph-runtime-agent/run.mjs
```

Default action in example is hold-like:

```text
Bank transfer $25 to a new external vendor account for urgent reimbursement
```

Custom action:

```bash
node examples/langgraph-runtime-agent/run.mjs "Bank transfer $25 to a new external vendor account for urgent reimbursement"
```

Override key or endpoint:

```bash
ATBASH_AGENT_PRIVKEY=your_key_here node examples/langgraph-runtime-agent/run.mjs
ATBASH_ENDPOINT=https://atbash.ai node examples/langgraph-runtime-agent/run.mjs
```
