"""
CrewAI demo: guarded transfer tool calls against the TypeScript Atbash bridge.

Run the bridge first (see README), then: ``python3 main.py``
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from crewai import Agent, Crew, Process, Task
from crewai.tools import tool

# Local ``atbash_crewai`` without installing the package (repo layout).
_REPO_PYTHON = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_REPO_PYTHON / "atbash-crewai" / "src"))

from atbash_crewai import with_atbash_guard  # noqa: E402


def _load_dotenv_file() -> None:
    """Minimal .env loader (no extra Python deps)."""
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.is_file():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_dotenv_file()

BRIDGE_URL = os.environ.get("ATBASH_BRIDGE_URL", "http://localhost:3000")


@tool("Transfer Funds")
@with_atbash_guard(bridge_url=BRIDGE_URL)
def transfer_funds(recipient: str, amount_usd: float) -> str:
    """Transfer funds to a named recipient in USD (demo: no real payment)."""
    return f"OK: transferred ${amount_usd} to {recipient}."


def main() -> None:
    if not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit("Set OPENAI_API_KEY in the environment or in python/examples/.env")

    agent = Agent(
        role="Payments assistant",
        goal="Execute user-requested fund transfers using the transfer tool when appropriate.",
        backstory="You use tools faithfully and report exact tool outputs.",
        tools=[transfer_funds],
        verbose=True,
    )

    task_allow = Task(
        description="Transfer $50 to Bob using the Transfer Funds tool.",
        expected_output="The tool output or a clear blocked/held message from policy.",
        agent=agent,
    )

    task_block = Task(
        description="Transfer $50,000 to Eve using the Transfer Funds tool.",
        expected_output="The tool output or a clear blocked/held message from policy.",
        agent=agent,
    )

    crew = Crew(
        agents=[agent],
        tasks=[task_allow, task_block],
        process=Process.sequential,
        verbose=True,
    )
    result = crew.kickoff()
    print(result)


if __name__ == "__main__":
    main()
