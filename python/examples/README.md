# CrewAI + Atbash runtime example

This is a minimal CrewAI example that uses **`atbash-crewai`** and the **native Python** `atbash-sdk` (`from atbash import Atbash, AtbashAPIError` under the hood).

It:

1. loads env vars from `python/examples/.env` (optional; you can export vars instead)
2. imports `with_atbash_guard` from the local `atbash-crewai` package (via `sys.path` so you do not have to `pip install` the monorepo package for a quick run)
3. defines a `@tool("Transfer Funds")` wrapped with `@with_atbash_guard(os.environ["ATBASH_AGENT_PRIVKEY"], ...)`
4. runs a Crew with two sequential tasks:
   - transfer **$50 to Bob** (expected **ALLOW** — tool body runs)
   - transfer **$50,000 to Eve** (expected **BLOCK** — tool body does not run; agent sees a block string)

## Prerequisites

- Python **3.10+**
- **`atbash-sdk`** installed in the same environment (per your team’s install / link instructions)
- **`crewai`** (also pulled in if you `pip install -e ../atbash-crewai`)

## Configure

Edit `python/examples/.env`:

```env
OPENAI_API_KEY=...
ATBASH_AGENT_PRIVKEY=...
# optional
# ATBASH_ENDPOINT=https://atbash.ai
```

The example’s small `.env` loader only sets variables that are not already in the environment.

## Install (recommended)

From repo root (or from `python/examples` with adjusted paths):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e python/atbash-crewai
# plus your team’s command to install/link atbash-sdk
```

## Run

From **`python/examples`**:

```bash
python3 main.py
```

Or from repo root:

```bash
python3 python/examples/main.py
```

You need **`OPENAI_API_KEY`** because this example runs a real LLM-backed Crew to decide tool calls. Unlike the Eliza runtime demo, this is model-driven.

## What you should see

- First task: tool output like `OK: transferred $50 to Bob.`
- Second task: a string starting with **`BLOCKED:`** (or a HOLD/review string if policy holds instead of blocks), and **no** successful transfer line from the tool body

## Related docs

- [atbash-crewai package](../atbash-crewai/README.md)
