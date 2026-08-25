"""Watch the deployed service work, while you use it in the browser.

    python scripts/watch.py

This is the companion to prove.py and answers a different question. prove.py
runs its own session against your local code to show that the claims hold.
This shows the session you are running right now, in the deployed service, as
it happens: which agent ran, what it kept, what it discarded, and what the
examiner decided.

Standard library only, so it needs nothing installed. It shells out to gcloud,
which you are already authenticated with.

Made for recording: one command, one continuous stream, no dialogue boxes and
no console tabs. Put it beside the browser and drive the application.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from datetime import UTC, datetime, timedelta

PROJECT = "citra-viva"
SERVICE = "citra-viva-api"

# What is worth showing. Everything else the service logs is either a health
# check or a line about the framework, and neither is what somebody watching
# a defense wants on screen.
INTERESTING = (
    "draft_analyzer",
    "question_strategy",
    "examiner_session",
    "session_reflection",
    "claim_support",
    "deleted",
    "Tracing is",
    "Refused",
    "could not",
    "failed",
)

LABELS = {
    "draft_analyzer": ("1", "reads the manuscript, maps where it gives way"),
    "question_strategy": ("2", "turns that map into an examination"),
    "examiner_session": ("3", "judges the answer, decides what to ask next"),
    "session_reflection": ("4", "writes the report from the transcript"),
    "claim_support": ("5", "does this source carry this claim"),
}


def gcloud(*args: str) -> str:
    """Run gcloud, on either platform, and return stdout."""
    for executable in ("gcloud", "gcloud.cmd"):
        try:
            done = subprocess.run(
                [executable, *args], capture_output=True, text=True, timeout=120
            )
        except FileNotFoundError:
            continue
        except Exception:  # noqa: BLE001 - a watcher never takes the run down
            return ""
        if done.returncode == 0:
            return done.stdout.strip()
        return ""
    print(
        "gcloud is not on PATH. Install the Google Cloud SDK and sign in with\n"
        "  gcloud auth login",
        file=sys.stderr,
    )
    raise SystemExit(2)


def recent(since: datetime) -> list[dict]:
    """Entries written since a moment, oldest first."""
    stamp = since.strftime("%Y-%m-%dT%H:%M:%SZ")
    raw = gcloud(
        "logging",
        "read",
        f'resource.type="cloud_run_revision" '
        f'AND resource.labels.service_name="{SERVICE}" '
        f'AND timestamp>="{stamp}"',
        f"--project={PROJECT}",
        "--limit=200",
        "--format=json",
    )
    if not raw:
        return []
    try:
        entries = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return list(reversed(entries))


def describe(text: str) -> str | None:
    """One line for the screen, or None when it is not worth showing."""
    if not any(word in text for word in INTERESTING):
        return None

    # Strip the logging prefix, which is the same on every line and says
    # nothing anyone watching needs.
    message = text.split(":", 2)[-1].strip() if text.startswith("INFO:") else text.strip()

    for name, (number, role) in LABELS.items():
        if name in message:
            return f"  agent {number}  {name:<19} {message.split(':', 1)[-1].strip()}"

    return f"           {message}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--seconds",
        type=int,
        default=5,
        help="How often to look for new entries. Default 5.",
    )
    parser.add_argument(
        "--since",
        type=int,
        default=2,
        help="Minutes of history to show before waiting. Default 2.",
    )
    arguments = parser.parse_args()

    if shutil.which("gcloud") is None and shutil.which("gcloud.cmd") is None:
        print("gcloud is not on PATH.", file=sys.stderr)
        return 2

    print("=" * 78)
    print(f"Watching {SERVICE}. Drive the application in your browser.")
    print("Each line below is the deployed service reporting what an agent did.")
    print("=" * 78)

    seen: set[str] = set()
    cursor = datetime.now(UTC) - timedelta(minutes=arguments.since)

    try:
        while True:
            for entry in recent(cursor):
                identifier = entry.get("insertId", "")
                if not identifier or identifier in seen:
                    continue
                seen.add(identifier)

                text = entry.get("textPayload") or ""
                line = describe(text)
                if line is None:
                    continue

                when = (entry.get("timestamp") or "")[11:19]
                print(f"{when}{line}", flush=True)

            # Overlapped rather than advanced to now, because an entry written
            # while the previous query was in flight would otherwise fall in
            # the gap between two windows and never be shown. Duplicates are
            # already handled by the ids.
            cursor = datetime.now(UTC) - timedelta(seconds=arguments.seconds * 3)
            time.sleep(arguments.seconds)

    except KeyboardInterrupt:
        print("\nStopped.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
