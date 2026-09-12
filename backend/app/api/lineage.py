from __future__ import annotations

from fastapi import APIRouter

from backend.app.db.postgres import fetch_all


router = APIRouter(
    prefix="/api/lineage",
    tags=["lineage"],
)


WAREHOUSE_TABLES = [
    "dim_customer",
    "dim_date",
    "dim_location",
    "dim_platform",
    "dim_product",
    "fct_order_items",
    "fct_orders",
    "fct_telemetry_events",
    "fct_market_ohlcv",
    "live_market_quotes",
    "live_market_ticks",
]


def _display_name(table_name: str) -> str:
    return table_name.replace(
        "_",
        " ",
    ).title()


def _layer_name(table_name: str) -> str:
    if table_name.startswith("dim_"):
        return "Warehouse Dimensions"

    if table_name.startswith("fct_"):
        return "Warehouse Facts"

    return "Live Warehouse"

    
async def _table_row_count(
    table_name: str,
) -> int:
    rows = await fetch_all(
        f"""
        SELECT COUNT(*)
        FROM warehouse."{table_name}"
        """
    )

    return int(rows[0][0] or 0)


@router.get("")
async def get_lineage() -> dict:
    nodes = []

    for index, table_name in enumerate(
        WAREHOUSE_TABLES
    ):
        row_count = await _table_row_count(
            table_name
        )

        nodes.append(
            {
                "id": f"warehouse-{table_name}",
                "name": _display_name(
                    table_name
                ),
                "type": (
                    "DIMENSION"
                    if table_name.startswith(
                        "dim_"
                    )
                    else "FACT"
                    if table_name.startswith(
                        "fct_"
                    )
                    else "LIVE"
                ),
                "layerName": _layer_name(
                    table_name
                ),
                "rowCount": row_count,
                "availability": (
                    "AVAILABLE"
                    if row_count > 0
                    else "EMPTY"
                ),
                "owner": "NXUS Warehouse",
                "source": f"warehouse.{table_name}",
                "sequence": index + 1,
            }
        )

    return {
        "status": "OK",
        "schema": "warehouse",
        "nodeCount": len(nodes),
        "nodes": nodes,
    }