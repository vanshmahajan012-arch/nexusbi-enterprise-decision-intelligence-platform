from backend.app.ai.business_analyst import (
    answer_business_question,
)


async def main() -> None:
    evidence = {
        "kpis": {
            "total_revenue": 414700.0,
            "total_orders": 10,
            "total_units": 34,
            "average_order_value": 41470.0,
        },
        "variance": {
            "revenue": {
                "current": 208000.0,
                "previous": 99700.0,
                "change_pct": 108.63,
                "direction": "UP",
            },
            "orders": {
                "current": 4.0,
                "previous": 4.0,
                "change_pct": 0.0,
                "direction": "FLAT",
            },
            "units": {
                "current": 13.0,
                "previous": 17.0,
                "change_pct": -23.53,
                "direction": "DOWN",
            },
            "aov": {
                "current": 52000.0,
                "previous": 24925.0,
                "change_pct": 108.63,
                "direction": "UP",
            },
        },
        "top_drivers": [
            {
                "type": "NEW_DRIVER",
                "driver": "EAST",
                "absolute_change": 91000.0,
                "contribution_pct": 43.75,
            },
            {
                "type": "GROWING_DRIVER",
                "driver": "Laptop",
                "absolute_change": 87000.0,
                "contribution_pct": 41.83,
            },
            {
                "type": "GROWING_DRIVER",
                "driver": "WEST",
                "absolute_change": 83500.0,
                "contribution_pct": 40.14,
            },
        ],
        "anomalies": [
            {
                "metric": "revenue",
                "severity": "CRITICAL",
                "deviation_pct": 53.49,
                "is_anomaly": True,
            },
            {
                "metric": "units",
                "severity": "MAJOR",
                "deviation_pct": -33.33,
                "is_anomaly": True,
            },
        ],
    }

    result = await answer_business_question(
        question=(
            "What is happening to revenue, what are the "
            "strongest drivers, and what should management "
            "pay attention to?"
        ),
        evidence=evidence,
    )

    print("NXUS AI BUSINESS ANALYST TEST")
    print("=============================")
    print("Provider :", result["provider"])
    print("Model    :", result["model"])
    print()
    print("QUESTION")
    print("--------")
    print(result["question"])
    print()
    print("AI ANSWER")
    print("---------")
    print(result["answer"])
    print()
    print("USAGE")
    print("-----")
    print(result["usage"])


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
    