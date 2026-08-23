"""Question Strategy Agent, the second sub-agent of CITRA Viva.

Its responsibility is narrow and stops there: turn a Weakness Map into an
ordered interrogation plan. It does not analyze drafts, does not run the
session, and does not call any other sub-agent.
"""

from app.agents.question_strategy.core import plan_questions

__all__ = ["plan_questions"]
