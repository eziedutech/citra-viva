"""Firestore collection names, and where each collection's shape is defined.

This module deliberately holds no models. Session documents are written from
`app.models.session.SessionState` and draft documents from the Weakness Map, so
defining a second set of classes here would create two descriptions of one
document that drift apart silently.

| Collection          | Shape defined by                          | Written by                     |
|---------------------|-------------------------------------------|--------------------------------|
| `research_drafts`   | `app.models.weakness_map.AnalysisResult`  | `storage.firestore`            |
| `viva_sessions`     | `app.models.session.SessionState`         | `storage.session_store`        |
| `users`             | not written yet                           | not written yet                |
| `weakness_profile`  | not written yet                           | not written yet                |

The last two are named here because the product data model calls for them.
Cross-session memory currently travels as `recurring_gap_patterns` handed from
one session to the next, so nothing writes a durable profile document yet.
"""

from __future__ import annotations

COLLECTION_USERS = "users"
COLLECTION_RESEARCH_DRAFTS = "research_drafts"
COLLECTION_VIVA_SESSIONS = "viva_sessions"
COLLECTION_WEAKNESS_PROFILE = "weakness_profile"
