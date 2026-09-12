from __future__ import annotations

from typing import Any

import resend

from backend.app.core.settings import settings


async def send_security_alert(
    *,
    event_type: str,
    severity: str,
    email: str | None = None,
    request_ip: str | None = None,
    endpoint: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """
    Send a security notification to the configured NXUS owner email.

    Email delivery failures must never break the application request.
    """

    if not settings.resend_api_key:
        return

    if not settings.security_alert_email:
        return

    if not settings.security_alert_from:
        return

    resend.api_key = settings.resend_api_key

    safe_metadata = metadata or {}

    subject = (
        f"[NXUS BI] {severity.upper()} Security Event: "
        f"{event_type.upper()}"
    )

    metadata_lines = "\n".join(
        f"{key}: {value}"
        for key, value in safe_metadata.items()
    )

    text = f"""
NXUS BI Security Notification

Event: {event_type.upper()}
Severity: {severity.upper()}

User Email: {email or "N/A"}
Request IP: {request_ip or "N/A"}
Endpoint: {endpoint or "N/A"}

Metadata:
{metadata_lines or "None"}

This is an automated NXUS BI security notification.
"""

    try:
        resend.Emails.send(
            {
                "from": settings.security_alert_from,
                "to": [
                    settings.security_alert_email,
                ],
                "subject": subject,
                "text": text.strip(),
            }
        )
    except Exception:
        # Email failure must never break the application.
        return