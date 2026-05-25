# `atbash-crewai`

Add Atbash to CrewAI tools.

This package provides a small decorator that gates tool execution with the **native Python** Atbash client (`atbash-sdk`). Each tool call is judged before your function body runs.

## What It Is

The CrewAI-native Atbash integration.

It is meant for Python agents built with CrewAI where sensitive tools (payments, permissions, production writes) should be checked against Atbash policy **before** side effects occur.

## When To Use It

Use this package when:

- your app runs CrewAI agents with `@tool`-decorated functions
- you want those tools gated by Atbash verdicts (`ALLOW`, `BLOCK`, `HOLD`)
- you already install **`atbash-sdk`** (Python) in your environment (this repo does not pin it in `pyproject.toml`; link or install it yourself)

## What It Adds

- **`with_atbash_guard(agent_privkey, endpoint=None)`**  
  Decorator factory. Wraps a tool function so every invocation:

  1. Builds `action` from the function name plus serialized `args` / `kwargs`
  2. Uses the tool function’s **`__doc__`** as `context` for the judge
  3. Opens `Atbash(privkey=..., endpoint=...)` and calls `client.judge_action(action=..., context=...)`
  4. Applies the verdict (see below)

## Runtime Model

On each guarded tool call:

1. The wrapper constructs the action string and reads `context` from the docstring
2. `with Atbash(privkey=agent_privkey) as client:` (or with `endpoint=` if you passed one)
3. `client.judge_action(...)` returns a result with `verdict`, `reason`, and typically `tool_call_id`
4. Only on **`ALLOW`** does the original tool function run

The agent private key stays in your process; this package does not implement signing itself—it delegates to **`atbash`** (`Atbash`, `AtbashAPIError`).

## Main Usage Patterns

### 1. Install dependencies

From your virtualenv:

```bash
pip install -e python/atbash-crewai
```

Install and link **`atbash-sdk`** the way your team documents (editable install, private index, etc.). It is intentionally **not** listed in `pyproject.toml` yet.

### 2. Guard sensitive tools

Use `with_atbash_guard()` on tools that have real effects:

- transfers and payments
- permission or role changes
- infrastructure or data mutations

Keep read-only or obviously safe helpers unguarded if you do not need policy on them.

### 3. Decorator order (important for CrewAI)

Put **`@tool(...)` outermost** and **`@with_atbash_guard(...)` directly above `def`**, so CrewAI / Pydantic see the tool wrapper first:

```python
import os
from crewai.tools import tool
from atbash_crewai import with_atbash_guard

@tool("Transfer Funds")
@with_atbash_guard(os.environ["ATBASH_AGENT_PRIVKEY"], endpoint=os.environ.get("ATBASH_ENDPOINT"))
def transfer_funds(recipient: str, amount_usd: float) -> str:
    """Transfer funds to a named recipient in USD (demo: no real payment)."""
    return f"OK: transferred ${amount_usd} to {recipient}."
```

Write a clear **`__doc__`** on the tool: it becomes the `context` string sent to Atbash.

## Verdict Handling

### `with_atbash_guard()`

- **`ALLOW`**  
  The original tool function runs and its return value is passed through.

- **`BLOCK`**  
  The tool function does **not** run. The wrapper returns a string such as `BLOCKED: <reason>`.

- **`HOLD`**  
  The tool function does **not** run. The wrapper returns a string that includes operator-review wording and `tool_call_id` when present.

- **`AtbashAPIError`**  
  Caught and surfaced as `Atbash API error: ...` (string return, no uncaught exception).

- **Other exceptions**  
  Caught and surfaced as `Atbash guard error: ...` so a bad network or unexpected SDK shape does not tear down the whole crew run.

## How To Use It Properly

Good patterns:

- keep tool docstrings honest and specific; they are your policy context
- pass `endpoint=` when not using the SDK default
- treat BLOCK/HOLD return strings as first-class outcomes the LLM can report to the user

## What This Package Does Not Do

- It does not install or vendor **`atbash-sdk`**; you supply it in the environment.
- It does not choose which tools are risky; you decorate the ones that matter.
- It does not build operator-review UIs; HOLD returns text you can log or show.

## Example

- [CrewAI runtime example](../examples/README.md)
