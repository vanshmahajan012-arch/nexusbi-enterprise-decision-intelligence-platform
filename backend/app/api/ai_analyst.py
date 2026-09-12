from __future__ import annotations

import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.ai.business_analyst import (
    answer_business_question,
)
from backend.app.ai.evidence_orchestrator import (
    build_evidence_bundle,
)


router = APIRouter(
    prefix="/api/ai",
    tags=["ai-analyst"],
)


class BusinessQuestionRequest(BaseModel):
    question: str = Field(
        min_length=3,
        max_length=2000,
    )


@router.post("/analyze")
async def analyze_business_question(
    request: BusinessQuestionRequest,
) -> dict:
    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Business question cannot be empty",
        )

    overall_start = time.perf_counter()

    try:
        # -------------------------------------------------
        # 1. Evidence collection timing
        # -------------------------------------------------
        evidence_start = time.perf_counter()

        # Question-aware evidence routing.
        evidence = await build_evidence_bundle(
            question=question,
        )

        evidence_time = (
            time.perf_counter()
            - evidence_start
        )

        # -------------------------------------------------
        # 2. Gemini / AI timing
        # -------------------------------------------------
        ai_start = time.perf_counter()

        result = await answer_business_question(
            question=question,
            evidence=evidence,
        )

        ai_time = (
            time.perf_counter()
            - ai_start
        )

        # -------------------------------------------------
        # 3. Total request timing
        # -------------------------------------------------
        total_time = (
            time.perf_counter()
            - overall_start
        )

        print(
            (
                "[NXUS AI TIMING] "
                f"evidence={evidence_time:.2f}s "
                f"gemini={ai_time:.2f}s "
                f"total={total_time:.2f}s"
            ),
            flush=True,
        )

        return {
            "status": "OK",
            "question": question,
            "answer": result["answer"],
            "provider": result["provider"],
            "model": result["model"],
            "usage": result["usage"],
            "evidence_sections": list(
                evidence.keys()
            ),
            "timing": {
                "evidence_seconds": round(
                    evidence_time,
                    3,
                ),
                "gemini_seconds": round(
                    ai_time,
                    3,
                ),
                "total_seconds": round(
                    total_time,
                    3,
                ),
            },
        }

    except Exception as exc:
        total_time = (
            time.perf_counter()
            - overall_start
        )

        print(
            (
                "[NXUS AI ERROR] "
                f"total={total_time:.2f}s "
                f"error={exc}"
            ),
            flush=True,
        )

        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {exc}",
        ) from exc