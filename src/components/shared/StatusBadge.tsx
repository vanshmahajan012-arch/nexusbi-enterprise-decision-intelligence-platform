import React from "react";

type StatusType =
  | "CRITICAL"
  | "MAJOR"
  | "MINOR"
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ACTIVE"
  | "RESOLVED"
  | "INVESTIGATING"
  | "MITIGATED"
  | "P1"
  | "P2"
  | "P3"
  | "P4"
  | "NORMAL"
  | "DEGRADED"
  | "VERIFIED"
  | "MONITORING"
  | "ROLLED_BACK"
  | "MUTED"
  | "PROCESSING"
  | "HEALTHY";

interface StatusBadgeProps {
  type: StatusType;
  label?: string;
  size?: "sm" | "md";
  showDot?: boolean;
}

export const StatusBadge: React.FC<
  StatusBadgeProps
> = ({
  type,
  label,
  size = "sm",
  showDot = true,
}) => {
  const displayLabel =
    label || type;

  let colorClasses =
    "bg-slate-800/80 text-slate-300 border-slate-700/80";

  let dotColor =
    "bg-slate-400";

  let shouldPulse = false;

  switch (type) {
    case "CRITICAL":
    case "P1":
      colorClasses =
        "bg-rose-500/10 text-rose-400 border-rose-500/30";
      dotColor =
        "bg-rose-500";
      shouldPulse = true;
      break;

    case "MAJOR":
    case "P2":
    case "WARNING":
    case "DEGRADED":
      colorClasses =
        "bg-amber-500/10 text-amber-400 border-amber-500/30";
      dotColor =
        "bg-amber-400";
      break;

    case "MINOR":
    case "P3":
    case "INFO":
      colorClasses =
        "bg-blue-500/10 text-blue-400 border-blue-500/30";
      dotColor =
        "bg-blue-400";
      break;

    case "SUCCESS":
    case "RESOLVED":
    case "NORMAL":
    case "P4":
    case "VERIFIED":
    case "HEALTHY":
      colorClasses =
        "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      dotColor =
        "bg-emerald-400";
      break;

    case "ACTIVE":
    case "INVESTIGATING":
    case "MITIGATED":
    case "PROCESSING":
      colorClasses =
        "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      dotColor =
        "bg-cyan-400";
      shouldPulse = true;
      break;

    case "MONITORING":
      colorClasses =
        "bg-violet-500/10 text-violet-400 border-violet-500/30";
      dotColor =
        "bg-violet-400";
      break;

    case "ROLLED_BACK":
      colorClasses =
        "bg-orange-500/10 text-orange-400 border-orange-500/30";
      dotColor =
        "bg-orange-400";
      break;

    case "MUTED":
      colorClasses =
        "bg-slate-500/10 text-slate-400 border-slate-500/30";
      dotColor =
        "bg-slate-500";
      break;

    default:
      break;
  }

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-xs"
      : "px-2.5 py-1 text-xs font-medium";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-mono uppercase tracking-wider font-semibold whitespace-nowrap ${colorClasses} ${sizeClasses}`}
    >
      {showDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotColor} ${
            shouldPulse
              ? "animate-pulse"
              : ""
          }`}
        />
      )}

      {displayLabel}
    </span>
  );
};