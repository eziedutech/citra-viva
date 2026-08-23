"""Claim-Support Checker: does this source carry this specific claim?

A supporting layer, not one of the four defense sub-agents. It answers the
question a mechanical citation check cannot: the DOI resolves and the paper is
real, but does its text carry the sentence it was cited for, or is it only
about the same topic?
"""

from app.agents.claim_support.core import check_claim_support

__all__ = ["check_claim_support"]
