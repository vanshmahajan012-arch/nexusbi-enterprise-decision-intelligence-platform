from __future__ import annotations

from dataclasses import dataclass
from statistics import pstdev


@dataclass
class MarketIntelligence:
    day_change_pct: float | None
    day_range_pct: float | None
    range_position_pct: float | None
    tick_volatility_pct: float | None
    volume: float | None

    def to_dict(self) -> dict:
        return {
            "day_change_pct": self.day_change_pct,
            "day_range_pct": self.day_range_pct,
            "range_position_pct": self.range_position_pct,
            "tick_volatility_pct": self.tick_volatility_pct,
            "volume": self.volume,
        }


def calculate_market_intelligence(
    *,
    price: float,
    open_price: float | None,
    high_price: float | None,
    low_price: float | None,
    percent_change: float | None,
    volume: float | None,
    tick_prices: list[float] | None = None,
) -> MarketIntelligence:
    # ---------------------------------------------------------
    # Day Change
    # ---------------------------------------------------------

    day_change_pct = percent_change

    # ---------------------------------------------------------
    # Day Range %
    #
    # (High - Low) / Low * 100
    # ---------------------------------------------------------

    day_range_pct = None

    if (
        high_price is not None
        and low_price is not None
        and low_price > 0
    ):
        day_range_pct = (
            (high_price - low_price)
            / low_price
        ) * 100

    # ---------------------------------------------------------
    # Current Price Position in Day Range
    #
    # 0%  = at day low
    # 100% = at day high
    # ---------------------------------------------------------

    range_position_pct = None

    if (
        high_price is not None
        and low_price is not None
        and high_price > low_price
    ):
        range_position_pct = (
            (price - low_price)
            / (high_price - low_price)
        ) * 100

        range_position_pct = max(
            0.0,
            min(100.0, range_position_pct),
        )

    # ---------------------------------------------------------
    # Tick Volatility
    #
    # Uses percentage returns between consecutive live ticks.
    # ---------------------------------------------------------

    tick_volatility_pct = None

    if tick_prices and len(tick_prices) >= 2:
        returns: list[float] = []

        previous = tick_prices[0]

        for current in tick_prices[1:]:
            if previous != 0:
                returns.append(
                    ((current - previous) / previous)
                    * 100
                )

            previous = current

        if returns:
            tick_volatility_pct = pstdev(returns)

    return MarketIntelligence(
        day_change_pct=day_change_pct,
        day_range_pct=day_range_pct,
        range_position_pct=range_position_pct,
        tick_volatility_pct=tick_volatility_pct,
        volume=volume,
    )