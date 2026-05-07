# `@atbash/python-bridge`

TypeScript “sidecar” HTTP bridge that allows **Python agent frameworks** (e.g. CrewAI) to use the **official** `@atbash/sdk` for signing and safety judgments.

This exists because we do **not** re-implement Atbash signing / cryptography in Python. Python code sends action metadata (`actionDesc`, `context`) to this bridge, and the bridge calls `judgeAction()` using the SDK and the locally-held agent private key.

## What this package does

- Loads an Atbash agent identity via `loadAgent(ATBASH_AGENT_PRIVKEY)`
- Starts an Express server (default `:3000`)
- Exposes:
  - `POST /judge` — judge an action and return `verdict`, `reason`, `tool_call_id`
  - `GET /health` — basic liveness check

## Environment variables

- **`ATBASH_AGENT_PRIVKEY` (required)**: agent private key (hex). The key stays local to this process.
- **`ATBASH_ENDPOINT` (optional)**: Atbash API endpoint override.
- **`PORT` (optional)**: server port (default `3000`).

## API

### `POST /judge`

**Request body**

```json
{
  "actionDesc": "Calling tool 'transfer_funds' with arguments: {\"recipient\":\"Bob\",\"amount_usd\":50}",
  "context": "Transfer funds to a named recipient in USD (demo: no real payment)."
}
```

**Response body**

```json
{
  "verdict": "ALLOW",
  "reason": "…",
  "tool_call_id": "…"
}
```

**Error responses**

- `400` for invalid JSON body shape
- `502` if the SDK call fails (returned as `{ "error": "…" }`)

## Run

From repo root:

```bash
ATBASH_AGENT_PRIVKEY=your_key_here npm run start -w @atbash/python-bridge
```

Health check:

```bash
curl http://localhost:3000/health
```

## End-to-end example (CrewAI)

See `python/examples/README.md` for running the Python example that calls this bridge.

