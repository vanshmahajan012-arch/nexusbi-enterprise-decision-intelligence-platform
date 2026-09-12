from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.knowledge_rag import (
    answer_knowledge_question,
    search_knowledge,
)


router = APIRouter(
    prefix="/api/knowledge",
    tags=["knowledge-rag"],
)


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(
        min_length=2,
        max_length=1000,
    )

    limit: int = Field(
        default=5,
        ge=1,
        le=10,
    )


class KnowledgeAskRequest(BaseModel):
    query: str = Field(
        min_length=2,
        max_length=2000,
    )

    limit: int = Field(
        default=5,
        ge=1,
        le=10,
    )


@router.post("/search")
async def knowledge_search(
    request: KnowledgeSearchRequest,
) -> dict:
    try:
        matches = await search_knowledge(
            query=request.query,
            limit=request.limit,
        )

        return {
            "status": "OK",
            "query": request.query,
            "matches": matches,
            "count": len(matches),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Knowledge search failed: {exc}",
        ) from exc


@router.post("/ask")
async def knowledge_ask(
    request: KnowledgeAskRequest,
) -> dict:
    try:
        return await answer_knowledge_question(
            query=request.query,
            limit=request.limit,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Knowledge RAG failed: {exc}",
        ) from exc