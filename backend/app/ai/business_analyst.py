from __future__ import annotations

import json
from typing import Any

from backend.app.ai.provider_router import (
    AIRouter,
)


SYSTEM_PROMPT = """
You are NXUS, an enterprise Business Analysis and Decision Intelligence assistant.

Use ONLY the evidence supplied by NXUS.

Rules:
1. Never invent metrics, facts, causes, or numbers.
2. Distinguish observed facts from inferred explanations.
3. Use exact supplied values.
4. Explain business impact clearly.
5. If evidence is insufficient, say so.
6. Do not claim causality unless the evidence supports it.
7. Be concise and executive-focused.
8. Prefer this structure when useful:
   - What happened
   - Key evidence
   - Likely drivers
   - Risks
   - Recommended next action

Keep the answer focused on the user's actual question.
Do not repeat every piece of evidence.
"""


def _compact_value(
    value: Any,
    *,
    max_list_items: int = 8,
    max_string_length: int = 1200,
) -> Any:
    """
    Reduce prompt size without changing the meaning
    of the supplied evidence.

    Lists are bounded.
    Long text fields are truncated.
    Primitive values are preserved.
    """

    if isinstance(value, dict):
        return {
            str(key): _compact_value(
                item,
                max_list_items=max_list_items,
                max_string_length=max_string_length,
            )
            for key, item in value.items()
        }

    if isinstance(value, list):
        compacted = [
            _compact_value(
                item,
                max_list_items=max_list_items,
                max_string_length=max_string_length,
            )
            for item in value[:max_list_items]
        ]

        if len(value) > max_list_items:
            compacted.append(
                {
                    "_truncated": True,
                    "_remaining_items": (
                        len(value) - max_list_items
                    ),
                }
            )

        return compacted

    if isinstance(value, tuple):
        return _compact_value(
            list(value),
            max_list_items=max_list_items,
            max_string_length=max_string_length,
        )

    if isinstance(value, str):
        if len(value) <= max_string_length:
            return value

        return (
            value[:max_string_length]
            + "... [truncated]"
        )

    return value


def _prepare_evidence(
    evidence: dict[str, Any],
) -> dict[str, Any]:
    """
    Keep the evidence contract intact while making the
    model context substantially smaller.

    High-value analytical sections are retained.
    """

    return {
        "kpis": _compact_value(
            evidence.get("kpis", []),
            max_list_items=8,
        ),
        "business_analytics": _compact_value(
            evidence.get(
                "business_analytics",
                {},
            ),
            max_list_items=8,
        ),
        "variance": _compact_value(
            evidence.get(
                "variance",
                {},
            ),
            max_list_items=12,
        ),
        "drivers": _compact_value(
            evidence.get(
                "drivers",
                {},
            ),
            max_list_items=8,
        ),
        "anomalies": _compact_value(
            evidence.get(
                "anomalies",
                [],
            ),
            max_list_items=8,
        ),
        "forecasts": _compact_value(
            evidence.get(
                "forecasts",
                [],
            ),
            max_list_items=6,
        ),
        "root_cause": _compact_value(
            evidence.get(
                "root_cause",
                {},
            ),
            max_list_items=8,
        ),
    }


def _serialize_evidence(
    evidence: dict[str, Any],
) -> str:
    compact_evidence = _prepare_evidence(
        evidence
    )

    return json.dumps(
        compact_evidence,
        ensure_ascii=False,
        separators=(",", ":"),
        default=str,
    )


def _build_user_prompt(
    question: str,
    evidence: dict[str, Any],
) -> str:
    serialized_evidence = (
        _serialize_evidence(
            evidence
        )
    )

    return (
        "USER BUSINESS QUESTION\n"
        "======================\n"
        f"{question}\n\n"
        "NXUS EVIDENCE\n"
        "=============\n"
        f"{serialized_evidence}\n\n"
        "Answer the question using only "
        "the supplied NXUS evidence.\n"
        "Label inference explicitly.\n"
        'If causality is not established, say: '
        '"Evidence is insufficient to establish causality."\n'
        "Do not invent missing information.\n"
        "Keep the response concise."
    )


async def answer_business_question(
    *,
    question: str,
    evidence: dict[str, Any],
) -> dict[str, Any]:
    question = question.strip()

    if not question:
        raise ValueError(
            "Business question cannot be empty"
        )

    # NXUS provider router:
    # Gemini primary → OpenRouter fallback
    provider = AIRouter()

    response = await provider.generate(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=_build_user_prompt(
            question=question,
            evidence=evidence,
        ),
        temperature=0.1,
    )

    return {
        "question": question,
        "answer": response.content,
        "provider": response.provider,
        "model": response.model,
        "usage": response.usage,
    }