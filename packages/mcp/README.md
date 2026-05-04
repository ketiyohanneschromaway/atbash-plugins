# `@atbash/mcp`

MCP server exposing Atbash judgment, logging, status, and query APIs over stdio.

The server loads an agent from `ATBASH_AGENT_PRIVKEY`, lets the SDK derive the matching public identity, and relies on the SDK's local signing flow for on-chain audit and judgment requests.

## Usage

```bash
npm run build -w @atbash/mcp
ATBASH_AGENT_PRIVKEY=your_private_key node packages/mcp/dist/index.js
```

Consumers can point Claude Desktop, Cursor, or any MCP-compatible client at the built entry point.
