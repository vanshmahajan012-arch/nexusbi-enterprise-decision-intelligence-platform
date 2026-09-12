from __future__ import annotations

import asyncio
import time
from typing import Any

from backend.app.analytics.kpi_queries import (
    get_business_kpis,
)
from backend.app.analytics.business_queries import (
    get_revenue_by_region,
    get_revenue_by_product,
    get_revenue_trend,
)
from backend.app.analytics.variance_service import (
    get_business_variances,
)
from backend.app.analytics.driver_service import (
    get_driver_analysis,
)
from backend.app.analytics.anomaly_service import (
    get_real_anomaly_analysis,
)
from backend.app.analytics.forecast_service import (
    get_business_forecasts,
)
from backend.app.analytics.root_cause_service import (
    get_root_cause_analysis,
)


def _intent_flags(
    question: str,
) -> dict[str, bool]:
    q = question.lower()

    return {
        "product": any(
            x in q
            for x in (
                "product",
                "laptop",
                "monitor",
                "mouse",
                "keyboard",
            )
        ),
        "region": any(
            x in q
            for x in (
                "region",
                "east",
                "west",
                "north",
                "south",
            )
        ),
        "driver": any(
            x in q
            for x in (
                "driver",
                "driven",
                "contributor",
                "contributing",
                "growth",
            )
        ),
        "variance": any(
            x in q
            for x in (
                "change",
                "changed",
                "increase",
                "decrease",
                "up",
                "down",
                "variance",
                "movement",
            )
        ),
        "anomaly": any(
            x in q
            for x in (
                "anomaly",
                "anomalies",
                "abnormal",
                "unusual",
                "unexpected",
                "outlier",
            )
        ),
        "forecast": any(
            x in q
            for x in (
                "forecast",
                "future",
                "predict",
                "prediction",
                "projection",
            )
        ),
        "root_cause": any(
            x in q
            for x in (
                "why",
                "cause",
                "caused",
                "root cause",
                "reason",
            )
        ),
        "revenue": any(
            x in q
            for x in (
                "revenue",
                "sales",
                "income",
                "turnover",
            )
        ),
    }


def _select_sections(
    question: str,
) -> set[str]:
    flags = _intent_flags(question)

    selected = {"kpis"}

    if (
        flags["product"]
        or flags["revenue"]
        or flags["driver"]
    ):
        selected.add(
            "business_analytics"
        )

    if (
        flags["variance"]
        or flags["revenue"]
    ):
        selected.add("variance")

    if (
        flags["driver"]
        or flags["product"]
    ):
        selected.add("drivers")

    if flags["anomaly"]:
        selected.add("anomalies")

    if flags["forecast"]:
        selected.add("forecasts")

    if flags["root_cause"]:
        selected.add("root_cause")
        selected.add("drivers")
        selected.add("anomalies")

    return selected


async def _timed(
    name: str,
    awaitable: Any,
) -> tuple[str, Any, float]:
    start = time.perf_counter()

    result = await awaitable

    elapsed = (
        time.perf_counter()
        - start
    )

    return (
        name,
        result,
        elapsed,
    )


async def build_evidence_bundle(
    question: str = "",
) -> dict[str, Any]:
    sections = _select_sections(
        question
    )

    tasks: list[
        tuple[str, Any]
    ] = [
        (
            "kpis",
            get_business_kpis(),
        )
    ]

    if "business_analytics" in sections:
        tasks.extend(
            [
                (
                    "revenue_by_region",
                    get_revenue_by_region(),
                ),
                (
                    "revenue_by_product",
                    get_revenue_by_product(),
                ),
                (
                    "revenue_trend",
                    get_revenue_trend(),
                ),
            ]
        )

    if "variance" in sections:
        tasks.append(
            (
                "variance",
                get_business_variances(),
            )
        )

    if "drivers" in sections:
        tasks.append(
            (
                "drivers",
                get_driver_analysis(),
            )
        )

    if "anomalies" in sections:
        tasks.append(
            (
                "anomalies",
                get_real_anomaly_analysis(),
            )
        )

    if "forecasts" in sections:
        tasks.append(
            (
                "forecasts",
                get_business_forecasts(),
            )
        )

    if "root_cause" in sections:
        tasks.append(
            (
                "root_cause",
                get_root_cause_analysis(),
            )
        )

    results = await asyncio.gather(
        *(
            _timed(
                name,
                awaitable,
            )
            for name, awaitable in tasks
        )
    )

    raw: dict[str, Any] = {}

    for name, result, elapsed in results:
        raw[name] = result

        print(
            (
                "[NXUS EVIDENCE TIMING] "
                f"{name}={elapsed:.3f}s"
            ),
            flush=True,
        )

    bundle: dict[str, Any] = {
        "kpis": [
            item.to_dict()
            for item in raw.get(
                "kpis",
                [],
            )
        ]
    }

    analytics: dict[str, Any] = {}

    for key in (
        "revenue_by_region",
        "revenue_by_product",
        "revenue_trend",
    ):
        if key in raw:
            analytics[key] = raw[key]

    if analytics:
        bundle[
            "business_analytics"
        ] = analytics

    for key in (
        "variance",
        "drivers",
        "anomalies",
        "forecasts",
        "root_cause",
    ):
        if key in raw:
            bundle[key] = raw[key]

    return bundle