# AutoGen Demo

This demo follows the Atbash boundary pattern:

1. Python sends each user prompt to the bridge.
2. Bridge calls Atbash (`judgeAction`) and returns `ALLOW`, `BLOCK`, or `HOLD`.
3. Python only calls the model/tools when verdict is `ALLOW`.

## Prerequisites

- Node.js 20+
- Python 3.10+
- `ATBASH_AGENT_PRIVKEY` set in your shell
- `GEMINI_API_KEY` set in your shell

## Install

```bash
npm install
npm run build
python3 -m pip install autogen-agentchat autogen-ext openai requests
```

## Run

Terminal 1:

```bash
ATBASH_AGENT_PRIVKEY=your_private_key node examples/autogen-demo/bridge.mjs
```

Terminal 2:

```bash
GEMINI_API_KEY=your_key python3 examples/autogen-demo/autogen_atbash_test.py
```
