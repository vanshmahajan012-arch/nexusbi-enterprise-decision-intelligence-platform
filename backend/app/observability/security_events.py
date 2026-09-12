from __future__ import annotations

import hashlib
import json
from typing import Any

from fastapi import Request

from backend.app.db.postgres import execute
from backend.app.observability.security_alerts import (
    send_security_alert,
)


SECURITY_EVENT_TYPES = {
    "SIGNUP",
    "LOGIN",
    "LOGOUT",
    "DEMO_SESSION_START",
    "DEMO_SESSION_END",
    "FEATURE_USED",
    "AUTH_FAILURE",
    "RATE_LIMIT",
    "SUSPICIOUS_ACTIVITY",
    "SECURITY_ALERT",
}

SECURITY_SEVERITIES = {
    "INFO",
    "WARNING",
    "HIGH",
    "CRITICAL",
}


def _get_request_ip(
    request: Request,
) -> str | None:
    # Prefer the direct socket address.
    # Do not trust forwarded headers until a
    # trusted reverse-proxy allowlist is configured.
    return (
        request.client.host
        if request.client is not None
        else None
    )


def _canonical_event(
    *,
    user_id: str | None,
    event_type: str,
    mode: str,
    severity: str,
    email: str | None,
    request_ip: str | None,
    user_agent: str | None,
    endpoint: str | None,
    method: str | None,
    metadata: dict[str, Any],
) -> str:
    payload = {
        "user_id": user_id,
        "event_type": event_type,
        "mode": mode,
        "severity": severity,
        "email": email,
        "request_ip": request_ip,
        "user_agent": user_agent,
        "endpoint": endpoint,
        "method": method,
        "metadata": metadata,
    }

    return json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )


def _immutable_hash(
    canonical: str,
) -> str:
    return hashlib.sha256(
        canonical.encode("utf-8")
    ).hexdigest()


async def log_security_event(
    *,
    request: Request,
    event_type: str,
    mode: str = "FULL",
    severity: str = "INFO",
    user_id: str | None = None,
    email: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """
    Best-effort server-side security/audit event writer.

    Pipeline:
        Event
          ↓
        Audit DB
          ↓
        Resend notification

    Neither audit storage nor email delivery is allowed
    to break the application request path.
    """

    normalized_event = (
        event_type.strip().upper()
    )

    normalized_mode = (
        mode.strip().upper()
    )

    normalized_severity = (
        severity.strip().upper()
    )

    if (
        normalized_event
        not in SECURITY_EVENT_TYPES
    ):
        raise ValueError(
            f"Unsupported security event type: "
            f"{event_type}"
        )

    if normalized_mode not in {
        "FULL",
        "DEMO",
    }:
        raise ValueError(
            f"Unsupported security event mode: "
            f"{mode}"
        )

    if (
        normalized_severity
        not in SECURITY_SEVERITIES
    ):
        raise ValueError(
            f"Unsupported security event severity: "
            f"{severity}"
        )

    safe_metadata = metadata or {}

    request_ip = _get_request_ip(
        request
    )

    user_agent = request.headers.get(
        "user-agent"
    )

    endpoint = request.url.path
    method = request.method.upper()

    canonical = _canonical_event(
        user_id=user_id,
        event_type=normalized_event,
        mode=normalized_mode,
        severity=normalized_severity,
        email=email,
        request_ip=request_ip,
        user_agent=user_agent,
        endpoint=endpoint,
        method=method,
        metadata=safe_metadata,
    )

    event_hash = _immutable_hash(
        canonical
    )

    query = """
        INSERT INTO audit.security_events (
            user_id,
            event_type,
            mode,
            severity,
            email,
            request_ip,
            user_agent,
            endpoint,
            method,
            metadata,
            immutable_hash
        )
        VALUES (
            NULLIF(%s, '')::uuid,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s::jsonb,
            %s
        )
    """

    params = (
        user_id or "",
        normalized_event,
        normalized_mode,
        normalized_severity,
        email,
        request_ip,
        user_agent,
        endpoint,
        method,
        json.dumps(
            safe_metadata,
            default=str,
        ),
        event_hash,
    )

    # ---------------------------------------------------------
    # 1. Persist immutable audit event
    # ---------------------------------------------------------

    try:
        await execute(
            query,
            params,
        )
    except Exception:
        # Audit storage failure must never break
        # the application request.
        pass

    # ---------------------------------------------------------
    # 2. Send owner security notification
    # ---------------------------------------------------------

    try:
        await send_security_alert(
            event_type=normalized_event,
            severity=normalized_severity,
            email=email,
            request_ip=request_ip,
            endpoint=endpoint,
            metadata={
                "mode": normalized_mode,
                "method": method,
                "user_agent": user_agent,
                **safe_metadata,
            },
        )
    except Exception:
        # Email failure must never break
        # the application request.
        pass