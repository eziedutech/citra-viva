"""Question Strategy core logic. Pure Python, testable without a network.

The validation discipline mirrors the Draft Analyzer's. There, a finding had to
be anchored to a real quote from the manuscript. Here, a question has to be
anchored to a real finding from the Weakness Map. A question that traces to
nothing cannot be justified to the student when they ask why it was asked, and
in a tool built around research integrity that is not an acceptable answer.
"""

from __future__ import annotations

import re

from app.agents.question_strategy.prompt import build_prompt
from app.common.text import normalize_text, parse_json_object
from app.llm.client import ModelRunner
from app.models.question_strategy import (
    PlannedQuestion,
    QuestionStrategy,
    QuestionType,
    StrategyResult,
)
from app.models.weakness_map import Severity, WeaknessMap

MAX_QUESTIONS = 10

_SEVERITY_ORDER = {Severity.HIGH: 0, Severity.MEDIUM: 1, Severity.LOW: 2}
_TYPE_ORDER = {
    QuestionType.OPENING: 0,
    QuestionType.PROBE: 1,
    QuestionType.METHODOLOGICAL: 1,
    QuestionType.CLOSING: 2,
}


def _coerce_question_type(value: object) -> QuestionType:
    """An unrecognized type becomes a probe, the neutral middle of a session.

    Guessing `opening` or `closing` would move the question to the edge of the
    plan and silently reorder an examination the model meant to sequence
    differently.
    """
    try:
        return QuestionType(str(value).strip().lower())
    except ValueError:
        return QuestionType.PROBE


def _mentions_recurring_gap(question: PlannedQuestion, gaps: list[str]) -> bool:
    """Lexical check for a question that revisits a gap from an earlier session.

    Recurring gaps are written by the Session Reflection Agent in prose, so an
    exact substring match almost never fires. Content words are compared
    instead, and half of a gap's distinctive words appearing in the question is
    treated as a hit.
    """
    haystack = set(re.findall(r"\w{5,}", normalize_text(f"{question.question} {question.intent}")))
    for gap in gaps:
        words = set(re.findall(r"\w{5,}", normalize_text(gap)))
        if words and len(words & haystack) / len(words) >= 0.5:
            return True
    return False


def _resolve_recurring_gap(item: dict, question: PlannedQuestion, gaps: list[str]) -> bool:
    """Decide whether a question targets an unresolved weakness from before.

    Unlike quote verification in the Draft Analyzer, this cannot be proven from
    the text: whether a question addresses a previously recorded gap is a
    semantic judgment. So the model's own assertion is accepted, with a lexical
    check as a second route to the same conclusion.

    The one thing that IS verifiable is enforced strictly: with no prior-session
    gaps supplied, no question can be targeting one, whatever the model claims.
    The flag only affects ordering, so a wrong answer costs a position in the
    sequence rather than a false accusation.
    """
    if not gaps:
        return False
    claimed = item.get("targets_recurring_gap")
    if isinstance(claimed, bool) and claimed:
        return True
    return _mentions_recurring_gap(question, gaps)


def _clean_questions(
    raw_questions: object,
    weakness_map: WeaknessMap,
    recurring_gaps: list[str],
) -> tuple[list[PlannedQuestion], list[str]]:
    questions: list[PlannedQuestion] = []
    dropped: list[str] = []

    if not isinstance(raw_questions, list):
        return questions, ["The model did not return a list of questions."]

    severity_by_finding = {f.id: f.severity for f in weakness_map.findings}
    seen: set[str] = set()
    raw_items: list[dict] = []

    for index, item in enumerate(raw_questions, start=1):
        label = f"question #{index}"
        if not isinstance(item, dict):
            dropped.append(f"{label}: not an object, dropped.")
            continue

        text = str(item.get("question", "") or "").strip()
        if not text:
            dropped.append(f"{label}: empty question text, dropped.")
            continue

        question_type = _coerce_question_type(item.get("question_type"))
        finding_id = str(item.get("finding_id", "") or "").strip()

        # Opening and closing questions address the work as a whole and are the
        # only ones allowed to stand without a finding behind them.
        anchored = question_type not in {QuestionType.OPENING, QuestionType.CLOSING}
        if anchored:
            if not finding_id:
                dropped.append(f"{label}: no finding_id on a probing question, dropped.")
                continue
            if finding_id not in severity_by_finding:
                dropped.append(
                    f"{label}: finding_id {finding_id!r} is not in the Weakness Map, dropped."
                )
                continue
        else:
            finding_id = ""

        dedupe_key = normalize_text(text)
        if dedupe_key in seen:
            dropped.append(f"{label}: duplicate question, dropped.")
            continue
        seen.add(dedupe_key)

        raw_items.append(item)
        questions.append(
            PlannedQuestion(
                id=str(item.get("id", "") or f"Q{index}"),
                finding_id=finding_id,
                question_type=question_type,
                question=text,
                intent=str(item.get("intent", "") or "").strip(),
                evaluation_criteria=str(item.get("evaluation_criteria", "") or "").strip(),
                follow_up_if_weak=str(item.get("follow_up_if_weak", "") or "").strip(),
            )
        )

    for item, question in zip(raw_items, questions, strict=True):
        question.targets_recurring_gap = _resolve_recurring_gap(item, question, recurring_gaps)

    def sort_key(question: PlannedQuestion) -> tuple[int, int, int]:
        severity = severity_by_finding.get(question.finding_id, Severity.LOW)
        return (
            _TYPE_ORDER[question.question_type],
            0 if question.targets_recurring_gap else 1,
            _SEVERITY_ORDER[severity],
        )

    questions.sort(key=sort_key)
    questions = questions[:MAX_QUESTIONS]
    for position, question in enumerate(questions, start=1):
        question.id = f"Q{position}"

    return questions, dropped


def build_strategy(
    data: dict,
    weakness_map: WeaknessMap,
    recurring_gaps: list[str] | None = None,
    model_name: str = "",
) -> StrategyResult:
    """Turn a raw model response into a validated question strategy."""
    gaps = recurring_gaps or []
    questions, dropped = _clean_questions(data.get("questions"), weakness_map, gaps)

    language = str(data.get("language", "") or weakness_map.language).strip().lower()
    if language not in {"id", "en"}:
        language = weakness_map.language

    strategy = QuestionStrategy(
        language=language,
        opening_remark=str(data.get("opening_remark", "") or "").strip(),
        questions=questions,
        strategy_note=str(data.get("strategy_note", "") or "").strip(),
    )
    return StrategyResult(strategy=strategy, dropped=dropped, model=model_name)


def plan_questions(
    weakness_map: WeaknessMap,
    recurring_gaps: list[str] | None = None,
    runner: ModelRunner | None = None,
) -> StrategyResult:
    """Plan an examination from a Weakness Map.

    `runner` can be injected for testing. When omitted, the real Gemini model on
    Agent Platform is used.
    """
    if not weakness_map.findings:
        raise ValueError(
            "The Weakness Map has no findings, so there is nothing to examine. "
            "Run the Draft Analyzer first."
        )

    gaps = recurring_gaps or []
    model_name = ""
    if runner is None:
        from app.llm.client import GeminiRunner

        gemini = GeminiRunner()
        model_name = gemini.model
        runner = gemini

    prompt = build_prompt(weakness_map.model_dump_json(indent=2), gaps)
    raw = runner(prompt=prompt, response_schema=QuestionStrategy)
    return build_strategy(parse_json_object(raw), weakness_map, gaps, model_name)
