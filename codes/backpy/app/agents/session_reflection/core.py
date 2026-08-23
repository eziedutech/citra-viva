"""Session Reflection core logic. Pure Python, testable without a network.

The invariant this module exists to protect: a gap the examiner recorded during
the session cannot vanish from the summary.

That is not a hypothetical failure. Summarizers smooth things over, and a
student who reads that a point is settled when the examiner recorded it as
undefended will walk into the real defense unprepared. So recorded gaps are
reconciled against the model's list, and anything missing is restored verbatim.
"""

from __future__ import annotations

from app.agents.session_reflection.prompt import build_prompt
from app.common.text import normalize_text, parse_json_object
from app.llm.client import ModelRunner
from app.models.session import SessionState, SessionSummary, TranscriptTurn

MAX_RECURRING_PATTERNS = 4


def _as_str_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    seen: set[str] = set()
    items: list[str] = []
    for entry in value:
        text = str(entry).strip()
        if not text:
            continue
        key = normalize_text(text)
        if key in seen:
            continue
        seen.add(key)
        items.append(text)
    return items


def format_transcript(turns: list[TranscriptTurn]) -> str:
    lines = []
    for turn in turns:
        speaker = "Examiner" if turn.role == "examiner" else "Student"
        marker = f" [{turn.question_id}]" if turn.question_id else ""
        lines.append(f"{speaker}{marker}: {turn.text}")
    return "\n".join(lines)


def collect_recorded_gaps(state: SessionState) -> list[str]:
    """Every gap the examiner recorded, in the order they were recorded."""
    return [p.gap_recorded for p in state.progress if p.gap_recorded]


def collect_defended_points(state: SessionState) -> list[str]:
    """Every rubric point the examiner judged satisfied, in order.

    The mirror image of `collect_recorded_gaps`, and written in the examiner's
    own words at the moment the point was conceded.
    """
    points: list[str] = []
    seen: set[str] = set()
    for progress in state.progress:
        for point in progress.defended_points:
            key = normalize_text(point)
            if key and key not in seen:
                seen.add(key)
                points.append(point)
    return points


def _restore_missing(
    reported: list[str], recorded: list[str], label: str
) -> tuple[list[str], list[str]]:
    """Put back any recorded item the model left out of its summary.

    Matching is lexical and loose on purpose: the model is expected to rephrase,
    and a rephrased item is fine. What is not fine is an item disappearing.
    """
    adjustments: list[str] = []
    reported_words = [set(normalize_text(item).split()) for item in reported]

    for item in recorded:
        item_words = {word for word in normalize_text(item).split() if len(word) >= 5}
        if not item_words:
            continue
        covered = any(len(item_words & words) / len(item_words) >= 0.4 for words in reported_words)
        if not covered:
            reported.append(item)
            adjustments.append(
                f"{label} recorded during the session was missing from the summary "
                f"and was restored: {item[:70]!r}"
            )
    return reported, adjustments


def build_summary(data: dict, state: SessionState) -> tuple[SessionSummary, list[str]]:
    """Turn a raw model response into a validated session summary."""
    adjustments: list[str] = []

    strong_points = _as_str_list(data.get("strong_points"))
    remaining_gaps = _as_str_list(data.get("remaining_gaps"))
    patterns = _as_str_list(data.get("recurring_gap_patterns"))

    # Reconciliation runs in both directions, because a summary that contradicts
    # its own transcript is wrong whichever way it leans.
    #
    # Understating is the more dangerous direction, so it is handled first: a
    # student who is told nothing held will not trust the report that tells them
    # what did not.
    defended = collect_defended_points(state)
    held = any(p.final_strength in {"strong", "partial"} for p in state.progress)

    if held:
        strong_points, restored_points = _restore_missing(
            strong_points, defended, "A point defended successfully"
        )
        adjustments.extend(restored_points)
        if not strong_points:
            adjustments.append(
                "The session recorded answers that held, but neither the summary nor "
                "the examiner's own notes named a point to credit."
            )
    elif strong_points:
        # Overstating is the other direction. If no answer held, a list of
        # strengths is flattery, and flattery here is a false readiness signal.
        adjustments.append(
            "strong_points were dropped: no answer in this session was judged strong or partial."
        )
        strong_points = []

    recorded = collect_recorded_gaps(state)
    remaining_gaps, restored = _restore_missing(remaining_gaps, recorded, "A gap")
    adjustments.extend(restored)

    if len(patterns) > MAX_RECURRING_PATTERNS:
        adjustments.append(
            f"recurring_gap_patterns trimmed from {len(patterns)} to "
            f"{MAX_RECURRING_PATTERNS}: a pattern list that covers everything "
            "identifies nothing."
        )
        patterns = patterns[:MAX_RECURRING_PATTERNS]

    summary = SessionSummary(
        strong_points=strong_points,
        remaining_gaps=remaining_gaps,
        recurring_gap_patterns=patterns,
        closing_remark=str(data.get("closing_remark", "") or "").strip(),
    )
    return summary, adjustments


def reflect_on_session(
    state: SessionState, runner: ModelRunner | None = None
) -> tuple[SessionSummary, list[str]]:
    """Summarize a finished session and extract patterns for the next one."""
    if not state.transcript:
        raise ValueError("The session has an empty transcript, so there is nothing to reflect on.")

    if runner is None:
        from app.llm.client import GeminiRunner

        runner = GeminiRunner()

    prompt = build_prompt(
        language=state.language,
        transcript=format_transcript(state.transcript),
        recorded_gaps=collect_recorded_gaps(state),
        defended_points=collect_defended_points(state),
    )
    raw = runner(prompt=prompt, response_schema=SessionSummary)
    return build_summary(parse_json_object(raw), state)
