# CrewAI + Atbash (Python) example

This example talks to the official `@atbash/sdk` through the **TypeScript sidecar** (`@atbash/python-bridge`). Python never performs signing; it only sends `actionDesc` and `context` to the bridge.

## Prerequisites

- Node.js and npm (monorepo root)
- Python 3.10+
- `OPENAI_API_KEY` for CrewAI
- `ATBASH_AGENT_PRIVKEY` for the bridge process (see bridge package)

Install Python deps (from this folder):

```bash
pip install -r ../atbash-crewai/requirements.txt
```

## Run (two terminals)

**Terminal 1 — start the Atbash bridge** (from the **repo root**):

```bash
npm run start -w @atbash/python-bridge
```

Ensure `ATBASH_AGENT_PRIVKEY` is set in the environment (or in a `.env` next to the bridge — the bridge loads `dotenv` from the current working directory).

**Terminal 2 — run the CrewAI example** (from **this directory**):

```bash
python3 main.py
```

Edit `.env` here to set `OPENAI_API_KEY` (and optionally `ATBASH_BRIDGE_URL`).
