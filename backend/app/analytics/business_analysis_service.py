from __future__ import annotations

from backend.app.analytics.business_analysis import (
    BusinessInsight,
    generate_business_analysis,
)
from backend.app.analytics.business_queries import (
    get_revenue_by_product,
    get_revenue_by_region,
    get_revenue_trend,
)


async def get_business_insights() -> list[BusinessInsight]:
    revenue_by_region = (
        await get_revenue_by_region()
    )

    revenue_by_product = (
        await get_revenue_by_product()
    )

    revenue_trend = (
        await get_revenue_trend()
    )

    return generate_business_analysis(
        revenue_by_region=revenue_by_region,
        revenue_by_product=revenue_by_product,
        revenue_trend=revenue_trend,
    )