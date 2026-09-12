from __future__ import annotations

from datetime import date

from backend.app.analytics.root_cause_engine import (
    RootCauseCandidate,
    build_root_cause_candidate,
    generate_root_cause_summary,
    rank_root_causes,
)
from backend.app.analytics.root_cause_queries import (
    get_recent_metric_context,
    get_revenue_drivers,
    get_top_revenue_contributors,
)
from backend.app.analytics.variance_queries import (
    get_dataset_period_bounds,
)


async def get_root_cause_analysis() -> dict:
    bounds = await get_dataset_period_bounds()

    if bounds is None:
        return {
            "status": "NO_DATA",
            "periods": None,
            "candidates": [],
            "summary": (
                "No business data is available "
                "for root-cause analysis."
            ),
        }

    min_date, max_date = bounds

    total_days = (
        max_date - min_date
    ).days + 1

    current_days = max(
        1,
        total_days // 2,
    )

    current_start = max_date.fromordinal(
        max_date.toordinal()
        - current_days
        + 1
    )

    previous_end = current_start.fromordinal(
        current_start.toordinal() - 1
    )

    previous_start = previous_end.fromordinal(
        previous_end.toordinal()
        - current_days
        + 1
    )

    current_context = await get_recent_metric_context(
        start_date=current_start,
        end_date=max_date,
    )

    previous_context = await get_recent_metric_context(
        start_date=previous_start,
        end_date=previous_end,
    )

    current_drivers = await get_revenue_drivers(
        start_date=current_start,
        end_date=max_date,
    )

    previous_drivers = await get_revenue_drivers(
        start_date=previous_start,
        end_date=previous_end,
    )

    current_contributors = (
        await get_top_revenue_contributors(
            start_date=current_start,
            end_date=max_date,
        )
    )

    candidates: list[RootCauseCandidate] = []

    # ---------------------------------------------------------
    # 1. Regional revenue movement
    # ---------------------------------------------------------

    current_regions = {
        row["region"]: row["revenue"]
        for row in current_drivers["regions"]
    }

    previous_regions = {
        row["region"]: row["revenue"]
        for row in previous_drivers["regions"]
    }

    all_regions = (
        set(current_regions)
        | set(previous_regions)
    )

    for region in all_regions:
        current_value = current_regions.get(
            region,
            0.0,
        )

        previous_value = previous_regions.get(
            region,
            0.0,
        )

        change = (
            current_value
            - previous_value
        )

        if change == 0:
            continue

        total_revenue_change = (
            sum(current_regions.values())
            - sum(previous_regions.values())
        )

        if total_revenue_change == 0:
            impact_score = abs(change)
        else:
            impact_score = (
                abs(change)
                / abs(total_revenue_change)
            ) * 100

        if change < 0:
            cause = (
                f"Revenue decline in region {region}"
            )

            evidence = [
                (
                    f"{region} revenue changed from "
                    f"{previous_value:,.2f} to "
                    f"{current_value:,.2f}"
                )
            ]

            candidates.append(
                build_root_cause_candidate(
                    cause_type="REGIONAL_DRIVER",
                    cause=cause,
                    evidence=evidence,
                    impact_score=impact_score,
                )
            )

    # ---------------------------------------------------------
    # 2. Product revenue movement
    # ---------------------------------------------------------

    current_products = {
        row["product"]: row["revenue"]
        for row in current_drivers["products"]
    }

    previous_products = {
        row["product"]: row["revenue"]
        for row in previous_drivers["products"]
    }

    all_products = (
        set(current_products)
        | set(previous_products)
    )

    for product in all_products:
        current_value = current_products.get(
            product,
            0.0,
        )

        previous_value = previous_products.get(
            product,
            0.0,
        )

        change = (
            current_value
            - previous_value
        )

        if change == 0:
            continue

        total_revenue_change = (
            sum(current_products.values())
            - sum(previous_products.values())
        )

        if total_revenue_change == 0:
            impact_score = abs(change)
        else:
            impact_score = (
                abs(change)
                / abs(total_revenue_change)
            ) * 100

        if change < 0:
            cause = (
                f"Product revenue decline in {product}"
            )

            evidence = [
                (
                    f"{product} revenue changed from "
                    f"{previous_value:,.2f} to "
                    f"{current_value:,.2f}"
                )
            ]

            candidates.append(
                build_root_cause_candidate(
                    cause_type="PRODUCT_DRIVER",
                    cause=cause,
                    evidence=evidence,
                    impact_score=impact_score,
                )
            )

    # ---------------------------------------------------------
    # 3. Unit movement
    # ---------------------------------------------------------

    current_units = sum(
        row["units"]
        for row in current_context
    )

    previous_units = sum(
        row["units"]
        for row in previous_context
    )

    unit_change = (
        current_units
        - previous_units
    )

    if unit_change < 0:
        candidates.append(
            build_root_cause_candidate(
                cause_type="VOLUME_DRIVER",
                cause="Unit volume decline",
                evidence=[
                    (
                        f"Units changed from "
                        f"{previous_units} to "
                        f"{current_units}"
                    )
                ],
                impact_score=min(
                    abs(unit_change)
                    / max(
                        previous_units,
                        1,
                    )
                    * 100,
                    100,
                ),
            )
        )

    # ---------------------------------------------------------
    # 4. Top current contributors as supporting evidence
    # ---------------------------------------------------------

    for contributor in current_contributors[:3]:
        product = contributor["product"]
        revenue = contributor["revenue"]

        matching = [
            candidate
            for candidate in candidates
            if candidate.cause_type
            == "PRODUCT_DRIVER"
            and product in candidate.cause
        ]

        if not matching:
            candidates.append(
                build_root_cause_candidate(
                    cause_type="CONTRIBUTOR",
                    cause=(
                        f"{product} is a major "
                        "current revenue contributor"
                    ),
                    evidence=[
                        (
                            f"Current revenue contribution: "
                            f"{revenue:,.2f}"
                        )
                    ],
                    impact_score=(
                        revenue
                        / max(
                            sum(
                                item["revenue"]
                                for item
                                in current_contributors
                            ),
                            1,
                        )
                    ) * 100,
                )
            )

    ranked = rank_root_causes(
        candidates,
        limit=5,
    )

    return {
        "status": "ANALYZED",
        "periods": {
            "current_start": current_start.isoformat(),
            "current_end": max_date.isoformat(),
            "previous_start": previous_start.isoformat(),
            "previous_end": previous_end.isoformat(),
        },
        "candidate_count": len(candidates),
        "candidates": [
            candidate.to_dict()
            for candidate in ranked
        ],
        "summary": generate_root_cause_summary(
            ranked
        ),
    }