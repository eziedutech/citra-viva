"""Draft Analyzer Agent, the first sub-agent of CITRA Viva.

Its responsibility is narrow and stops there: read draft text, produce a
Weakness Map. It does not build questions, does not run sessions, and does not
call any other sub-agent.
"""

from app.agents.draft_analyzer.core import analyze_draft

__all__ = ["analyze_draft"]
