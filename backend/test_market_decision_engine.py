from backend.app.services.market_decision_engine import (
    calculate_market_decision,
)


def main() -> None:
    decision = calculate_market_decision(
        price=315.47,
        previous_close=316.82999,
        change_pct=-0.45607633,
        day_range_pct=1.7391718683,
        range_position_pct=12.1461187215,
        tick_volatility_pct=0.0082333558,
        volume=876940,
        open_price=317.455,
    )

    print("Market Decision")
    print("================")
    print(f"Signal      : {decision.signal}")
    print(f"Confidence  : {decision.confidence}%")
    print(f"Risk Level  : {decision.risk_level}")
    print(f"Score       : {decision.score}")
    print("Reasons     :")

    for reason in decision.reasons:
        print(f"  - {reason}")


if __name__ == "__main__":
    main()
    