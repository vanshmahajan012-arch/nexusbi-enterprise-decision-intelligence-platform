from __future__ import annotations

from typing import Any

from backend.app.ai.provider_router import AIRouter
from backend.app.db.postgres import fetch_all


async def search_knowledge(
    query: str,
    limit: int = 5,
) -> list[dict[str, Any]]:
    query = query.strip()

    if not query:
        return []

    safe_limit = max(
        1,
        min(limit, 10),
    )

    rows = await fetch_all(
        """
        SELECT
            c.chunk_id,
            c.document_id,
            c.chunk_index,
            c.chunk_content,
            d.title,
            d.category,
            d.author,
            ts_rank(
                to_tsvector(
                    'english',
                    c.chunk_content
                ),
                plainto_tsquery(
                    'english',
                    %s
                )
            ) AS score
        FROM knowledge.document_chunks c
        JOIN knowledge.documents d
            ON d.document_id = c.document_id
        WHERE
            to_tsvector(
                'english',
                c.chunk_content
            ) @@ plainto_tsquery(
                'english',
                %s
            )
        ORDER BY score DESC
        LIMIT %s
        """,
        (
            query,
            query,
            safe_limit,
        ),
    )

    return [
        {
            "chunk_id": str(row[0]),
            "document_id": str(row[1]),
            "chunk_index": row[2],
            "content": row[3],
            "title": row[4],
            "category": row[5],
            "author": row[6],
            "score": float(
                row[7] or 0
            ),
        }
        for row in rows
    ]


async def answer_knowledge_question(
    query: str,
    limit: int = 5,
) -> dict[str, Any]:
    matches = await search_knowledge(
        query=query,
        limit=limit,
    )

    if not matches:
        return {
            "status": "NO_MATCHES",
            "question": query,
            "answer": (
                "No relevant knowledge-base evidence "
                "was found for this question."
            ),
            "sources": [],
        }

    context = "\n\n".join(
        (
            f"[SOURCE {index + 1}]\n"
            f"Title: {item['title']}\n"
            f"Category: {item['category']}\n"
            f"Author: {item['author']}\n"
            f"Content: {item['content']}"
        )
        for index, item in enumerate(
            matches
        )
    )

    system_prompt = """
You are NXUS Knowledge RAG.

Answer ONLY from the supplied knowledge-base evidence.

Rules:
1. Never invent facts.
2. Do not claim information that is absent from the sources.
3. Distinguish observed/source-backed facts from inference.
4. Keep the answer concise and useful.
5. Cite sources inline using [SOURCE 1], [SOURCE 2], etc.
6. If the evidence does not answer the question, explicitly say so.
"""

    user_prompt = f"""
USER QUESTION
=============
{query}

RETRIEVED KNOWLEDGE
===================
{context}

Answer the user question using only the retrieved knowledge.
"""

    provider = AIRouter()

    response = await provider.generate(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.1,
    )

    return {
        "status": "OK",
        "question": query,
        "answer": response.content,
        "provider": response.provider,
        "model": response.model,
        "usage": response.usage,
        "sources": matches,
    }