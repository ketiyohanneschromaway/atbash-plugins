# `atbash-crewai` (Python)

Python decorator for guarding **CrewAI tools** with Atbash.

This package does **not** call `@atbash/sdk` directly. Instead, it calls a local HTTP “bridge” (`@atbash/python-bridge`) which:

- holds the agent private key
- uses the official `@atbash/sdk` to sign and submit judgments

## Install

From repo root (or your Python env):

```bash
pip install -r python/atbash-crewai/requirements.txt
```

## Core API

### `with_atbash_guard(bridge_url="http://localhost:3000")`

Decorates a Python function (intended to be a CrewAI tool) so each call is judged before execution.

- **actionDesc**: generated from function name + args/kwargs
- **context**: taken from the function docstring
- **verdict enforcement**
  - `ALLOW`: execute the original function and return its result
  - `BLOCK`: do not execute; return a `"BLOCKED: …"` string
  - `HOLD`: do not execute; return a `"HELD … tool_call_id=…"` string

## Recommended decorator order (important)

CrewAI’s `@tool(...)` decorator should be **outermost**, and `@with_atbash_guard(...)` should be directly above `def`.

```python
from crewai.tools import tool
from atbash_crewai import with_atbash_guard

@tool("Transfer Funds")
@with_atbash_guard(bridge_url="http://localhost:3000")
def transfer_funds(recipient: str, amount_usd: float) -> str:
    \"\"\"Transfer funds to a named recipient in USD (demo).\"\"\"
    return f"OK: transferred ${amount_usd} to {recipient}."
```

## Running the full demo

- Start the bridge: `npm run start -w @atbash/python-bridge`
- Run the CrewAI example: `python3 python/examples/main.py`

See `python/examples/README.md` for the full walkthrough.

