"""Run one CITRA Viva agent through the Agent Development Kit, for real.

The four defense agents and the citation checker each exist twice: as a pure
core the API calls directly, and as an ADK `LlmAgent` the framework can run.
Both routes share the same prompt and the same validation, which is the point,
but a claim like that is worth nothing unless somebody executes the second route
and watches it come out the same.

This does that. It builds the ADK agent, runs it through an ADK `Runner` against
the live model, reads the result out of ADK session state, and puts it through
the same validation the direct path uses. What it prints is what survived, and
what was thrown away for failing verification.

    cd codes/backpy
    uv sync --extra adk
    uv run python ../../scripts/run_adk_agent.py --agent draft_analyzer

Requires credentials, and costs a model call. Everything it exercises is also
covered offline in `tests/test_adk_agents.py`; this is the end-to-end proof, not
the safety net.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "codes" / "backpy"
sys.path.insert(0, str(BACKEND))

APP_NAME = "citra_viva_adk"
USER_ID = "adk-check"

SAMPLE_DRAFT = """
BAB I PENDAHULUAN
Penelitian ini meneliti hubungan antara jam belajar mandiri dengan nilai ujian akhir
mahasiswa. Jam belajar mandiri jelas merupakan penentu utama keberhasilan akademik.

BAB III METODOLOGI
Desain penelitian adalah survei potong lintang terhadap 90 mahasiswa satu angkatan
yang dipilih secara sukarela. Data dikumpulkan melalui kuesioner daring.

BAB IV HASIL
Hasil menunjukkan korelasi positif yang signifikan antara jam belajar dan nilai ujian.
Temuan ini membuktikan bahwa menambah jam belajar mandiri meningkatkan nilai ujian
mahasiswa di seluruh Indonesia.
"""


async def run_draft_analyzer(draft_text: str) -> None:
    from google.adk.runners import InMemoryRunner
    from google.genai import types

    from app.agents.draft_analyzer.adk_agent import (
        AGENT_NAME,
        build_draft_analyzer_agent,
        finalize_agent_output,
    )
    from app.agents.draft_analyzer.prompt import build_user_message
    from app.llm.adk_env import configure_adk_environment

    # ADK builds its own client from the process environment, and this project
    # keeps its configuration in a .env file that never reaches os.environ.
    # Without this, an agent in a fully configured project reports that no API
    # key was provided, because it fell back to the Gemini Developer API.
    environment = configure_adk_environment()

    agent = build_draft_analyzer_agent()
    print(f"agent          : {agent.name}")
    print(f"model          : {agent.model}")
    print(f"output schema  : {agent.output_schema.__name__}")
    print(
        "transfers      : "
        f"parent={not agent.disallow_transfer_to_parent}, "
        f"peers={not agent.disallow_transfer_to_peers}"
    )
    print(f"project        : {environment['GOOGLE_CLOUD_PROJECT']}")
    print(f"location       : {environment['GOOGLE_CLOUD_LOCATION']}")
    print(f"agent platform : {environment['GOOGLE_GENAI_USE_VERTEXAI']}")
    print()

    runner = InMemoryRunner(agent=agent, app_name=APP_NAME)
    session = await runner.session_service.create_session(app_name=APP_NAME, user_id=USER_ID)

    message = types.Content(role="user", parts=[types.Part(text=build_user_message(draft_text))])

    print("running through ADK ...")
    async for event in runner.run_async(
        user_id=USER_ID, session_id=session.id, new_message=message
    ):
        if event.error_message:
            raise RuntimeError(f"ADK reported: {event.error_message}")

    finished = await runner.session_service.get_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=session.id
    )
    if finished is None:
        raise RuntimeError("The ADK session disappeared before its state could be read.")

    # The same validation the direct path runs. An output schema guarantees
    # shape; only this checks that a quoted sentence is really in the draft.
    result = finalize_agent_output(dict(finished.state), draft_text)

    print()
    print(f"findings kept  : {len(result.weakness_map.findings)}")
    for finding in result.weakness_map.findings:
        print(f"  {finding.id} [{finding.severity}] {finding.category}")
        print(f"     quote verified: {finding.quote_verified}")
        print(f"     {finding.quote[:96]}")

    if result.dropped:
        print()
        print(f"dropped        : {len(result.dropped)}")
        for reason in result.dropped:
            print(f"  {reason}")
    else:
        print()
        print("dropped        : none")

    print()
    print(f"agent name in ADK state: {AGENT_NAME}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--agent",
        default="draft_analyzer",
        choices=["draft_analyzer"],
        help="Which agent to run. Only the analyzer runs standalone; the others "
        "need a session or a source to judge, which the API supplies.",
    )
    parser.add_argument(
        "--file",
        type=Path,
        help="A manuscript to analyse. The built-in sample is used when omitted.",
    )
    args = parser.parse_args()

    draft_text = args.file.read_text(encoding="utf-8") if args.file else SAMPLE_DRAFT

    try:
        asyncio.run(run_draft_analyzer(draft_text))
    except KeyboardInterrupt:
        print("\nStopped.")
        return 130
    except Exception as error:  # noqa: BLE001 - a CLI reports, it does not raise
        print(f"\nFailed: {error}", file=sys.stderr)
        print(
            "\nCheck that ADK is installed (uv sync --extra adk), that credentials "
            "are present (gcloud auth application-default login), and that "
            "GOOGLE_CLOUD_LOCATION is set to global in .env.",
            file=sys.stderr,
        )
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
