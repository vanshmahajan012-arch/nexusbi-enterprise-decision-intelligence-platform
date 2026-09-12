from backend.app.analytics.anomaly_engine import (
    detect_anomaly,
)


def main() -> None:
    # ---------------------------------------------------------
    # Normal historical revenue pattern
    # ---------------------------------------------------------

    historical_revenue = [
        90000,
        95000,
        98000,
        92000,
        94000,
    ]

    # ---------------------------------------------------------
    # Current value intentionally far from baseline
    # ---------------------------------------------------------

    current_revenue = 40000

    result = detect_anomaly(
        metric="revenue",
        current_value=current_revenue,
        historical_values=historical_revenue,
        z_threshold=2.0,
    )

    print("NXUS ANOMALY ENGINE TEST")
    print("=======================")
    print(f"Metric          : {result.metric}")
    print(f"Current Value   : {result.current_value}")
    print(f"Expected Value  : {result.expected_value:.2f}")
    print(f"Deviation %     : {result.deviation_pct:.2f}%")
    print(f"Z-Score         : {result.z_score:.3f}")
    print(f"Severity        : {result.severity}")
    print(f"Is Anomaly      : {result.is_anomaly}")
    print(f"Explanation     : {result.explanation}")


if __name__ == "__main__":
    main()