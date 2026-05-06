# Real MCP Runtime Example

This is one real MCP example for `@atbash/mcp`.

It does not need an LLM API key. It:

1. starts the real Atbash MCP server over stdio
2. connects with a real MCP client
3. lists available tools
4. checks whether the agent is registered
5. reads the current policy
6. sends a hold-like `atbash_judge` request

Default Atbash private key in this example:

- pubkey: `0324a56ad3d2d57c96e67e14c22da1f87d204f4739a53a9a96ae47dc9ee9f0a86d`

## Run

From repo root:

```bash
npm install
npm run build
node examples/mcp-runtime-agent/client.mjs
```

Default action in example is hold-like:

```text
Bank transfer $25 to a new external vendor account for urgent reimbursement
```

Custom action:

```bash
node examples/mcp-runtime-agent/client.mjs "Bank transfer $25 to a new external vendor account for urgent reimbursement"
```

Override key or endpoint:

```bash
ATBASH_AGENT_PRIVKEY=your_key_here node examples/mcp-runtime-agent/client.mjs
ATBASH_ENDPOINT=https://atbash.ai node examples/mcp-runtime-agent/client.mjs
```
