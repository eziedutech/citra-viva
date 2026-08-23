"""Examiner Session Agent, the third sub-agent of CITRA Viva.

Its responsibility is narrow and stops there: judge one answer against one
question and decide what the examiner does next. It holds no session state and
calls no other sub-agent. The Orchestrator owns the loop.
"""

from app.agents.examiner_session.core import evaluate_answer

__all__ = ["evaluate_answer"]
