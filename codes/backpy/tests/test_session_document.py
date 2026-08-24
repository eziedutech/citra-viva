"""The manuscript kept for a session, and who may read it.

A real viva happens with the thesis on the table in front of the candidate.
Refusing a student their own document while pressing them about it is not
privacy, it is a memory test.

The document is also the most sensitive thing this system holds, so ownership is
tested from both directions: the person who wrote it can read it, and nobody
else can, including through a session id they happened to guess.
"""

from __future__ import annotations

import pytest

from app.orchestrator.orchestrator import Orchestrator
from app.storage.draft_store import DraftNotFoundError, InMemoryDraftStore
from app.storage.session_store import InMemorySessionStore, SessionNotFoundError
from tests.test_session_loop import DRAFT, ScriptedRunner, evaluation


def make_orchestrator() -> Orchestrator:
    return Orchestrator(
        runner=ScriptedRunner([evaluation() for _ in range(6)]),
        store=InMemorySessionStore(),
        drafts=InMemoryDraftStore(),
    )


def test_the_manuscript_is_kept_when_the_session_opens():
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")

    assert orchestrator.load_document("s1", actor_id="uid-owner") == DRAFT


def test_a_stranger_cannot_read_the_manuscript():
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")

    # The session check refuses first, and the manuscript store would refuse
    # after it. Either way what comes back says nothing about what exists.
    with pytest.raises(SessionNotFoundError):
        orchestrator.load_document("s1", actor_id="uid-stranger")


def test_the_manuscript_store_refuses_a_stranger_on_its_own():
    """Checked against the document's own owner, not the session's.

    A manuscript must not become readable through a session that happens to
    point at it, so the store enforces ownership without help.
    """
    drafts = InMemoryDraftStore()
    drafts.save("s1", "uid-owner", DRAFT)

    with pytest.raises(DraftNotFoundError):
        drafts.load("s1", "uid-stranger")


def test_a_session_with_no_stored_manuscript_says_so():
    """Sessions started before the manuscript was kept still open.

    Their document simply is not there, and the room has to be told that rather
    than being handed an empty string it would render as a blank page.
    """
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")
    orchestrator.drafts = InMemoryDraftStore()

    with pytest.raises(DraftNotFoundError):
        orchestrator.load_document("s1", actor_id="uid-owner")


def test_losing_the_manuscript_does_not_lose_the_session():
    """The defense is prepared and paid for by the time this is written.

    Losing the copy a student can read costs them a reference. Losing the
    session would cost them the examination, so a storage failure here is
    stepped over rather than raised.
    """

    class Failing(InMemoryDraftStore):
        def save(self, session_id: str, user_id: str, text: str) -> None:
            raise RuntimeError("storage unavailable")

    orchestrator = make_orchestrator()
    orchestrator.drafts = Failing()

    started = orchestrator.start_session(DRAFT, session_id="s1", user_id="uid-owner")

    assert started.session_id == "s1"
    assert orchestrator.store.load("s1").questions
