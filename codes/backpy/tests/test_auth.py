"""Authentication and session ownership tests.

No token is ever really signed here. Google's verification is not ours to test,
and testing it would mean either shipping a private key or reaching the network
from a unit test. What is ours, and what these tests cover, is everything
around it: what happens when a token is missing, when verification fails, when
configuration is incomplete, and above all who is allowed to open a session.

The ownership tests are the ones that matter. Before this existed, a guessed
session id was enough to read someone's manuscript and the map of where their
argument gives way.
"""

from __future__ import annotations

import json

import pytest
from fastapi import HTTPException

from app import auth
from app.auth import ANONYMOUS, User, current_user, verify_id_token
from app.config import Settings, get_settings
from app.orchestrator.orchestrator import Orchestrator
from app.storage.session_store import InMemorySessionStore, SessionNotFoundError
from tests.test_session_loop import DRAFT, ScriptedRunner, evaluation


class FakeRequest:
    """Just enough of a request to carry a header."""

    def __init__(self, authorization: str | None = None) -> None:
        self.headers = {"Authorization": authorization} if authorization else {}


@pytest.fixture
def settings(monkeypatch):
    """Give each test its own settings, without touching the real .env."""

    def configure(**overrides):
        values = {
            "google_cloud_project": "test-project",
            "auth_required": True,
            **overrides,
        }
        replacement = Settings(**values)
        monkeypatch.setattr("app.auth.get_settings", lambda: replacement)
        return replacement

    get_settings.cache_clear()
    yield configure
    get_settings.cache_clear()


# --------------------------------------------------------------------------- #
# The dependency
# --------------------------------------------------------------------------- #


def test_auth_disabled_lets_everyone_through_as_the_same_user(settings):
    """Local development and the test suite run without a Firebase project."""
    settings(auth_required=False)

    assert current_user(FakeRequest()) is ANONYMOUS


def test_a_missing_token_is_rejected(settings):
    settings()

    with pytest.raises(HTTPException) as raised:
        current_user(FakeRequest())

    assert raised.value.status_code == 401


def test_a_header_that_is_not_a_bearer_token_is_rejected(settings):
    settings()

    with pytest.raises(HTTPException) as raised:
        current_user(FakeRequest("Basic dXNlcjpwYXNz"))

    assert raised.value.status_code == 401


def test_a_token_that_fails_verification_is_rejected(settings, monkeypatch):
    settings()

    def refuse(token: str, project_id: str) -> User:
        raise ValueError("Token expired.")

    monkeypatch.setattr(auth, "verify_id_token", refuse)

    with pytest.raises(HTTPException) as raised:
        current_user(FakeRequest("Bearer expired.token.here"))

    assert raised.value.status_code == 401


def test_a_verified_token_becomes_the_caller(settings, monkeypatch):
    settings()
    monkeypatch.setattr(
        auth,
        "verify_id_token",
        lambda token, project_id: User(uid="uid-123", email="student@example.edu"),
    )

    user = current_user(FakeRequest("Bearer good.token.here"))

    assert user.uid == "uid-123"
    assert not user.is_anonymous


def test_missing_project_configuration_refuses_rather_than_letting_calls_through(
    settings,
):
    """Accepting a token without knowing who it was issued for accepts anything."""
    settings(google_cloud_project="", firebase_project_id="")

    with pytest.raises(HTTPException) as raised:
        current_user(FakeRequest("Bearer some.token.here"))

    assert raised.value.status_code == 500


def test_a_token_with_no_subject_is_refused(monkeypatch):
    """Ownership is keyed on `sub`, so a token without one is unusable."""
    monkeypatch.setattr(
        "google.oauth2.id_token.verify_firebase_token",
        lambda *args, **kwargs: {"email": "student@example.edu"},
    )

    with pytest.raises(ValueError, match="no subject"):
        verify_id_token("token", "test-project")


def test_ownership_is_keyed_on_the_subject_not_the_email(monkeypatch):
    """An email can change hands; the Firebase subject cannot."""
    monkeypatch.setattr(
        "google.oauth2.id_token.verify_firebase_token",
        lambda *args, **kwargs: {
            "sub": "uid-abc",
            "email": "student@example.edu",
            "name": "A Student",
        },
    )

    user = verify_id_token("token", "test-project")

    assert user.uid == "uid-abc"
    assert user.email == "student@example.edu"


# --------------------------------------------------------------------------- #
# Session ownership
# --------------------------------------------------------------------------- #


def make_orchestrator() -> Orchestrator:
    runner = ScriptedRunner([evaluation() for _ in range(6)])
    return Orchestrator(runner=runner, store=InMemorySessionStore())


def test_a_stranger_cannot_read_someone_elses_session():
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="owned", user_id="uid-owner")

    # Not found, deliberately. A "forbidden" would confirm the id is real, which
    # is the one useful thing an id guesser could learn.
    with pytest.raises(SessionNotFoundError):
        orchestrator.load_session("owned", actor_id="uid-stranger")


def test_a_stranger_cannot_answer_someone_elses_session():
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="owned", user_id="uid-owner")

    with pytest.raises(SessionNotFoundError):
        orchestrator.submit_answer("owned", "Halo?", actor_id="uid-stranger")


def test_a_stranger_cannot_close_someone_elses_session():
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="owned", user_id="uid-owner")

    with pytest.raises(SessionNotFoundError):
        orchestrator.close_session("owned", actor_id="uid-stranger")


def test_the_owner_can_do_all_of_it():
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="owned", user_id="uid-owner")

    state = orchestrator.load_session("owned", actor_id="uid-owner")
    assert state.user_id == "uid-owner"

    turn = orchestrator.submit_answer("owned", "Jawaban saya.", actor_id="uid-owner")
    assert turn.question_id


def test_a_session_with_no_owner_stays_readable():
    """Sessions made before authentication existed are not orphaned by it."""
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="ownerless")

    state = orchestrator.load_session("ownerless", actor_id="uid-anyone")

    assert state.session_id == "ownerless"


def test_an_unauthenticated_caller_still_reaches_an_owned_session_only_when_auth_is_off():
    """With auth off every caller is anonymous, and an empty actor skips the
    check. That is the intended local behaviour, and the reason a deployment
    must set AUTH_REQUIRED explicitly."""
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="owned", user_id="uid-owner")

    state = orchestrator.load_session("owned", actor_id="")

    assert state.user_id == "uid-owner"


def test_the_session_records_who_started_it():
    orchestrator = make_orchestrator()
    orchestrator.start_session(DRAFT, session_id="owned", user_id="uid-owner")

    stored = json.loads(orchestrator.store.load("owned").model_dump_json())

    assert stored["user_id"] == "uid-owner"
