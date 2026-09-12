from __future__ import annotations


def scenario_priority(
    impact_pct: float,
    *,
    downside: bool,
) -> str:
    """
    Scenario-specific priority policy.

    The policy is intentionally stricter for downside risk
    because a material negative scenario should surface earlier
    than an equivalent positive scenario.
    """

    magnitude = abs(impact_pct)

    if downside:
        if magnitude >= 25:
            return "CRITICAL"

        if magnitude >= 15:
            return "HIGH"

        if magnitude >= 5:
            return "MEDIUM"

        return "LOW"

    if magnitude >= 30:
        return "HIGH"

    if magnitude >= 15:
        return "MEDIUM"

    if magnitude >= 5:
        return "LOW"

    return "LOW"


def scenario_risk(
    priority: str,
) -> str:
    return {
        "CRITICAL": "HIGH",
        "HIGH": "HIGH",
        "MEDIUM": "MEDIUM",
        "LOW": "LOW",
    }.get(
        priority,
        "LOW",
    )


def scenario_action(
    *,
    target: str,
    direction: str,
    priority: str,
) -> tuple[str, str]:
    if direction == "DOWN":
        if priority in {
            "CRITICAL",
            "HIGH",
        }:
            return (
                f"Protect {target} from downside risk",
                (
                    f"The modeled downside for {target} "
                    "is material enough to require "
                    "management attention."
                ),
            )

        return (
            f"Monitor {target} downside",
            (
                f"The modeled downside for {target} "
                "is noticeable but below the threshold "
                "for immediate intervention."
            ),
        )

    if direction == "UP":
        if priority in {
            "CRITICAL",
            "HIGH",
        }:
            return (
                f"Validate and scale {target} upside",
                (
                    f"The modeled upside for {target} "
                    "is material and should be validated "
                    "before broader scaling."
                ),
            )

        return (
            f"Monitor {target} upside",
            (
                f"The modeled upside for {target} "
                "is positive but should be validated "
                "before significant action."
            ),
        )

    return (
        f"Maintain {target} position",
        (
            f"The modeled change for {target} "
            "does not create a material revenue impact."
        ),
    )