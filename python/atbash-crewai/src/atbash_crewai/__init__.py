"""
Atbash safety guard for CrewAI tools (native Python SDK).

This package intentionally does NOT implement any signing logic.
It uses the native Python SDK (installed in the environment) via:

    from atbash import Atbash, AtbashAPIError
"""

from __future__ import annotations

import functools
import json
from collections.abc import Callable
from typing import Any, TypeVar, cast

from atbash import Atbash, AtbashAPIError

__all__ = ["with_atbash_guard"]

F = TypeVar("F", bound=Callable[..., Any])


def _safe_json(value: Any) -> str:
    try:
        return json.dumps(value, default=str)
    except Exception:
        return repr(value)


def _build_action_desc(func_name: str, args: tuple[Any, ...], kwargs: dict[str, Any]) -> str:
    """
    Build a stable, human-readable action string for the Atbash judge.

    Keep this descriptive and include key parameters, since it is what policy is evaluated against.
    """
    payload = {"function": func_name, "args": list(args), "kwargs": kwargs}
    return f"{func_name}({_safe_json(payload)})"


def with_atbash_guard(
    agent_privkey: str,
    endpoint: str | None = None,
) -> Callable[[F], F]:
    """
    Decorate a CrewAI tool function so each invocation is judged by Atbash before execution.

    Inputs to Atbash:
    - action_desc: derived from function name + args/kwargs
    - context: the tool's docstring (free-form description of intent)

    Verdict handling:
    - ALLOW: execute and return the original function result
    - BLOCK: do not execute; return a human-readable error string
    - HOLD: do not execute; return a human-readable review string (includes tool_call_id when present)
    """

    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            action_desc = _build_action_desc(func.__name__, args, kwargs)
            context = (func.__doc__ or "").strip()

            try:
                # Native SDK context manager: manages client lifecycle and keeps privkey local.
                if endpoint:
                    with Atbash(privkey=agent_privkey, endpoint=endpoint) as client:
                        result = client.judge_action(action=action_desc, context=context)
                else:
                    with Atbash(privkey=agent_privkey) as client:
                        result = client.judge_action(action=action_desc, context=context)

                verdict = str(getattr(result, "verdict", "")).upper()
                reason = str(getattr(result, "reason", "") or "")
                tool_call_id = str(getattr(result, "tool_call_id", "") or "")

                if verdict == "ALLOW":
                    return func(*args, **kwargs)

                if verdict == "BLOCK":
                    return f"BLOCKED: {reason}" if reason else "BLOCKED by Atbash policy."

                if verdict == "HOLD":
                    # `tool_call_id` is the operator-review handle.
                    msg = "HELD for operator review."
                    if tool_call_id:
                        msg += f" tool_call_id={tool_call_id}."
                    if reason:
                        msg += f" Reason: {reason}"
                    return msg

                return f"Unexpected verdict from Atbash: {verdict} (reason={reason})"

            except AtbashAPIError as exc:
                # Errors returned by the Atbash API (network, auth, server, etc.)
                return f"Atbash API error: {exc}"
            except Exception as exc:
                # Never crash the agent runtime on guard failures.
                return f"Atbash guard error: {exc}"

        return cast(F, wrapper)

    return decorator

