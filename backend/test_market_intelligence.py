from backend.app.services.market_intelligence import (
    calculate_market_intelligence,
)


def main() -> None:
    result = calculate_market_intelligence(
        price=315.22,
        open_price=317.46,
        high_price=320.28,
        low_price=314.81,
        percent_change=-0.44,
        volume=858100,
        tick_prices=[
            315.80,
            315.60,
            315.75,
            315.30,
            315.22,
        ],
    )

    print(result.to_dict())


if __name__ == "__main__":
    main()
    