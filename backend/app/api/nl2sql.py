from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.nl2sql.sql_executor import (
    execute_read_only_sql,
)
from backend.app.nl2sql.sql_generator import (
    generate_sql,
)
from backend.app.nl2sql.sql_validator import (
    validate_sql,
)


router = APIRouter(
    prefix="/api/nl2sql",
    tags=["nl2sql"],
)


class NL2SQLRequest(BaseModel):
    prompt: str = Field(
        min_length=3,
        max_length=2000,
    )

    dialect: str = Field(
        default="Snowflake / PostgreSQL",
        max_length=100,
    )


class ExecuteSQLRequest(BaseModel):
    sql: str = Field(
        min_length=6,
        max_length=10000,
    )


@router.post("/generate")
async def generate_nl2sql(
    request: NL2SQLRequest,
) -> dict:
    try:
        generated = await generate_sql(
            question=request.prompt.strip(),
            dialect=request.dialect,
        )

        safe_sql = validate_sql(
            generated["sql"]
        )

        return {
            "status": "OK",
            "sql": safe_sql,
            "provider": generated["provider"],
            "model": generated["model"],
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"NL-to-SQL generation failed: {exc}",
        ) from exc


@router.post("/execute")
async def execute_nl2sql(
    request: ExecuteSQLRequest,
) -> dict:
    try:
        safe_sql = validate_sql(
            request.sql
        )

        result = (
            await execute_read_only_sql(
                safe_sql
            )
        )

        return {
            "status": "OK",
            "sql": safe_sql,
            **result,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"SQL execution failed: {exc}",
        ) from exc