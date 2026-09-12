from __future__ import annotations

from dataclasses import dataclass

import httpx
from fastapi import (
    Depends,
    HTTPException,
    Request,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from backend.app.core.settings import settings
from backend.app.observability.security_events import (
    log_security_event,
)


bearer_scheme = HTTPBearer(
    auto_error=False,
)

DEMO_HEADER = "X-NXUS-Demo"

# Demo mode is intentionally limited to read-oriented
# business intelligence surfaces and safe AI/search operations.
DEMO_ALLOWED_GET_PREFIXES = (
    "/api/analytics",
    "/api/anomaly",
    "/api/business-analysis",
    "/api/business-analytics",
    "/api/decisions",
    "/api/drivers",
    "/api/forecast",
    "/api/lineage",
    "/api/market",
    "/api/root-cause",
    "/api/scenarios",
    "/api/scenario-decisions",
    "/api/scenario-overview",
    "/api/telemetry",
)

DEMO_ALLOWED_POST_PATHS = {
    "/api/ai/analyze",
    "/api/knowledge/search",
    "/api/knowledge/ask",
    "/api/nl2sql/generate",
    "/api/nl2sql/execute",
}


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: str
    email: str | None
    role: str | None
    claims: dict


def _demo_path_allowed(
    request: Request,
) -> bool:
    path = request.url.path
    method = request.method.upper()

    if method == "GET":
        return path.startswith(
            DEMO_ALLOWED_GET_PREFIXES
        )

    if method == "POST":
        return path in DEMO_ALLOWED_POST_PATHS

    return False


async def _authenticate_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None,
) -> AuthenticatedUser:
    """
    Internal authentication implementation.

    This function is called directly by both:
    - the FastAPI dependency wrapper
    - require_api_access()

    Therefore it does NOT use Depends().
    """

    if credentials is None:
        await log_security_event(
            request=request,
            event_type="AUTH_FAILURE",
            mode="FULL",
            severity="WARNING",
            metadata={
                "reason": "missing_bearer_token",
            },
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    token = credentials.credentials

    if not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_URL is not configured",
        )

    if not settings.supabase_anon_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_ANON_KEY is not configured",
        )

    url = (
        settings.supabase_url.rstrip("/")
        + "/auth/v1/user"
    )

    headers = {
        "apikey": settings.supabase_anon_key,
        "Authorization": f"Bearer {token}",
    }

    try:
        async with httpx.AsyncClient(
            timeout=5.0
        ) as client:
            response = await client.get(
                url,
                headers=headers,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        ) from exc

    if response.status_code != 200:
        await log_security_event(
            request=request,
            event_type="AUTH_FAILURE",
            mode="FULL",
            severity="WARNING",
            metadata={
                "reason": "invalid_or_expired_token",
                "supabase_status": response.status_code,
            },
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication response",
        ) from exc

    user_id = payload.get("id")

    if not user_id:
        await log_security_event(
            request=request,
            event_type="AUTH_FAILURE",
            mode="FULL",
            severity="WARNING",
            metadata={
                "reason": "authenticated_user_id_missing",
            },
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user id missing",
        )

    return AuthenticatedUser(
        user_id=str(user_id),
        email=payload.get("email"),
        role=payload.get("role"),
        claims=payload,
    )


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
) -> AuthenticatedUser:
    """
    FastAPI dependency wrapper for authenticated endpoints.
    """
    return await _authenticate_user(
        request=request,
        credentials=credentials,
    )


async def require_api_access(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
) -> AuthenticatedUser:
    """
    Unified access policy for application API routers.

    Full users:
        valid Supabase Bearer token required.

    Demo users:
        explicit X-NXUS-Demo: true header + allowlisted path.
    """

    # -----------------------------------------------------
    # FULL AUTHENTICATED USER
    # -----------------------------------------------------

    if credentials is not None:
        return await _authenticate_user(
            request=request,
            credentials=credentials,
        )

    # -----------------------------------------------------
    # DEMO MODE
    # -----------------------------------------------------

    is_demo = (
        request.headers.get(
            DEMO_HEADER,
            "",
        )
        .strip()
        .lower()
        == "true"
    )

    if (
        is_demo
        and _demo_path_allowed(request)
    ):
        return AuthenticatedUser(
            user_id="demo",
            email=None,
            role="demo",
            claims={
                "mode": "DEMO",
                "read_only": True,
            },
        )

    # -----------------------------------------------------
    # DENY
    # -----------------------------------------------------

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={
            "WWW-Authenticate": "Bearer",
        },
    )
