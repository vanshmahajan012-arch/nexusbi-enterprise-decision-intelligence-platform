from backend.app.ai.evidence_orchestrator import (
    build_evidence_bundle,
)


async def main() -> None:
    print("NXUS EVIDENCE ORCHESTRATOR TEST")
    print("==============================")

    evidence = await build_evidence_bundle()

    print()
    print("EVIDENCE SECTIONS")
    print("=================")

    for key, value in evidence.items():
        if isinstance(value, dict):
            print(
                f"{key:<22}: "
                f"{len(value)} fields"
            )
        elif isinstance(value, list):
            print(
                f"{key:<22}: "
                f"{len(value)} items"
            )
        else:
            print(
                f"{key:<22}: "
                f"{type(value).__name__}"
            )

    print()
    print("KPI COUNT")
    print("=========")
    print(
        "KPIs:",
        len(evidence.get("kpis", [])),
    )

    print()
    print("ANALYTICS SECTIONS")
    print("==================")

    business_analytics = evidence.get(
        "business_analytics",
        {},
    )

    print(
        "Revenue by Region:",
        len(
            business_analytics.get(
                "revenue_by_region",
                [],
            )
        ),
    )

    print(
        "Revenue by Product:",
        len(
            business_analytics.get(
                "revenue_by_product",
                [],
            )
        ),
    )

    print(
        "Revenue Trend:",
        len(
            business_analytics.get(
                "revenue_trend",
                [],
            )
        ),
    )

    print()
    print("VARIANCE")
    print("========")
    variance = evidence.get(
        "variance",
        {},
    )
    print(
        "Variance keys:",
        list(variance.keys()),
    )

    print()
    print("DRIVERS")
    print("=======")
    drivers = evidence.get(
        "drivers",
        {},
    )
    print(
        "Top drivers:",
        len(
            drivers.get(
                "top_drivers",
                [],
            )
        ),
    )

    print()
    print("ANOMALIES")
    print("=========")
    anomalies = evidence.get(
        "anomalies",
        {},
    )
    print(
        "Detected:",
        anomalies.get(
            "anomalies_detected",
            0,
        ),
    )

    print()
    print("FORECASTS")
    print("=========")
    forecasts = evidence.get(
        "forecasts",
        {},
    )
    print(
        "Forecasts:",
        len(
            forecasts.get(
                "forecasts",
                [],
            )
        ),
    )

    print()
    print("ROOT CAUSE")
    print("==========")
    root_cause = evidence.get(
        "root_cause",
        {},
    )
    print(
        "Candidates:",
        root_cause.get(
            "candidate_count",
            0,
        ),
    )

    print()
    print(
        "NXUS evidence orchestration test complete."
    )


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())