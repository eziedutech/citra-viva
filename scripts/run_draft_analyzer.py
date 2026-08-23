"""Run the Draft Analyzer over a text file and print the Weakness Map.

This is an inspection and demo tool, not part of the application. Use it to look
at finding quality without starting the server.

Usage, from the repository root:

    cd codes/backpy
    uv run python ../../scripts/run_draft_analyzer.py tests/fixtures/sample_draft_id.txt

Pass --json for the raw JSON output.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1] / "codes" / "backpy"
sys.path.insert(0, str(BACKEND_ROOT))

from app.agents.draft_analyzer import analyze_draft  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="CITRA Viva Draft Analyzer")
    parser.add_argument("draft_file", type=Path, help="A .txt file holding a research draft")
    parser.add_argument("--json", action="store_true", help="Print raw JSON")
    args = parser.parse_args()

    if not args.draft_file.exists():
        print(f"File not found: {args.draft_file}", file=sys.stderr)
        return 1

    draft_text = args.draft_file.read_text(encoding="utf-8")
    print(f"Analyzing {args.draft_file.name} ({len(draft_text)} characters)...\n")

    result = analyze_draft(draft_text)

    if args.json:
        print(result.model_dump_json(indent=2))
        return 0

    weakness_map = result.weakness_map
    summary = weakness_map.summary

    print(f"Model      : {result.model}")
    print(f"Language   : {weakness_map.language}")
    print(f"Design     : {summary.design_type}")
    print(f"Question   : {summary.research_question}")
    print(f"Methodology: {summary.methodology}")
    if summary.stated_limitations:
        print("Limitations the author already states:")
        for item in summary.stated_limitations:
            print(f"  - {item}")

    print(f"\n{'=' * 78}")
    print(f"WEAKNESS MAP: {len(weakness_map.findings)} findings")
    print("=" * 78)

    for finding in weakness_map.findings:
        print(
            f"\n[{finding.severity.value.upper():6}] {finding.id} | "
            f"{finding.category.value} | {finding.section}"
        )
        print(f'  Quote  : "{finding.quote}"')
        print(f"  Weak   : {finding.why_weak}")
        print(f"  Angle  : {finding.examiner_angle}")

    if weakness_map.coverage_note:
        print(f"\nCoverage note: {weakness_map.coverage_note}")

    if result.dropped:
        print(f"\n{'-' * 78}")
        print(f"Rejected during validation ({len(result.dropped)}):")
        for reason in result.dropped:
            print(f"  - {reason}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
