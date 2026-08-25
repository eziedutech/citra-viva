"""Claim-Support core logic. Pure Python, testable without a network.

Two rules are enforced here rather than trusted to the prompt, and both exist
for the same reason: this feature tells a student something about their own
citation, and being wrong about that is expensive in a way that being silent
is not.

* A verdict that the source supports the claim must point at the passage it
  rests on, and that passage must actually be in the source. A model asserting
  support it cannot locate is precisely the failure this feature exists to
  catch, so it is not allowed to commit that failure itself.
* A verdict that the citation does not hold must come with a question for the
  author. Marking a citation wrong with no way to answer is an accusation, and
  the student may have a reason no abstract could show.

Neither rule invents content. When one is broken the verdict falls to
`cannot_tell` and the reason is recorded, because "we could not settle this" is
honest and a manufactured judgment is not.
"""

from __future__ import annotations

from app.agents.claim_support.prompt import build_prompt
from app.common.text import parse_json_object, verify_quote
from app.llm.client import ModelRunner
from app.models.claim_support import (
    CitedSource,
    ClaimSupportCheck,
    ClaimSupportResult,
    SupportVerdict,
)
from app.observability import agent_span, record

MIN_CLAIM_CHARS = 15

_SUPPORTING = {SupportVerdict.SUPPORTS, SupportVerdict.PARTIALLY_SUPPORTS}
_NEGATIVE = {SupportVerdict.DOES_NOT_SUPPORT, SupportVerdict.UNRELATED}


def _coerce_verdict(value: object) -> SupportVerdict:
    """An unrecognized verdict becomes `cannot_tell`.

    Every other option asserts something about the student's citation. This one
    asserts nothing, which is the only safe place to land when the label itself
    cannot be trusted.
    """
    try:
        return SupportVerdict(str(value).strip().lower())
    except ValueError:
        return SupportVerdict.CANNOT_TELL


def build_check(data: dict, source: CitedSource, model_name: str = "") -> ClaimSupportResult:
    """Turn a raw model response into a validated support judgment."""
    adjustments: list[str] = []

    check = ClaimSupportCheck(
        verdict=_coerce_verdict(data.get("verdict")),
        reasoning=str(data.get("reasoning", "") or "").strip(),
        source_quote=str(data.get("source_quote", "") or "").strip(),
        scope_mismatch=str(data.get("scope_mismatch", "") or "").strip(),
        question_for_author=str(data.get("question_for_author", "") or "").strip(),
    )

    if check.source_quote:
        matched = verify_quote(check.source_quote, source.text)
        if matched is None:
            adjustments.append(
                f"The quoted passage is not in the source, so it was removed: "
                f"{check.source_quote[:70]!r}"
            )
            check.source_quote = ""
        else:
            check.source_quote = matched
            check.quote_verified = True

    if check.verdict in _SUPPORTING and not check.quote_verified:
        adjustments.append(
            f"{check.verdict.value} was downgraded to cannot_tell: a claim of support "
            "has to point at the passage it rests on."
        )
        check.verdict = SupportVerdict.CANNOT_TELL

    if check.verdict in _NEGATIVE and not check.question_for_author:
        adjustments.append(
            f"{check.verdict.value} was downgraded to cannot_tell: marking a citation "
            "wrong without asking the author is an accusation, not a check."
        )
        check.verdict = SupportVerdict.CANNOT_TELL

    if not check.reasoning:
        adjustments.append("The judgment carried no reasoning.")

    return ClaimSupportResult(check=check, adjustments=adjustments, model=model_name)


def check_claim_support(
    claim: str,
    source: CitedSource,
    runner: ModelRunner | None = None,
) -> ClaimSupportResult:
    """Judge whether `source` supports `claim`.

    `runner` can be injected for testing. When omitted, the real Gemini model on
    Agent Platform is used.
    """
    if not claim or len(claim.strip()) < MIN_CLAIM_CHARS:
        raise ValueError(f"The claim is too short to check (minimum {MIN_CLAIM_CHARS} characters).")
    if not source.text or not source.text.strip():
        raise ValueError(
            "No source text was supplied. A judgment with nothing to read would be "
            "a guess about a paper rather than a check of it."
        )

    model_name = ""
    if runner is None:
        from app.llm.client import GeminiRunner

        gemini = GeminiRunner()
        model_name = gemini.model
        runner = gemini

    meta = " · ".join(
        part
        for part in (
            f"Authors: {source.authors}" if source.authors else "",
            f"Year: {source.year}" if source.year else "",
            f"DOI: {source.doi}" if source.doi else "",
        )
        if part
    )
    prompt = build_prompt(claim.strip(), source.title, meta, source.text.strip())

    # Traced here rather than at the endpoint, because this agent is also
    # called directly, and a span that only exists on the HTTP path leaves the
    # fifth agent missing from a trace of a run that plainly included it.
    #
    # The attributes are the verdict and how many rules overrode it. Never the
    # claim itself and never the source text, for the same reason as everywhere
    # else here: a trace is readable by a wider audience than a session is.
    with agent_span(
        "agent.claim_support",
        claim_characters=len(claim.strip()),
        source_characters=len(source.text.strip()),
    ) as span:
        raw = runner(prompt=prompt, response_schema=ClaimSupportCheck)
        result = build_check(parse_json_object(raw), source, model_name)
        record(
            span,
            verdict=result.check.verdict.value,
            rules_applied=len(result.adjustments),
        )
        return result
