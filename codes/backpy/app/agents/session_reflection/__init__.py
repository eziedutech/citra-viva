"""Session Reflection Agent, the fourth sub-agent of CITRA Viva.

Its responsibility is narrow and stops there: read a finished transcript and
write what the student should take away, plus the recurring patterns that make
the next session sharper. It does not run sessions and calls no other sub-agent.
"""

from app.agents.session_reflection.core import reflect_on_session

__all__ = ["reflect_on_session"]
