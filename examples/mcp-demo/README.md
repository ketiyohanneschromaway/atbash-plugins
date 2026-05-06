# MCP Demo

This folder is for teams that already have an MCP-compatible agent client and want to add Atbash as another MCP server.

## Existing Client Setup

Build the workspace and run the Atbash MCP server:

```bash
npm run build
ATBASH_AGENT_PRIVKEY=your_private_key node examples/mcp-demo/run-server.mjs
```

Then point your client at it.

For Claude Desktop, start from:
[claude_desktop_config.example.json](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/mcp-demo/claude_desktop_config.example.json)

## Files

- [run-server.mjs](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/mcp-demo/run-server.mjs)
- [claude_desktop_config.example.json](/Users/ketiyohannes/Documents/development/work/Chromaway/atbash-plugins/examples/mcp-demo/claude_desktop_config.example.json)
