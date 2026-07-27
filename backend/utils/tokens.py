"""Short-lived signed tokens for ``/api/file``.

Without a signature the stream endpoint is an open proxy: anyone could pass an arbitrary
URL and have the server fetch it. The token binds a transfer to the exact
``(url, format_id)`` pair that a ``/api/download`` call already authorised, and expires
with the CDN links it points at.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

from config import settings
from utils.errors import BadTokenError, TokenExpiredError


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    try:
        return base64.urlsafe_b64decode(value + padding)
    except Exception as exc:  # noqa: BLE001
        raise BadTokenError(detail=str(exc)) from exc


def _sign(payload: str) -> str:
    digest = hmac.new(settings.secret_key.encode("utf-8"), payload.encode("ascii"), hashlib.sha256)
    return _b64encode(digest.digest())


def issue(url: str, format_id: str, filename: str, ttl: int | None = None) -> tuple[str, str, int]:
    """Return ``(token, signature, ttl)``."""
    ttl = ttl or settings.token_ttl_seconds
    payload = {"u": url, "f": format_id, "n": filename, "exp": int(time.time()) + ttl}
    token = _b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    return token, _sign(token), ttl


def verify(token: str, signature: str) -> dict:
    """Validate and decode. Raises :class:`BadTokenError` or :class:`TokenExpiredError`."""
    if not token or not signature:
        raise BadTokenError()

    if not hmac.compare_digest(_sign(token), signature):
        raise BadTokenError(detail="signature mismatch")

    try:
        payload = json.loads(_b64decode(token))
    except (ValueError, TypeError) as exc:
        raise BadTokenError(detail=str(exc)) from exc

    if not isinstance(payload, dict):
        raise BadTokenError()
    for key in ("u", "f", "n", "exp"):
        if key not in payload:
            raise BadTokenError(detail=f"missing {key}")

    if int(payload["exp"]) < int(time.time()):
        raise TokenExpiredError()

    return payload
