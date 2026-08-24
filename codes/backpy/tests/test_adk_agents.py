"""The ADK path, exercised rather than asserted in a README.

Five ADK agent definitions sat in this repository for weeks without a single
test touching them. They were valid, as it turns out, but nothing proved that,
and code nobody runs is code nobody can rely on. For a system whose architecture
is the claim being made, an unexercised framework layer is the weakest part of
the submission rather than the strongest.

Two things are pinned here.

The first is configuration. Every agent must refuse transfer to its parent and
to its peers, which is what makes the separation of concerns a property of the
framework rather than a habit of whoever writes the next orchestrator. Every
agent must carry a structured output schema, and therefore no tools, which ADK
requires and which suits agents that only ever produce a judgment.

The second matters more. Output bound to a schema is well shaped, and well
shaped is not the same as honest: a quote can still be one the student never
wrote, a question can still cite a finding that does not exist, and a summary can
still drop a gap that was recorded. So each agent's ADK output is put through
the same validation the direct path uses, and the tests below prove it by
feeding the ADK route material that should be refused and watching it be
refused. If those two routes ever diverge, these fail.
"""

from __future__ import annotations

import json

import pytest

pytest.importorskip("google.adk.agents", reason="ADK is a dev dependency: uv sync --extra adk")

from app.agents.claim_support.adk_agent import (  # noqa: E402
    build_claim_support_agent,
)
from app.agents.claim_support.adk_agent import (
    finalize_agent_output as finalize_claim,  # noqa: E402
)
from app.agents.draft_analyzer.adk_agent import (  # noqa: E402
    build_draft_analyzer_agent,
)
from app.agents.draft_analyzer.adk_agent import (
    finalize_agent_output as finalize_analysis,  # noqa: E402
)
from app.agents.examiner_session.adk_agent import (  # noqa: E402
    build_examiner_session_agent,
)
from app.agents.examiner_session.adk_agent import (
    finalize_agent_output as finalize_evaluation,  # noqa: E402
)
from app.agents.question_strategy.adk_agent import (  # noqa: E402
    build_question_strategy_agent,
)
from app.agents.question_strategy.adk_agent import (
    finalize_agent_output as finalize_strategy,  # noqa: E402
)
from app.agents.session_reflection.adk_agent import (  # noqa: E402
    build_session_reflection_agent,
)
from app.agents.session_reflection.adk_agent import (
    finalize_agent_output as finalize_summary,  # noqa: E402
)
from app.models.claim_support import CitedSource  # noqa: E402
from app.models.session import (  # noqa: E402
    AnswerStrength,
    ExaminerDecision,
    QuestionProgress,
    SessionState,
)
from app.models.weakness_map import WeaknessMap  # noqa: E402
from tests.test_session_loop import (  # noqa: E402
    ANALYSIS_PAYLOAD,
    DRAFT,
    REFLECTION_PAYLOAD,
    STRATEGY_PAYLOAD,
)

AGENTS = [
    ("draft_analyzer", build_draft_analyzer_agent, "weakness_map_raw"),
    ("question_strategy", build_question_strategy_agent, "question_strategy_raw"),
    ("examiner_session", build_examiner_session_agent, "answer_evaluation_raw"),
    ("session_reflection", build_session_reflection_agent, "session_summary_raw"),
    ("claim_support_checker", build_claim_support_agent, "claim_support_raw"),
]


# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize(("name", "build", "output_key"), AGENTS)
def test_every_agent_is_a_real_adk_agent(name, build, output_key):
    from google.adk.agents import LlmAgent

    agent = build()

    assert isinstance(agent, LlmAgent)
    assert agent.name == name
    assert agent.output_key == output_key
    assert agent.instruction, "An agent with no instruction has no behaviour."


@pytest.mark.parametrize(("name", "build", "output_key"), AGENTS)
def test_no_agent_may_hand_control_to_another(name, build, output_key):
    """The separation of concerns, enforced by the framework rather than asked for.

    Without these two flags, nothing but the discipline of whoever writes the
    next orchestrator stops the Draft Analyzer from transferring to the Examiner
    and answering its own findings.
    """
    agent = build()

    assert agent.disallow_transfer_to_parent is True
    assert agent.disallow_transfer_to_peers is True


@pytest.mark.parametrize(("name", "build", "output_key"), AGENTS)
def test_every_agent_returns_a_structured_judgment_and_holds_no_tools(name, build, output_key):
    """ADK forbids tools alongside an output schema, and that suits these agents.

    None of them acts on the world. Each one reads and judges, and the judgment
    is the whole output, so the restriction costs nothing here.
    """
    agent = build()

    assert agent.output_schema is not None
    assert not agent.tools


def test_the_agents_are_distinct():
    """Two agents sharing a name or an output key would overwrite each other."""
    names = [agent[0] for agent in AGENTS]
    keys = [agent[2] for agent in AGENTS]

    assert len(set(names)) == len(names)
    assert len(set(keys)) == len(keys)


# --------------------------------------------------------------------------- #
# The rules survive the ADK route
# --------------------------------------------------------------------------- #


def test_a_quote_that_is_not_in_the_draft_is_dropped_on_the_adk_path_too():
    """The rule the whole product rests on, checked on the second route.

    A finding quoting a sentence the student never wrote is an accusation, and
    an output schema cannot catch it: the shape is perfect and the content is
    invented.
    """
    payload = json.loads(json.dumps(ANALYSIS_PAYLOAD))
    payload["findings"].append(
        {
            "id": "W3",
            "category": "overgeneralization",
            "severity": "high",
            "section": "Hasil",
            "quote": "Kalimat ini tidak pernah ditulis oleh mahasiswa mana pun.",
            "why_weak": "Karangan.",
            "examiner_angle": "Tidak relevan.",
        }
    )

    result = finalize_analysis({"weakness_map_raw": payload}, DRAFT)

    assert "W3" not in {finding.id for finding in result.weakness_map.findings}
    assert result.dropped, "A discarded finding must leave a reason behind it."


def test_a_question_citing_a_finding_that_does_not_exist_is_refused_on_the_adk_path():
    payload = json.loads(json.dumps(STRATEGY_PAYLOAD))
    payload["questions"].append(
        {
            "id": "Q9",
            "finding_id": "W404",
            "question_type": "probe",
            "question": "Pertanyaan yang menyerang temuan yang tidak ada.",
            "intent": "Tidak jelas.",
            "evaluation_criteria": "Tidak jelas.",
            "follow_up_if_weak": "",
        }
    )
    weakness_map = finalize_analysis({"weakness_map_raw": ANALYSIS_PAYLOAD}, DRAFT).weakness_map

    result = finalize_strategy({"question_strategy_raw": payload}, weakness_map)

    assert "Q9" not in {question.id for question in result.strategy.questions}


def test_a_gap_recorded_without_a_chance_to_clarify_is_overruled_on_the_adk_path():
    """The fairness rule, on the second route.

    An agent that decides to write a weakness down as undefended before the
    student has been offered a chance to explain it must be overruled whichever
    way its answer travelled.
    """
    evaluation, adjustments = finalize_evaluation(
        {
            "answer_evaluation_raw": {
                "strength": "weak",
                "decision": "record_gap",
                "reasoning": "Tidak menjawab inti.",
                "criteria_met": [],
                "criteria_missed": ["Tidak menyebut arah sebab-akibat."],
                "next_utterance": "Saya catat ini sebagai celah.",
                "gap_note": "Klaim kausal tidak dipertahankan.",
            }
        },
        QuestionProgress(question_id="Q1", clarifications_offered=0),
    )

    assert evaluation.decision is ExaminerDecision.ASK_CLARIFICATION
    assert evaluation.gap_note == ""
    assert adjustments, "An override must be recorded rather than applied silently."


def test_a_summary_that_drops_a_recorded_gap_is_repaired_on_the_adk_path():
    session = SessionState(
        session_id="s1",
        progress=[
            QuestionProgress(
                question_id="Q1",
                closed=True,
                final_strength=AnswerStrength.WEAK.value,
                gap_recorded="Klaim kausal tidak dipertahankan.",
            )
        ],
    )
    payload = json.loads(json.dumps(REFLECTION_PAYLOAD))
    payload["remaining_gaps"] = []

    summary, adjustments = finalize_summary({"session_summary_raw": payload}, session)

    assert "Klaim kausal tidak dipertahankan." in summary.remaining_gaps
    assert adjustments


def test_a_claim_of_support_without_a_verified_passage_is_downgraded_on_the_adk_path():
    source = CitedSource(
        title="Study of study hours",
        authors="Vermeer",
        year="2019",
        text=(
            "This cross-sectional survey found a positive association between "
            "self-reported study hours and examination scores."
        ),
    )

    result = finalize_claim(
        {
            "claim_support_raw": {
                "verdict": "supports",
                "reasoning": "Sumber ini jelas mendukung klaim tersebut.",
                "source_quote": "Kalimat ini tidak ada di dalam sumber.",
                "scope_mismatch": "",
                "question_for_author": "",
            }
        },
        source,
    )

    assert result.check.verdict.value == "cannot_tell"
    assert result.adjustments


# --------------------------------------------------------------------------- #
# Reading ADK session state
# --------------------------------------------------------------------------- #


def test_output_arriving_as_a_model_instance_is_accepted():
    """ADK hands back a validated model when the schema is satisfied."""
    result = finalize_analysis(
        {"weakness_map_raw": WeaknessMap.model_validate(ANALYSIS_PAYLOAD)}, DRAFT
    )

    assert result.weakness_map.findings


def test_output_arriving_as_a_json_string_is_parsed():
    """And a plain string when it is not, which is the case worth surviving."""
    result = finalize_analysis(
        {"weakness_map_raw": json.dumps(ANALYSIS_PAYLOAD, ensure_ascii=False)}, DRAFT
    )

    assert result.weakness_map.findings


def test_a_missing_output_key_says_which_key_was_missing():
    """The failure a renamed output key produces, made readable.

    Without this the symptom is a `None` several layers away from the agent that
    never ran.
    """
    with pytest.raises(ValueError, match="weakness_map_raw"):
        finalize_analysis({}, DRAFT)
