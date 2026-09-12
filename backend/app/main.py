import asyncio

if hasattr(
    asyncio,
    "WindowsSelectorEventLoopPolicy",
):
    asyncio.set_event_loop_policy(
        asyncio.WindowsSelectorEventLoopPolicy()
    )

from contextlib import asynccontextmanager

from fastapi import (
    Depends,
    FastAPI,
    WebSocket,
)
from fastapi.middleware.cors import (
    CORSMiddleware,
)

from backend.app.auth import (
    AuthenticatedUser,
    get_current_user,
    require_api_access,
)

# ---------------------------------------------------------
# API ROUTERS
# ---------------------------------------------------------

from backend.app.api.market import (
    router as market_router,
)
from backend.app.api.analytics import (
    router as analytics_router,
)
from backend.app.api.business_analytics import (
    router as business_analytics_router,
)
from backend.app.api.business_analysis import (
    router as business_analysis_router,
)
from backend.app.api.variance import (
    router as variance_router,
)
from backend.app.api.drivers import (
    router as drivers_router,
)
from backend.app.api.anomaly import (
    router as anomaly_router,
)
from backend.app.api.forecast import (
    router as forecast_router,
)
from backend.app.api.root_cause import (
    router as root_cause_router,
)
from backend.app.api.ai_analyst import (
    router as ai_analyst_router,
)
from backend.app.api.decisions import (
    router as decisions_router,
)
from backend.app.api.scenarios import (
    router as scenarios_router,
)
from backend.app.api.scenario_decisions import (
    router as scenario_decisions_router,
)
from backend.app.api.scenario_overview import (
    router as scenario_overview_router,
)
from backend.app.api.nl2sql import (
    router as nl2sql_router,
)
from backend.app.api.knowledge import (
    router as knowledge_router,
)
from backend.app.api.lineage import (
    router as lineage_router,
)
from backend.app.api.telemetry import (
    router as telemetry_router,
)
from backend.app.api.system_health import (
    router as system_health_router,
)

# Security lifecycle events endpoint intentionally has
# its own authentication/demo policy and therefore is NOT
# included in router_access below.
from backend.app.api.security import (
    router as security_router,
)

# ---------------------------------------------------------
# LIVE MARKET SERVICES
# ---------------------------------------------------------

from backend.app.services.live_market_runtime import (
    live_market_runtime,
)
from backend.app.services.live_market_broadcaster import (
    live_market_broadcaster,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await live_market_runtime.start()

    try:
        yield
    finally:
        await live_market_runtime.stop()


app = FastAPI(
    title="NXUS BI API",
    version="0.1.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# PUBLIC HEALTH
# ---------------------------------------------------------

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "nxus-bi-api",
    }


# ---------------------------------------------------------
# AUTHENTICATED USER INFO
# ---------------------------------------------------------

@app.get("/api/auth/me")
async def auth_me(
    user: AuthenticatedUser = Depends(
        get_current_user
    ),
):
    return {
        "status": "OK",
        "user_id": user.user_id,
        "email": user.email,
        "role": user.role,
    }


# ---------------------------------------------------------
# LIVE MARKET WEBSOCKET
# ---------------------------------------------------------

@app.websocket("/ws/market")
async def market_websocket(
    websocket: WebSocket,
):
    await live_market_broadcaster.connect(
        websocket
    )

    try:
        while True:
            await websocket.receive_text()
    except Exception:
        await live_market_broadcaster.disconnect(
            websocket
        )


# ---------------------------------------------------------
# PROTECTED / DEMO-AWARE APPLICATION ROUTERS
# ---------------------------------------------------------
#
# Every router below requires either:
#
# 1. Valid Supabase Bearer JWT
# OR
# 2. Explicit allowlisted NXUS Demo access
#
# /api/health remains public.
# /api/auth/me remains full-auth only.
# /api/security/events has its own policy.
# ---------------------------------------------------------

router_access = [
    (market_router, "market"),
    (analytics_router, "analytics"),
    (business_analytics_router, "business_analytics"),
    (business_analysis_router, "business_analysis"),
    (variance_router, "variance"),
    (drivers_router, "drivers"),
    (anomaly_router, "anomaly"),
    (forecast_router, "forecast"),
    (root_cause_router, "root_cause"),
    (ai_analyst_router, "ai_analyst"),
    (decisions_router, "decisions"),
    (scenarios_router, "scenarios"),
    (scenario_decisions_router, "scenario_decisions"),
    (scenario_overview_router, "scenario_overview"),
    (nl2sql_router, "nl2sql"),
    (knowledge_router, "knowledge"),
    (lineage_router, "lineage"),
    (telemetry_router, "telemetry"),
    (system_health_router, "system_health"),
]


for router, _name in router_access:
    app.include_router(
        router,
        dependencies=[
            Depends(require_api_access)
        ],
    )


# ---------------------------------------------------------
# SECURITY / USER ACTIVITY EVENTS
# ---------------------------------------------------------
#
# This router is intentionally registered separately.
# It handles:
#
# SIGNUP
# LOGIN
# LOGOUT
# DEMO_SESSION_START
# DEMO_SESSION_END
# FEATURE_USED
#
# The router itself validates the appropriate identity/mode.
# ---------------------------------------------------------

app.include_router(
    security_router,
)