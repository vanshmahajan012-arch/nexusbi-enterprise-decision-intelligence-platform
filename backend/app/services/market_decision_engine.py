from __future__ import annotations

from dataclasses import dataclass


@dataclass
class MarketDecision:
    signal: str
    confidence: float
    risk_level: str
    score: float
    reasons: list[str]

    def to_dict(self) -> dict:
        return {
            "signal": self.signal,
            "confidence": self.confidence,
            "risk_level": self.risk_level,
            "score": self.score,
            "reasons": self.reasons,
        }


def calculate_market_decision(
    *,
    price: float,
    previous_close: float | None,
    change_pct: float | None,
    day_range_pct: float | None,
    range_position_pct: float | None,
    tick_volatility_pct: float | None,
    volume: float | None,
    open_price: float | None,
) -> MarketDecision:
    score = 0.0
    reasons: list[str] = []

    # ---------------------------------------------------------
    # 1. Momentum
    # ---------------------------------------------------------

    if change_pct is not None:
        if change_pct >= 1.0:
            score += 2.0
            reasons.append(
                "Strong positive session momentum"
            )
        elif change_pct >= 0.25:
            score += 1.0
            reasons.append(
                "Positive session momentum"
            )
        elif change_pct <= -1.0:
            score -= 2.0
            reasons.append(
                "Strong negative session momentum"
            )
        elif change_pct <= -0.25:
            score -= 1.0
            reasons.append(
                "Negative session momentum"
            )

    # ---------------------------------------------------------
    # 2. Position inside today's range
    # ---------------------------------------------------------

    if range_position_pct is not None:
        if range_position_pct >= 70:
            score += 1.5
            reasons.append(
                "Price trading near the upper end of the day range"
            )
        elif range_position_pct <= 30:
            score -= 1.0
            reasons.append(
                "Price trading near the lower end of the day range"
            )

    # ---------------------------------------------------------
    # 3. Open vs current price
    # ---------------------------------------------------------

    if open_price is not None and open_price > 0:
        open_change_pct = (
            (price - open_price) / open_price
        ) * 100

        if open_change_pct >= 0.50:
            score += 1.0
            reasons.append(
                "Price is materially above the session open"
            )
        elif open_change_pct <= -0.50:
            score -= 1.0
            reasons.append(
                "Price is materially below the session open"
            )

    # ---------------------------------------------------------
    # 4. Volatility risk
    # ---------------------------------------------------------

    volatility_penalty = 0.0

    if tick_volatility_pct is not None:
        if tick_volatility_pct >= 0.20:
            volatility_penalty = 2.0
            reasons.append(
                "Elevated short-term tick volatility"
            )
        elif tick_volatility_pct >= 0.10:
            volatility_penalty = 1.0
            reasons.append(
                "Moderate short-term tick volatility"
            )

    score -= volatility_penalty

    # ---------------------------------------------------------
    # 5. Session range risk
    # ---------------------------------------------------------

    if day_range_pct is not None:
        if day_range_pct >= 3.0:
            score -= 1.0
            reasons.append(
                "Wide intraday range increases execution risk"
            )

    # ---------------------------------------------------------
    # 6. Determine signal
    # ---------------------------------------------------------

    if score >= 2.0:
        signal = "BUY"
    elif score <= -2.0:
        signal = "SELL"
    else:
        signal = "HOLD"

    # ---------------------------------------------------------
    # 7. Confidence
    #
    # Score magnitude drives directional confidence.
    # Volatility reduces confidence.
    # ---------------------------------------------------------

    base_confidence = 55.0 + (
        min(abs(score), 5.0) * 7.5
    )

    confidence_penalty = min(
        volatility_penalty * 8.0,
        20.0,
    )

    confidence = base_confidence - confidence_penalty

    confidence = max(
        50.0,
        min(confidence, 95.0),
    )

    # ---------------------------------------------------------
    # 8. Risk classification
    # ---------------------------------------------------------

    risk_score = 0

    if tick_volatility_pct is not None:
        if tick_volatility_pct >= 0.20:
            risk_score += 2
        elif tick_volatility_pct >= 0.10:
            risk_score += 1

    if day_range_pct is not None:
        if day_range_pct >= 3.0:
            risk_score += 2
        elif day_range_pct >= 2.0:
            risk_score += 1

    if risk_score >= 3:
        risk_level = "HIGH"
    elif risk_score >= 1:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # ---------------------------------------------------------
    # 9. Fallback reasoning
    # ---------------------------------------------------------

    if not reasons:
        reasons.append(
            "No strong directional signal detected"
        )

    return MarketDecision(
        signal=signal,
        confidence=round(confidence, 2),
        risk_level=risk_level,
        score=round(score, 2),
        reasons=reasons,
    )