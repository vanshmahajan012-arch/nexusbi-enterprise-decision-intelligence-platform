from __future__ import annotations

from datetime import date

from backend.app.analytics.driver_analysis import (
    DriverInsight,
    analyze_dimension_drivers,
    generate_driver_summary,
    rank_top_drivers,
)
from backend.app.analytics.driver_queries import (
    get_product_revenue_comparison,
    get_region_revenue_comparison,
)
from backend.app.analytics.variance_queries import (
    get_dataset_period_bounds,
)


async def get_driver_analysis() -> dict:
    bounds = await get_dataset_period_bounds()

    if bounds is None:
        return {
            "periods": None,
            "region_drivers": [],
            "product_drivers": [],
            "top_drivers": [],
            "summary": (
                "No business data is available "
                "for driver analysis."
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

    region_comparison = (
        await get_region_revenue_comparison(
            current_start=current_start,
            current_end=max_date,
            previous_start=previous_start,
            previous_end=previous_end,
        )
    )

    product_comparison = (
        await get_product_revenue_comparison(
            current_start=current_start,
            current_end=max_date,
            previous_start=previous_start,
            previous_end=previous_end,
        )
    )

    region_drivers: list[DriverInsight] = (
        analyze_dimension_drivers(
            current_rows=region_comparison["current"],
            previous_rows=region_comparison["previous"],
            dimension_key="region",
            value_key="revenue",
            driver_type="REGION",
        )
    )

    product_drivers: list[DriverInsight] = (
        analyze_dimension_drivers(
            current_rows=product_comparison["current"],
            previous_rows=product_comparison["previous"],
            dimension_key="product",
            value_key="revenue",
            driver_type="PRODUCT",
        )
    )

    all_drivers = (
        region_drivers
        + product_drivers
    )

    top_drivers = rank_top_drivers(
        all_drivers,
        limit=5,
    )

    summary = generate_driver_summary(
        top_drivers
    )

    return {
        "periods": {
            "current_start": current_start.isoformat(),
            "current_end": max_date.isoformat(),
            "previous_start": previous_start.isoformat(),
            "previous_end": previous_end.isoformat(),
        },
        "region_drivers": [
            driver.to_dict()
            for driver in region_drivers
        ],
        "product_drivers": [
            driver.to_dict()
            for driver in product_drivers
        ],
        "top_drivers": [
            driver.to_dict()
            for driver in top_drivers
        ],
        "summary": summary,
    }