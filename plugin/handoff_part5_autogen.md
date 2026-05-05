# Handoff Part 5: AutoGen Integration

This handoff adds an AutoGen-compatible Atbash pattern to match existing integrations:

- Workspace package: `packages/autogen`
- Runnable demo: `examples/autogen-demo`

## What Was Added

- `@atbash/autogen` export:
  - `judgeForAutoGen(input, agent, clientOpts?)`
  - validates `action/context`
  - forwards `toolName/toolArgs` into `judgeAction(...)`
- Node bridge:
  - `examples/autogen-demo/bridge.mjs`
  - receives `/judge` requests from Python and calls Atbash
- Python runner:
  - `examples/autogen-demo/autogen_atbash_test.py`
  - enforces `Atbash first -> model only on ALLOW` flow

## Runbook

```bash
npm install
npm run build
```

Terminal 1:

```bash
ATBASH_AGENT_PRIVKEY=your_private_key node examples/autogen-demo/bridge.mjs
```

Terminal 2:

```bash
GEMINI_API_KEY=your_key python3 examples/autogen-demo/autogen_atbash_test.py
```
