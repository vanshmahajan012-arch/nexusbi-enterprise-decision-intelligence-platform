from __future__ import annotations

from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
)
from pydantic import BaseModel, Field

from backend.app.auth import (
    AuthenticatedUser,
    bearer_scheme,
    get_current_user,
)
from backend.app.observability.security_events import (
    log_security_event,
)


router = APIRouter(
    prefix="/api/security",
    tags=["security"],
)


ALLOWED_FRONTEND_EVENTS = {
    "SIGNUP",
    "LOGIN",
    "LOGOUT",
    "DEMO_SESSION_START",
    "DEMO_SESSION_END",
    "FEATURE_USED",
}


class SecurityEventPayload(BaseModel):
    event_type: str = Field(
        min_length=1,
        max_length=64,
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
    )


@router.post("/events")
async def record_security_event(
    payload: SecurityEventPayload,
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
) -> dict[str, Any]:

    event_type = (
        payload.event_type
        .strip()
        .upper()
    )

    if event_type not in ALLOWED_FRONTEND_EVENTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported security event type",
        )

    metadata = dict(
        payload.metadata
    )

    is_demo_mode = (
        request.headers.get(
            "X-NXUS-Demo",
            "",
        )
        .strip()
        .lower()
        == "true"
    )

    # -----------------------------------------------------
    # SIGNUP
    # -----------------------------------------------------

    if (
        event_type == "SIGNUP"
        and credentials is None
    ):
        email = metadata.get("email")

        if email is not None:
            email = (
                str(email)
                .strip()
                .lower()
            )

        await log_security_event(
            request=request,
            event_type="SIGNUP",
            mode="FULL",
            severity="INFO",
            email=email or None,
            metadata={
                "source":
                    "frontend_signup",
            },
        )

        return {
            "status": "RECORDED",
            "event_type": event_type,
        }

    # -----------------------------------------------------
    # DEMO SESSION EVENTS
    # -----------------------------------------------------

    if event_type in {
        "DEMO_SESSION_START",
        "DEMO_SESSION_END",
    }:
        if (
            not is_demo_mode
            or credentials is not None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Demo event requires "
                    "explicit demo mode"
                ),
            )

        await log_security_event(
            request=request,
            event_type=event_type,
            mode="DEMO",
            severity="INFO",
            metadata={
                "source":
                    "frontend_demo_session",
            },
        )

        return {
            "status": "RECORDED",
            "event_type": event_type,
        }

    # -----------------------------------------------------
    # DEMO FEATURE EVENTS
    # -----------------------------------------------------

    if (
        event_type == "FEATURE_USED"
        and is_demo_mode
        and credentials is None
    ):
        await log_security_event(
            request=request,
            event_type="FEATURE_USED",
            mode="DEMO",
            severity="INFO",
            metadata={
                "source":
                    "frontend_demo_feature",
                **metadata,
            },
        )

        return {
            "status": "RECORDED",
            "event_type": event_type,
        }
    # -----------------------------------------------------
    # AUTHENTICATED EVENTS
    # -----------------------------------------------------

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={
                "WWW-Authenticate":
                    "Bearer",
            },
        )

    user: AuthenticatedUser = (
        await get_current_user(
            request=request,
            credentials=credentials,
        )
    )

    if user.role == "demo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated event required",
        )

    await log_security_event(
        request=request,
        event_type=event_type,
        mode="FULL",
        severity="INFO",
        user_id=user.user_id,
        email=user.email,
        metadata={
            "source":
                "frontend_auth",
            **metadata,
        },
    )

    return {
        "status": "RECORDED",
        "event_type": event_type,
    }
