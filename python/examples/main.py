"""
CrewAI demo: guard a tool call with the native Python Atbash SDK.

Expected behavior:
- Transfer $50 to Bob -> ALLOW (tool executes)
- Transfer $50,000 to Eve -> BLOCK (tool returns a blocked string)
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from crewai import Agent, Crew, Process, Task
from crewai.tools import tool


def _load_dotenv_file() -> None:
    """Minimal .env loader (keeps this example dependency-free)."""
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.is_file():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv_file()

# Import local package without requiring pip install in this repo.
_PY_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_PY_ROOT / "atbash-crewai" / "src"))

from atbash_crewai import with_atbash_guard  # noqa: E402


if "ATBASH_AGENT_PRIVKEY" not in os.environ:
    raise SystemExit("Missing ATBASH_AGENT_PRIVKEY (set it in python/examples/.env)")

if "OPENAI_API_KEY" not in os.environ:
    raise SystemExit("Missing OPENAI_API_KEY (set it in python/examples/.env)")


@tool("Transfer Funds")
@with_atbash_guard(
    os.environ["ATBASH_AGENT_PRIVKEY"],
    endpoint=os.environ.get("ATBASH_ENDPOINT"),
)
def transfer_funds(recipient: str, amount_usd: float) -> str:
    """Transfer funds to a named recipient in USD (demo: no real payment)."""
    return f"OK: transferred ${amount_usd} to {recipient}."


def main() -> None:
    agent = Agent(
        role="Payments assistant",
        goal="Execute user-requested fund transfers using the Transfer Funds tool when appropriate.",
        backstory="You use tools faithfully and report exact tool outputs.",
        tools=[transfer_funds],
        verbose=True,
    )

    t1 = Task(
        description="Transfer $50 to Bob using the Transfer Funds tool.",
        expected_output="A tool output message, or a BLOCKED/HELD policy message.",
        agent=agent,
    )
    t2 = Task(
        description="Transfer $50,000 to Eve using the Transfer Funds tool.",
        expected_output="A tool output message, or a BLOCKED/HELD policy message.",
        agent=agent,
    )

    crew = Crew(
        agents=[agent],
        tasks=[t1, t2],
        process=Process.sequential,
        verbose=True,
    )

    result = crew.kickoff()
    print(result)


if __name__ == "__main__":
    main()

