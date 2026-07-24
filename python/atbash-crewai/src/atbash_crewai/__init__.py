"""
Atbash safety guard for CrewAI tools via a TypeScript bridge that calls `@atbash/sdk`.

The bridge signs requests with the official SDK; this package only forwards action metadata.
"""

from __future__ import annotations

import functools
import json
from collections.abc import Callable
from typing import Any

import requests

__all__ = ["with_atbash_guard"]


def _serialize_call(func_name: str, args: tuple[Any, ...], kwargs: dict[str, Any]) -> str:
    """Build a stable, human-readable description of the tool invocation for Atbash."""
    try:
        payload = {"function": func_name, "args": args, "kwargs": kwargs}
        return f"{func_name}({json.dumps(payload, default=str)})"
    except Exception as exc:  # noqa: BLE001 — never break the guard on serialization
        return f"{func_name}(args={args!r}, kwargs={kwargs!r}, serialization_error={exc!s})"


def with_atbash_guard(bridge_url: str = "http://localhost:3000") -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """
    Decorate a CrewAI tool function so each call is judged by the TS bridge before running.

    Verdict handling:
    - ALLOW: return value of the wrapped function
    - BLOCK: return an error string (do not execute the tool body)
    - HOLD: return a review string including tool_call_id (do not execute the tool body)

    Usage (keep ``@tool`` outermost so CrewAI / Pydantic see the tool wrapper first)::

        @tool("Transfer Funds")
        @with_atbash_guard()
        def transfer_funds(recipient: str, amount_usd: float) -> str:
            \"\"\"Plain-language description used as Atbash ``context``.\"\"\"
            ...
    """

    base = bridge_url.rstrip("/")

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            action_desc = _serialize_call(func.__name__, args, kwargs)
            context = (func.__doc__ or "").strip()

            try:
                response = requests.post(
                    f"{base}/judge",
                    json={"actionDesc": action_desc, "context": context},
                    timeout=120,
                    headers={"Content-Type": "application/json"},
                )
            except requests.RequestException as exc:
                return f"Atbash bridge request failed: {exc}"

            try:
                data: dict[str, Any] = response.json()
            except ValueError:
                return (
                    f"Atbash bridge returned non-JSON (HTTP {response.status_code}): "
                    f"{response.text[:500]}"
                )

            if response.status_code >= 400:
                err = data.get("error", response.text)
                return f"Atbash bridge error: {err}"

            verdict = str(data.get("verdict", "")).strip().upper()
            reason = str(data.get("reason", "") or "")
            tool_call_id = str(data.get("tool_call_id", "") or "")

            if verdict == "ALLOW":
                return func(*args, **kwargs)
            if verdict == "BLOCK":
                return f"BLOCKED: {reason}".strip() if reason else "BLOCKED by Atbash policy."
            if verdict == "HOLD":
                parts = ["HELD for operator review."]
                if tool_call_id:
                    parts.append(f"tool_call_id={tool_call_id}.")
                if reason:
                    parts.append(f"Reason: {reason}")
                return " ".join(parts).strip()

            return f"Unexpected verdict from Atbash bridge: {data!r}"

        return wrapper

    return decorator
