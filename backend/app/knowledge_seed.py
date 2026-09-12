from __future__ import annotations

import asyncio
import uuid

from backend.app.db.postgres import execute


DOCUMENTS = [
    {
        "title": "APAC Gateway Incident Post-Mortem",
        "category": "POST_MORTEM",
        "source_url": "internal://knowledge/apac-gateway-incident",
        "author": "NXUS Reliability Engineering",
        "version": "1.0",
        "status": "ACTIVE",
        "chunks": [
            (
                "The APAC checkout conversion dip was associated with "
                "elevated gateway latency during a Cloudflare Tokyo edge "
                "certificate renegotiation event."
            ),
            (
                "Observed telemetry indicated approximately +240ms "
                "additional latency during the incident window, followed "
                "by thread pool starvation in the affected checkout path."
            ),
            (
                "The incident impacted checkout reliability and conversion "
                "performance in the APAC region. Recovery required "
                "stabilizing the edge path and restoring available worker "
                "capacity."
            ),
        ],
    },
    {
        "title": "Enterprise ARR Metric Taxonomy",
        "category": "METRIC_TAXONOMY",
        "source_url": "internal://knowledge/arr-metric-taxonomy",
        "author": "NXUS Finance Analytics",
        "version": "1.0",
        "status": "ACTIVE",
        "chunks": [
            (
                "Annualized Recurring Revenue is an enterprise metric used "
                "to represent the annualized value of qualifying recurring "
                "revenue under the approved finance definition."
            ),
            (
                "Contractual credits and disputed overages must be "
                "identified separately from qualifying recurring revenue "
                "when calculating the approved ARR measure."
            ),
            (
                "Metric interpretation must distinguish observed revenue "
                "from management-adjusted or policy-defined metrics."
            ),
        ],
    },
    {
        "title": "Checkout Operations SOP",
        "category": "SOP",
        "source_url": "internal://knowledge/checkout-operations-sop",
        "author": "NXUS Operations",
        "version": "1.0",
        "status": "ACTIVE",
        "chunks": [
            (
                "Checkout incidents should be triaged using conversion "
                "rate, request failure rate, gateway latency, regional "
                "distribution, and recent deployment activity."
            ),
            (
                "When latency rises materially, operations should inspect "
                "gateway health, worker utilization, error codes, and "
                "regional telemetry before escalating the incident."
            ),
            (
                "Operational recommendations should be grounded in "
                "observed telemetry and clearly distinguish confirmed "
                "facts from hypotheses."
            ),
        ],
    },
]


async def seed_documents() -> None:
    for document in DOCUMENTS:
        document_id = uuid.uuid4()

        await execute(
            """
            INSERT INTO knowledge.documents (
                document_id,
                title,
                category,
                source_url,
                author,
                version,
                status
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                document_id,
                document["title"],
                document["category"],
                document["source_url"],
                document["author"],
                document["version"],
                document["status"],
            ),
        )

        for chunk_index, chunk_content in enumerate(
            document["chunks"]
        ):
            await execute(
                """
                INSERT INTO knowledge.document_chunks (
                    chunk_id,
                    document_id,
                    chunk_index,
                    chunk_content,
                    metadata
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s::jsonb
                )
                """,
                (
                    uuid.uuid4(),
                    document_id,
                    chunk_index,
                    chunk_content,
                    "{}",
                ),
            )

    print(
        f"Seeded {len(DOCUMENTS)} knowledge documents."
    )


if __name__ == "__main__":
    asyncio.run(
        seed_documents()
    )