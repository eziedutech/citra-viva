"""Run a full mock defense in the terminal, against the real model.

Two modes:

    Interactive, you answer as the student:
        uv run python ../../scripts/run_viva_session.py tests/fixtures/sample_draft_id.txt

    Scripted, answers come from a file so a recording is repeatable:
        uv run python ../../scripts/run_viva_session.py tests/fixtures/sample_draft_id.txt \
            --answers tests/fixtures/scripted_answers_id.json

Run both from `codes/backpy`. Sessions are kept in memory here; the API uses
Firestore. Add --gaps to simulate a second session that remembers the first.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1] / "codes" / "backpy"
sys.path.insert(0, str(BACKEND_ROOT))

from app.orchestrator.orchestrator import Orchestrator  # noqa: E402

RULE = "=" * 78
THIN = "-" * 78


def show_preparation(preparation) -> None:
    weakness_map = preparation.analysis.weakness_map
    strategy = preparation.strategy.strategy

    print(f"\n{RULE}\nPREPARATION\n{RULE}")
    print(f"Language     : {weakness_map.language}")
    print(f"Design       : {weakness_map.summary.design_type}")
    print(
        f"Findings     : {len(weakness_map.findings)} kept, "
        f"{len(preparation.analysis.dropped)} rejected in validation"
    )
    print(
        f"Questions    : {len(strategy.questions)} planned, "
        f"{len(preparation.strategy.dropped)} rejected in validation"
    )

    print(f"\n{THIN}\nWEAKNESS MAP\n{THIN}")
    for finding in weakness_map.findings:
        print(f"\n[{finding.severity.value.upper():6}] {finding.id} | {finding.category.value}")
        print(f'  quote : "{finding.quote}"')
        print(f"  weak  : {finding.why_weak}")

    for reason in preparation.analysis.dropped:
        print(f"\n  REJECTED {reason}")
    for reason in preparation.strategy.dropped:
        print(f"\n  REJECTED {reason}")


# When a scripted run exhausts its answers, the student keeps replying with this.
# Real students do run dry, the examiner has to cope with it, and the run reaches
# its closing report instead of stopping halfway.
SCRIPT_EXHAUSTED = "Saya tidak memiliki tambahan penjelasan untuk poin tersebut."


def read_answer(index: int, scripted: list[str] | None) -> str | None:
    """Next answer, from the script or from the person at the keyboard."""
    if scripted is not None:
        answer = scripted[index] if index < len(scripted) else SCRIPT_EXHAUSTED
        print(f"\nSTUDENT: {answer}")
        return answer

    try:
        answer = input("\nSTUDENT: ").strip()
    except (EOFError, KeyboardInterrupt):
        return None
    return answer or None


def main() -> int:
    parser = argparse.ArgumentParser(description="CITRA Viva mock defense")
    parser.add_argument("draft_file", type=Path, help="A .txt file holding a research draft")
    parser.add_argument(
        "--answers", type=Path, default=None, help="JSON file of scripted student answers"
    )
    parser.add_argument(
        "--gaps",
        nargs="*",
        default=None,
        help="Unresolved gaps from an earlier session, to simulate a repeat defense",
    )
    args = parser.parse_args()

    if not args.draft_file.exists():
        print(f"File not found: {args.draft_file}", file=sys.stderr)
        return 1

    scripted: list[str] | None = None
    if args.answers:
        if not args.answers.exists():
            print(f"File not found: {args.answers}", file=sys.stderr)
            return 1
        scripted = json.loads(args.answers.read_text(encoding="utf-8"))["answers"]

    draft_text = args.draft_file.read_text(encoding="utf-8")
    orchestrator = Orchestrator()

    print(f"Reading {args.draft_file.name} ({len(draft_text)} characters)...")
    if args.gaps:
        print(f"Carrying {len(args.gaps)} unresolved gaps from an earlier session.")

    try:
        start = orchestrator.start_session(draft_text, recurring_gaps=args.gaps)
    except RuntimeError as error:
        print(f"\nThe model is unavailable, so no session was started: {error}")
        return 2
    show_preparation(start.preparation)

    print(f"\n{RULE}\nDEFENSE SESSION\n{RULE}")
    if start.opening_remark:
        print(f"\nEXAMINER: {start.opening_remark}")
    print(f"\nEXAMINER [{start.question_id}]: {start.first_question}")

    index = 0
    finished = False
    while not finished:
        answer = read_answer(index, scripted)
        if answer is None:
            print("\nSession interrupted. State is saved and can be resumed.")
            break
        index += 1

        try:
            turn = orchestrator.submit_answer(start.session_id, answer)
        except RuntimeError as error:
            # A live recording must never show a traceback. The session state is
            # already on disk, so the run can be picked up where it stopped.
            print(f"\n  [the model is unavailable: {error}]")
            print("  [session state is saved; resume once quota recovers]")
            return 2
        decision = turn.evaluation.decision.value
        strength = turn.evaluation.strength.value

        print(f"\n  [judgment: {strength} -> {decision}]")
        if turn.evaluation.criteria_missed:
            for missed in turn.evaluation.criteria_missed:
                print(f"  [missed: {missed}]")
        for note in turn.adjustments:
            print(f"  [rule applied: {note}]")

        label = turn.next_question_id or turn.question_id
        print(f"\nEXAMINER [{label}]: {turn.examiner_says}")
        finished = turn.finished

    if not finished:
        return 0

    try:
        closing = orchestrator.close_session(start.session_id)
    except RuntimeError as error:
        print(f"\n  [the model is unavailable, so no report was written: {error}]")
        print("  [the transcript is saved and the session can be closed later]")
        return 2
    summary = closing.summary

    print(f"\n{RULE}\nSESSION REPORT\n{RULE}")
    if summary.strong_points:
        print("\nDefended successfully:")
        for point in summary.strong_points:
            print(f"  + {point}")
    else:
        print("\nDefended successfully: nothing held up in this session.")

    print("\nStill undefended:")
    for gap in summary.remaining_gaps or ["(none recorded)"]:
        print(f"  - {gap}")

    print("\nRecurring patterns carried to the next session:")
    for pattern in summary.recurring_gap_patterns or ["(none identified)"]:
        print(f"  * {pattern}")

    if summary.closing_remark:
        print(f"\nEXAMINER: {summary.closing_remark}")

    for note in closing.adjustments:
        print(f"\n  [rule applied: {note}]")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
