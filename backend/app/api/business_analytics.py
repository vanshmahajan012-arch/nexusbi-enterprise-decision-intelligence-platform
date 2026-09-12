from __future__ import annotations

from fastapi import APIRouter

from backend.app.analytics.business_queries import (
    get_region_product_performance,
    get_revenue_by_product,
    get_revenue_by_region,
    get_revenue_trend,
)


router = APIRouter(
    prefix="/api/analytics",
    tags=["business-analytics"],
)


@router.get("/revenue-by-region")
async def revenue_by_region() -> dict:
    data = await get_revenue_by_region()

    return {
        "status": "OK",
        "count": len(data),
        "data": data,
    }


@router.get("/revenue-by-product")
async def revenue_by_product() -> dict:
    data = await get_revenue_by_product()

    return {
        "status": "OK",
        "count": len(data),
        "data": data,
    }


@router.get("/revenue-trend")
async def revenue_trend() -> dict:
    data = await get_revenue_trend()

    return {
        "status": "OK",
        "count": len(data),
        "data": data,
    }


@router.get("/region-product-performance")
async def region_product_performance() -> dict:
    data = await get_region_product_performance()

    return {
        "status": "OK",
        "count": len(data),
        "data": data,
    }