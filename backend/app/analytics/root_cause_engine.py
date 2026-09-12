from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class RootCauseCandidate:
    cause_type: str
    cause: str
    evidence: list[str]
    impact_score: float
    confidence: float
    severity: str
    explanation: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "cause_type": self.cause_type,
            "cause": self.cause,
            "evidence": self.evidence,
            "impact_score": round(
                self.impact_score,
                2,
            ),
            "confidence": round(
                self.confidence,
                2,
            ),
            "severity": self.severity,
            "explanation": self.explanation,
        }


def _severity_from_impact(
    impact_score: float,
) -> str:
    if impact_score >= 75:
        return "CRITICAL"

    if impact_score >= 50:
        return "MAJOR"

    if impact_score >= 25:
        return "MINOR"

    return "LOW"


def _confidence_from_evidence(
    evidence_count: int,
    impact_score: float,
) -> float:
    evidence_factor = min(
        evidence_count / 4.0,
        1.0,
    )

    impact_factor = min(
        abs(impact_score) / 100.0,
        1.0,
    )

    confidence = (
        0.50
        + (0.30 * evidence_factor)
        + (0.20 * impact_factor)
    )

    return min(
        max(confidence * 100, 0.0),
        99.0,
    )


def build_root_cause_candidate(
    *,
    cause_type: str,
    cause: str,
    evidence: list[str],
    impact_score: float,
) -> RootCauseCandidate:
    severity = _severity_from_impact(
        abs(impact_score)
    )

    confidence = _confidence_from_evidence(
        len(evidence),
        impact_score,
    )

    explanation = (
        f"{cause} is identified as a "
        f"{cause_type.lower()} root-cause candidate "
        f"with an impact score of "
        f"{abs(impact_score):.1f}. "
        f"Evidence count: {len(evidence)}."
    )

    return RootCauseCandidate(
        cause_type=cause_type,
        cause=cause,
        evidence=evidence,
        impact_score=impact_score,
        confidence=confidence,
        severity=severity,
        explanation=explanation,
    )


def rank_root_causes(
    candidates: list[RootCauseCandidate],
    limit: int = 5,
) -> list[RootCauseCandidate]:
    return sorted(
        candidates,
        key=lambda candidate: (
            abs(candidate.impact_score),
            candidate.confidence,
        ),
        reverse=True,
    )[:limit]


def generate_root_cause_summary(
    candidates: list[RootCauseCandidate],
) -> str:
    if not candidates:
        return (
            "No root-cause candidates were identified "
            "from the available evidence."
        )

    ranked = rank_root_causes(
        candidates,
        limit=3,
    )

    summaries: list[str] = []

    for candidate in ranked:
        summaries.append(
            (
                f"{candidate.cause} "
                f"(confidence "
                f"{candidate.confidence:.1f}%)"
            )
        )

    return (
        "Top root-cause candidates: "
        + "; ".join(summaries)
        + "."
    )