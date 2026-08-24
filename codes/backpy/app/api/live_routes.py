"""The WebSocket a browser streams a spoken answer into.

This is the only stateful connection in the system, and it is bounded on
purpose. It carries audio in one direction and words in the other, for the
length of one spoken answer, and then it closes. No session state ever lives
here: the transcript it produces lands in the answer box, the student reads and
corrects it, and sending it travels the ordinary answer endpoint where every
rule is enforced. A defense interrupted while this socket is open loses the
sentence being spoken and nothing else.

It is also the one place a browser talks to this API directly rather than
through the web app, because a Next.js route handler cannot carry a WebSocket
upgrade. That has one consequence worth stating: a browser cannot set headers on
a WebSocket, so the caller's token arrives in the subprotocol, which is a header
on the wire rather than a query parameter in a URL that proxies and logs would
keep.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.auth import ANONYMOUS, User, verify_id_token
from app.config import get_settings
from app.speech.live import (
    MAX_STREAM_SECONDS,
    live_client,
    live_config,
    send_audio,
    stream_transcripts,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# The two protocols the browser offers: a marker, then the caller's token.
AUTH_PROTOCOL = "citra.auth"

# Close codes. 1008 is "policy violation", which is what a refused credential is.
CLOSE_UNAUTHENTICATED = 1008
CLOSE_UNAVAILABLE = 1011


def _requested_protocols(websocket: WebSocket) -> list[str]:
    header = websocket.headers.get("sec-websocket-protocol", "")
    return [part.strip() for part in header.split(",") if part.strip()]


def _caller_from(protocols: list[str]) -> User:
    """Verify the token the browser put in the subprotocol.

    Raises `ValueError` when there is nothing valid, which the caller turns into
    a closed socket. With authentication switched off every caller is the same
    anonymous user, exactly as on the HTTP endpoints.
    """
    settings = get_settings()
    if not settings.auth_required:
        return ANONYMOUS

    if len(protocols) < 2 or protocols[0] != AUTH_PROTOCOL:
        raise ValueError("No credential was offered.")

    project_id = settings.firebase_project_id or settings.google_cloud_project
    if not project_id:
        raise ValueError("Authentication is misconfigured.")

    return verify_id_token(protocols[1], project_id)


@router.websocket("/api/speech/live")
async def live_transcription(websocket: WebSocket) -> None:
    """Stream one spoken answer in, and its words back out.

    The browser sends binary frames of 16 kHz mono PCM and one text frame,
    "end", when the student stops speaking. Each transcript is sent back as it
    arrives, so the answer box fills while they are still talking.
    """
    protocols = _requested_protocols(websocket)

    try:
        _caller_from(protocols)
    except ValueError as error:
        logger.info("Refused a live transcription socket: %s", error)
        # Accepted first, because a browser shown a plain rejected handshake is
        # told only that "the connection failed", with no way to distinguish an
        # expired sign-in from a service that is down.
        await websocket.accept(subprotocol=AUTH_PROTOCOL if protocols else None)
        await websocket.close(code=CLOSE_UNAUTHENTICATED, reason="Sign in to continue.")
        return

    await websocket.accept(subprotocol=AUTH_PROTOCOL if protocols else None)

    audio: asyncio.Queue[bytes | None] = asyncio.Queue()

    async def from_browser() -> None:
        """Read audio frames until the student says they have finished."""
        try:
            while True:
                message = await websocket.receive()

                if message.get("type") == "websocket.disconnect":
                    break
                if (data := message.get("bytes")) is not None:
                    await audio.put(data)
                elif message.get("text") == "end":
                    break
        finally:
            # Always, so the sender stops waiting even when the browser vanished
            # mid-sentence.
            await audio.put(None)

    async def to_model():
        while (chunk := await audio.get()) is not None:
            yield chunk

    settings = get_settings()

    try:
        client = live_client()
        async with client.aio.live.connect(
            model=settings.gemini_live_model, config=live_config()
        ) as session:
            reader = asyncio.create_task(from_browser())
            sender = asyncio.create_task(send_audio(session, to_model()))

            async def deliver(transcript) -> None:  # noqa: ANN001 - Transcript
                await websocket.send_json(
                    {"text": transcript.text, "finished": transcript.finished}
                )

            receiver = asyncio.create_task(stream_transcripts(session, deliver))

            try:
                async with asyncio.timeout(MAX_STREAM_SECONDS):
                    await reader
                    # The socket is closed by the student, so the remaining
                    # transcripts have to be waited for rather than cut off:
                    # the last thing they said is usually the point.
                    await asyncio.wait({sender, receiver}, timeout=15)
            finally:
                for task in (reader, sender, receiver):
                    task.cancel()
                    with contextlib.suppress(asyncio.CancelledError, Exception):
                        await task

        await websocket.send_json({"done": True})

    except WebSocketDisconnect:
        # The student navigated away or lost the network. Nothing to report to a
        # browser that is no longer there.
        return
    except Exception:  # noqa: BLE001 - the browser gets a close code, not a trace
        logger.warning("A live transcription session failed", exc_info=True)
        with contextlib.suppress(Exception):
            await websocket.close(code=CLOSE_UNAVAILABLE, reason="Live transcription failed.")
        return

    with contextlib.suppress(Exception):
        await websocket.close()
