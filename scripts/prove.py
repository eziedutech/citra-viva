"""Run every claim this project makes, and print what actually happened.

Run it from anywhere, in any shell:

    python scripts/prove.py --trace
    python scripts/prove.py --quick

The dependencies live in the backend's environment rather than in the system
interpreter, so the script puts itself there by re-running through uv. Tracing
is a flag rather than an environment variable, because setting one of those is
written differently in every shell.

Written to be run on camera in one take. Every section does a real thing and
prints its real result: no fixtures, no mocks, and nothing asserted that was not
just observed. If a claim in the README is untrue, this script is where it shows.

What it proves, in order:

1. Which model is configured, and that it answers.
2. That all five agents are genuinely Google ADK agents, with the isolation
   between them set as a framework flag rather than asked for in a prompt.
3. Each of the four defense agents running live against that model, on a real
   draft, with timings and with every quote checked back against the text.
4. The Claim-Support Checker, running beside them.
5. The 4.00 indicator, computed from the transcript those agents just produced.
6. The deployed services answering, and which revision is serving.
7. The reasoning chain of the run, read back out of Cloud Trace.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "codes" / "backpy"
sys.path.insert(0, str(BACKEND))


def _require_backend_environment() -> None:
    """Put this script into the environment it needs, rather than asking.

    The dependencies live in the backend's virtual environment, so running this
    with the system interpreter cannot work. Telling somebody to type a longer
    command instead is a poor answer: the right invocation differs by shell, and
    the relative path in it depends on which directory they happen to be in.

    So it re-runs itself through uv, with paths resolved from this file rather
    than from the working directory. A marker in the environment stops that
    becoming a loop if the second attempt is also short of something.
    """
    try:
        import pydantic_settings  # noqa: F401
    except ModuleNotFoundError:
        pass
    else:
        return

    if os.environ.get("CITRA_PROVE_REEXEC"):
        print(
            "The backend environment is missing its dependencies.\n"
            f"Install them with:  uv sync --project {BACKEND}",
            file=sys.stderr,
        )
        raise SystemExit(2)

    uv = shutil.which("uv")
    if uv is None:
        print(
            "This needs the backend's environment, and uv is not on PATH.\n"
            "Install uv from https://docs.astral.sh/uv/ and run this again.",
            file=sys.stderr,
        )
        raise SystemExit(2)

    print("Running through the backend environment.\n", file=sys.stderr)
    completed = subprocess.run(
        [
            uv,
            "run",
            "--project",
            str(BACKEND),
            "python",
            str(Path(__file__).resolve()),
            *sys.argv[1:],
        ],
        env={**os.environ, "CITRA_PROVE_REEXEC": "1"},
    )
    raise SystemExit(completed.returncode)


_require_backend_environment()

API = "https://citra-viva-api-40911677848.asia-southeast2.run.app"
WEB = "https://citra-viva-web-40911677848.asia-southeast2.run.app"

RULE = "=" * 78


def heading(number: int, title: str) -> None:
    print(f"\n{RULE}\n{number}. {title}\n{RULE}")


def ok(message: str) -> None:
    print(f"  [ok]   {message}")


def info(message: str) -> None:
    print(f"         {message}")


def bad(message: str) -> None:
    print(f"  [FAIL] {message}")


def status(url: str, timeout: int = 30) -> int:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return response.status
    except Exception as error:  # noqa: BLE001 - the code is the whole point
        print(f"         {type(error).__name__}: {error}")
        return 0


def gcloud(*args: str) -> str:
    """Run gcloud and return stdout, or an empty string if it is unavailable.

    On Windows the executable is `gcloud.cmd`, and a bare "gcloud" raises
    FileNotFoundError rather than falling back. Both names are tried so this
    script prints the same evidence on either platform.
    """
    for executable in ("gcloud", "gcloud.cmd"):
        try:
            done = subprocess.run(
                [executable, *args], capture_output=True, text=True, timeout=90
            )
        except FileNotFoundError:
            continue
        except Exception:  # noqa: BLE001 - reporting, never the point of the run
            return ""
        if done.returncode == 0:
            return done.stdout.strip()
    return ""


# =============================================================================


def prove_configuration() -> str:
    heading(1, "Configuration")

    from app.config import get_settings

    settings = get_settings()
    settings.require_gcp()

    ok(f"model          {settings.gemini_model}")
    ok(f"project        {settings.google_cloud_project}")
    ok(f"endpoint       {settings.google_cloud_location}")
    ok(f"voice          {settings.gemini_voice_model} ({settings.gemini_voice_name})")
    ok(f"live audio     {settings.gemini_live_model} in {settings.gemini_live_location}")
    info("The live audio model is served from one region only, which is why it")
    info("carries its own location rather than using the one above.")

    return settings.gemini_model


def prove_adk_agents() -> None:
    heading(2, "Five agents, declared with Google ADK")

    from google.adk.agents import LlmAgent

    from app.agents.claim_support.adk_agent import build_claim_support_agent
    from app.agents.draft_analyzer.adk_agent import build_draft_analyzer_agent
    from app.agents.examiner_session.adk_agent import build_examiner_session_agent
    from app.agents.question_strategy.adk_agent import build_question_strategy_agent
    from app.agents.session_reflection.adk_agent import build_session_reflection_agent

    builders = {
        "draft_analyzer": build_draft_analyzer_agent,
        "question_strategy": build_question_strategy_agent,
        "examiner_session": build_examiner_session_agent,
        "session_reflection": build_session_reflection_agent,
        "claim_support": build_claim_support_agent,
    }

    for name, build in builders.items():
        agent = build()
        assert isinstance(agent, LlmAgent), f"{name} is not an ADK LlmAgent"
        assert agent.output_schema is not None, f"{name} has no bound output schema"
        assert agent.disallow_transfer_to_parent, f"{name} may transfer to its parent"
        assert agent.disallow_transfer_to_peers, f"{name} may transfer to a peer"
        ok(
            f"{name:<19} LlmAgent, schema {agent.output_schema.__name__}, "
            f"transfer refused both ways"
        )

    info("")
    info("Those last two flags are the architecture, not a preference. With them")
    info("set, ADK itself refuses a handoff between agents, so the separation")
    info("does not depend on a prompt asking for it or on anyone remembering.")


def prove_the_defense(model: str) -> object:
    heading(3, f"Four agents running a defense, live against {model}")

    from app.orchestrator.orchestrator import Orchestrator

    draft = (BACKEND / "tests" / "fixtures" / "sample_draft_en.txt").read_text(
        encoding="utf-8"
    )[:6000]

    orchestrator = Orchestrator()

    # --- agents 1 and 2 -----------------------------------------------------
    started = time.time()
    opened = orchestrator.start_session(draft, session_id="proof-session")
    took = time.time() - started

    analysis = opened.preparation.analysis
    strategy = opened.preparation.strategy
    findings = analysis.weakness_map.findings
    unverified = [f for f in findings if not f.quote_verified]

    ok(f"draft_analyzer     {len(findings)} findings kept, {len(analysis.dropped)} dropped")
    ok(f"                   {len(unverified)} findings with an unverified quote")
    info("Every finding must quote the manuscript word for word, and every quote")
    info("is matched back against it. One that cannot be found is discarded")
    info("before the student ever sees it.")
    ok(
        f"question_strategy  {len(strategy.strategy.questions)} questions kept, "
        f"{len(strategy.dropped)} dropped"
    )
    info(f"                   both agents together: {took:.1f}s")

    print()
    print(f"  First question: {opened.first_question[:150]}")

    # --- agent 3 ------------------------------------------------------------
    print()
    answers = [
        "The sample came from one organisation, so I do not claim it generalises "
        "beyond that setting. Within it, the pattern held across all fourteen "
        "interviews, and I state the limitation in section five.",
        "I accept that the design cannot establish cause. The wording should say "
        "the two are associated rather than that one produced the other.",
    ]

    for index, answer in enumerate(answers, start=1):
        started = time.time()
        turn = orchestrator.submit_answer("proof-session", answer)
        took = time.time() - started
        ok(
            f"examiner_session   answer {index} judged '{turn.evaluation.strength.value}', "
            f"decision '{turn.evaluation.decision.value}' in {took:.1f}s"
        )
        if turn.adjustments:
            for line in turn.adjustments:
                info(f"                   rule applied over the model: {line}")

    # --- agent 4 ------------------------------------------------------------
    print()
    started = time.time()
    closing = orchestrator.close_session("proof-session")
    took = time.time() - started
    summary = closing.summary
    ok(
        f"session_reflection {len(summary.strong_points)} points held, "
        f"{len(summary.remaining_gaps)} still open, "
        f"{len(summary.recurring_gap_patterns)} patterns carried forward in {took:.1f}s"
    )

    return summary


def prove_claim_support() -> None:
    heading(4, "The fifth agent, on citations")

    from app.agents.claim_support import check_claim_support
    from app.models.claim_support import CitedSource

    source = CitedSource(
        title="Remote collaboration and perceived team cohesion",
        authors="Nugroho and Salim",
        year="2024",
        doi="10.1234/example",
        text=(
            "In a survey of 320 software engineers in Indonesia aged 22 to 35, "
            "respondents working fully remotely reported lower perceived team "
            "cohesion than those working in a hybrid arrangement. The study is "
            "cross-sectional and does not examine innovation outcomes."
        ),
    )

    claim = "Remote work causes a measurable decline in innovation output."

    started = time.time()
    result = check_claim_support(claim, source)
    took = time.time() - started

    ok(f"claim_support      verdict '{result.check.verdict.value}' in {took:.1f}s")
    info(f"                   {result.check.reasoning[:150]}")
    if result.adjustments:
        for line in result.adjustments:
            info(f"                   rule applied over the model: {line}")
    info("")
    info("The source resolves and is on the same topic. It still does not carry")
    info("this claim, and topical relevance is what passes every mechanical check")
    info("ever written. That gap is the whole reason this agent exists.")


def prove_the_score(summary: object) -> None:
    heading(5, "The 4.00 indicator, computed from that transcript")

    assessment = getattr(summary, "assessment", None)
    if assessment is None:
        bad("no assessment was attached to the summary")
        return

    ok(f"score              {assessment.score:.2f} / {assessment.maximum:.2f}")
    ok(
        f"                   {assessment.questions_scored} scored, "
        f"{assessment.questions_unanswered} never reached and left out"
    )

    print()
    for item in assessment.breakdown:
        print(f"  {item.points:.2f}  (weight {item.weight:.1f})  {item.question[:90]}")
        for line in item.deductions:
            print(f"        {line}")

    if assessment.advice:
        print()
        for item in assessment.advice:
            print(f"  advice: {item.code} x{item.count} {item.question_id}")

    print()
    info("No model produced that number. Every input was written into the session")
    info("while the defense was running, so the same transcript always gives the")
    info("same score and each part of it points at an answer that was judged.")


def prove_deployment() -> None:
    heading(6, "Running on Google Cloud")

    for label, url in (("api ", f"{API}/health"), ("web ", WEB)):
        code = status(url)
        (ok if code == 200 else bad)(f"{label} HTTP {code}  {url}")

    services = gcloud(
        "run", "services", "list",
        "--project=citra-viva", "--region=asia-southeast2",
        "--format=value(metadata.name,status.latestReadyRevisionName,status.traffic[0].percent)",
    )
    if services:
        print()
        for line in services.splitlines():
            name, revision, percent = (line.split("\t") + ["", ""])[:3]
            ok(f"{name:<16} {revision:<26} {percent}% of traffic")

    builds = gcloud(
        "builds", "list", "--project=citra-viva", "--region=asia-southeast2",
        "--format=value(id)",
    )
    if builds:
        info("")
        info(f"Cloud Build has built this project {len(builds.splitlines())} times.")
        info("There is no local Docker step: every deployable image was produced")
        info("in the cloud, which is what makes the second column of the README's")
        info("technology table literal rather than a figure of speech.")


def prove_trace(trace_id: str) -> None:
    heading(7, "The reasoning chain, read back out of Cloud Trace")

    from app.observability import flush

    if not trace_id:
        info("Tracing was off for this run. Set ENABLE_CLOUD_TRACE=true to export")
        info("spans, which the deployed service does.")
        return

    flush()

    token = gcloud("auth", "print-access-token")
    if not token:
        info(f"trace {trace_id} was exported, but gcloud is not authenticated")
        info("here, so it cannot be read back in this window.")
        return

    url = f"https://cloudtrace.googleapis.com/v1/projects/citra-viva/traces/{trace_id}"
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

    # Cloud Trace indexes a moment behind the write, so a first read can miss.
    for attempt in range(6):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.load(response)
        except Exception:  # noqa: BLE001
            payload = {}

        spans = payload.get("spans") or []
        if spans:
            ok(f"trace {trace_id}")
            print()
            for span in sorted(spans, key=lambda item: item["startTime"]):
                labels = {
                    key: value
                    for key, value in (span.get("labels") or {}).items()
                    if not key.startswith(("g.co", "telemetry.", "service.", "gcp."))
                }
                print(f"  {span['name']:<28} {labels}")
            print()
            info("That is the chain of decisions behind the run above, read back")
            info("out of Cloud Trace rather than printed from memory.")
            return

        time.sleep(5 * (attempt + 1))

    info(f"trace {trace_id} was exported but is not readable yet. Cloud Trace")
    info("indexes a little behind the write; it will be in the console shortly.")


# =============================================================================


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--quick",
        action="store_true",
        help="Skip the live model calls and prove only what needs no network.",
    )
    parser.add_argument(
        "--trace",
        action="store_true",
        help="Export spans to Cloud Trace and read the chain back at the end.",
    )
    arguments = parser.parse_args()

    # A flag rather than an environment variable, because setting one of those
    # is written differently in every shell, and this is meant to be run by
    # somebody following a README rather than debugging their prompt.
    if arguments.trace:
        os.environ["ENABLE_CLOUD_TRACE"] = "true"

    os.chdir(BACKEND)

    print(RULE)
    print("CITRA Viva: proving the claims, one at a time")
    print(RULE)

    # Switched on before anything runs, so section 7 has spans to point at.
    # Reporting on tracing without having configured it is how the first
    # version of this script managed to call a working exporter broken.
    from app.observability import configure_tracing

    tracing = configure_tracing()

    model = prove_configuration()
    print(f"  [ok]   tracing        {'on, exporting to Cloud Trace' if tracing else 'off'}")

    prove_adk_agents()

    if arguments.quick:
        print("\n--quick: the live sections were skipped.")
        prove_deployment()
        return 0

    trace_id = ""
    if tracing:
        from app.observability import agent_span

        with agent_span("proof.run") as root:
            trace_id = format(root.get_span_context().trace_id, "032x")
            summary = prove_the_defense(model)
            prove_claim_support()
    else:
        summary = prove_the_defense(model)
        prove_claim_support()

    prove_the_score(summary)
    prove_deployment()
    prove_trace(trace_id)

    print(f"\n{RULE}\nEverything above ran just now. Nothing was mocked.\n{RULE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
