from backend.app.analytics.forecast_engine import (
    forecast_next_period,
)


def main() -> None:
    historical_revenue = [
        82000,
        86000,
        90000,
        95000,
        101000,
    ]

    result = forecast_next_period(
        metric="revenue",
        historical_values=historical_revenue,
    )

    print("NXUS FORECAST ENGINE TEST")
    print("=========================")
    print(f"Metric           : {result.metric}")
    print(
        f"Historical Points: "
        f"{result.historical_points}"
    )
    print(
        f"Last Actual      : "
        f"{result.last_actual}"
    )
    print(
        f"Forecast P50     : "
        f"{result.forecast_p50}"
    )
    print(
        f"Forecast P10     : "
        f"{result.forecast_p10}"
    )
    print(
        f"Forecast P90     : "
        f"{result.forecast_p90}"
    )
    print(
        f"Trend / Period   : "
        f"{result.trend_per_period}"
    )
    print(
        f"Confidence       : "
        f"{result.confidence}%"
    )
    print(
        f"Model            : "
        f"{result.model}"
    )
    print(
        f"Explanation      : "
        f"{result.explanation}"
    )


if __name__ == "__main__":
    main()