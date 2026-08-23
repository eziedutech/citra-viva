"""Identity: who is asking, and what they are allowed to touch.

Sessions carry a student's manuscript and the map of where their argument gives
way. Before this existed, anyone who guessed a session id could read both. For
a product whose whole premise is research integrity, that is not a missing
feature, it is a contradiction.

Tokens are Firebase ID tokens, verified against Google's public keys. The
verification itself is delegated to `google-auth`; what lives here is the part
that is ours to get right: turning a verified token into an identity, and
refusing a request for someone else's session.

`AUTH_REQUIRED=false` disables the check. That exists so the test suite and a
local backend can run without a Firebase project, and it is the reason every
deployment sets it explicitly rather than relying on the default.

Ownership itself is enforced one layer up, in the Orchestrator, because that is
where a session is loaded. It refuses with "not found" rather than "forbidden":
telling a stranger that a session exists but is not theirs confirms the id is
real, which is the one useful thing an id guesser could learn.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException, Request

from app.config import get_settings

logger = logging.getLogger(__name__)

ANONYMOUS_USER_ID = "anonymous"


@dataclass(frozen=True)
class User:
    """The caller, as far as we are willing to claim to know."""

    uid: str
    email: str = ""
    name: str = ""

    @property
    def is_anonymous(self) -> bool:
        return self.uid == ANONYMOUS_USER_ID


ANONYMOUS = User(uid=ANONYMOUS_USER_ID)


@lru_cache
def _request_adapter():
    """A transport for fetching Google's signing keys.

    Cached because it holds a connection pool, and built lazily so importing
    this module needs no network.
    """
    import google.auth.transport.requests

    return google.auth.transport.requests.Request()


def verify_id_token(token: str, project_id: str) -> User:
    """Verify a Firebase ID token and return the identity inside it.

    Raises `ValueError` on anything that fails verification, with the reason
    intact for the caller to log. The caller decides the HTTP status, because
    this module has no opinion about HTTP.
    """
    from google.oauth2 import id_token as google_id_token

    try:
        claims = google_id_token.verify_firebase_token(
            token, _request_adapter(), audience=project_id
        )
    except Exception as exc:  # noqa: BLE001 - re-raised as ValueError below
        raise ValueError(f"Token verification failed: {exc}") from exc

    if not claims:
        raise ValueError("Token verification returned no claims.")

    # `sub` is the stable Firebase user id. Email can change, and a user may
    # have none at all, so ownership is never keyed on it.
    uid = str(claims.get("sub") or "").strip()
    if not uid:
        raise ValueError("Verified token carries no subject.")

    return User(
        uid=uid,
        email=str(claims.get("email") or ""),
        name=str(claims.get("name") or ""),
    )


def _bearer_token(request: Request) -> str:
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer":
        return ""
    return token.strip()


def current_user(request: Request) -> User:
    """FastAPI dependency: the verified caller.

    With `AUTH_REQUIRED=false` every caller is the same anonymous user, which
    keeps local development and the test suite working without a Firebase
    project. With it on, an absent or invalid token is a 401.
    """
    settings = get_settings()
    if not settings.auth_required:
        return ANONYMOUS

    token = _bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Sign in to continue.")

    project_id = settings.firebase_project_id or settings.google_cloud_project
    if not project_id:
        # Refusing is the only safe answer. Letting the request through would
        # mean accepting tokens without knowing who they were issued for.
        logger.error("No Firebase project id configured, so no token can be verified.")
        raise HTTPException(status_code=500, detail="Authentication is misconfigured.")

    try:
        return verify_id_token(token, project_id)
    except ValueError as exc:
        logger.info("Rejected a token: %s", exc)
        raise HTTPException(status_code=401, detail="Your sign in has expired.") from exc


# Endpoints declare `user: CurrentUser`. The Annotated form keeps the dependency
# out of the default argument, where it is both a lint error and a footgun.
CurrentUser = Annotated[User, Depends(current_user)]
