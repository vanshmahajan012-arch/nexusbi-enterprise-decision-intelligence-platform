import React, { useState } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Database,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  TrendingUp,
  Target,
  ShieldAlert,
  Lightbulb,
  Activity,
  Brain,
  Sliders,
  Gauge,
} from "lucide-react";

import { ScreenId } from "../../types";
import {
  apiFetch,
  recordSecurityEvent,
} from "../../services/api";

interface ActionShortcut {
  label: string;
  screen: ScreenId;
  icon:
    | "decision"
    | "scenario"
    | "root-cause"
    | "anomaly"
    | "forecast";
}

interface DecisionContext {
  title: string;
  priority: string;
  riskLevel: string;
  confidence: number;
  rationale: string;
  relatedMetrics: string[];
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  provider?: string;
  model?: string;
  sources?: {
    name: string;
  }[];
  suggestedFollowUps?: string[];
  actionShortcuts?: ActionShortcut[];
  decisionContext?: DecisionContext | null;
}

interface AIAnalystScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenScenario: (driver?: string) => void;
}

interface AIAnalyzeResponse {
  status: string;
  question: string;
  answer: string;
  provider: string;
  model: string;
  usage?: {
    prompt_token_count?: number;
    candidates_token_count?: number;
    total_token_count?: number;
  } | null;
  evidence_sections?: string[];
}

interface DecisionsResponse {
  status: string;
  decision_count: number;
  critical_count: number;
  high_priority_count: number;
  decisions: {
    decision_type: string;
    title: string;
    priority: string;
    rationale: string;
    evidence: string[];
    expected_impact: string;
    risk_level: string;
    confidence: number;
    related_metrics: string[];
    event_group: string;
  }[];
  summary: string;
}

const DEFAULT_FOLLOW_UPS = [
  "What are the biggest revenue drivers?",
  "What anomalies should management investigate?",
  "What does the current forecast suggest?",
  "What are the strongest root-cause candidates?",
];

const DRIVER_NAMES = [
  "Laptop",
  "Monitor",
  "Mouse",
  "Keyboard",
  "EAST",
  "WEST",
  "NORTH",
  "SOUTH",
];

const sectionConfig: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    className: string;
  }
> = {
  "what happened": {
    label: "WHAT HAPPENED",
    icon: <Activity className="w-3.5 h-3.5" />,
    className: "text-[#00F4FE]",
  },

  "key evidence": {
    label: "KEY EVIDENCE",
    icon: <Target className="w-3.5 h-3.5" />,
    className: "text-blue-300",
  },

  "likely drivers": {
    label: "LIKELY DRIVERS",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    className: "text-emerald-300",
  },

  risks: {
    label: "RISKS",
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    className: "text-amber-300",
  },

  "recommended next action": {
    label: "RECOMMENDED ACTIONS",
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    className: "text-cyan-300",
  },

  "secondary concern": {
    label: "SECONDARY CONCERN",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    className: "text-orange-300",
  },
};

function normalizeHeading(
  text: string,
): string {
  return text
    .replace(/^#+\s*/, "")
    .replace(/\*+/g, "")
    .trim()
    .toLowerCase();
}

function renderInlineText(
  text: string,
): React.ReactNode[] {
  const parts =
    text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (
      part.startsWith("**") &&
      part.endsWith("**")
    ) {
      return (
        <strong
          key={index}
          className="font-semibold text-white"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }

    return (
      <React.Fragment key={index}>
        {part}
      </React.Fragment>
    );
  });
}

function renderAIResponse(
  text: string,
) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n");

  const sections: {
    heading?: string;
    lines: string[];
  }[] = [];

  let currentSection: {
    heading?: string;
    lines: string[];
  } = {
    lines: [],
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (
        currentSection.lines.length > 0
      ) {
        sections.push(currentSection);
        currentSection = {
          lines: [],
        };
      }

      continue;
    }

    if (
      /^#{2,4}\s+/.test(line) ||
      /^\*\*[^*]+\*\*$/.test(line)
    ) {
      if (
        currentSection.lines.length > 0
      ) {
        sections.push(currentSection);
      }

      currentSection = {
        heading:
          normalizeHeading(line),
        lines: [],
      };

      continue;
    }

    currentSection.lines.push(line);
  }

  if (
    currentSection.lines.length > 0
  ) {
    sections.push(currentSection);
  }

  return (
    <div className="space-y-3">
      {sections.map(
        (section, sectionIndex) => {
          const config =
            section.heading
              ? sectionConfig[
                  section.heading
                ]
              : undefined;

          return (
            <div
              key={sectionIndex}
              className={
                config
                  ? "rounded-lg border border-white/8 bg-black/20 p-3 space-y-2"
                  : "space-y-2"
              }
            >
              {section.heading && (
                <div
                  className={`flex items-center gap-2 text-[10px] font-mono font-bold tracking-widest ${
                    config?.className ??
                    "text-slate-300"
                  }`}
                >
                  {config?.icon}

                  <span>
                    {config?.label ??
                      section.heading.toUpperCase()}
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                {section.lines.map(
                  (
                    line,
                    lineIndex,
                  ) => {
                    const isBullet =
                      /^[-*â€¢]\s+/.test(
                        line,
                      );

                    const isNumbered =
                      /^\d+\.\s+/.test(
                        line,
                      );

                    const cleanLine =
                      isBullet
                        ? line.replace(
                            /^[-*â€¢]\s+/,
                            "",
                          )
                        : isNumbered
                          ? line.replace(
                              /^\d+\.\s+/,
                              "",
                            )
                          : line;

                    if (isBullet) {
                      return (
                        <div
                          key={
                            lineIndex
                          }
                          className="flex gap-2 text-xs leading-relaxed text-slate-300"
                        >
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#00F4FE] shrink-0" />
                          <span>
                            {renderInlineText(
                              cleanLine,
                            )}
                          </span>
                        </div>
                      );
                    }

                    if (
                      isNumbered
                    ) {
                      const number =
                        line.match(
                          /^\d+/,
                        )?.[0] ?? "â€¢";

                      return (
                        <div
                          key={
                            lineIndex
                          }
                          className="flex gap-2 text-xs leading-relaxed text-slate-300"
                        >
                          <span className="w-5 h-5 rounded-md border border-[#00F4FE]/25 bg-[#00F4FE]/8 text-[#00F4FE] flex items-center justify-center text-[9px] font-mono shrink-0">
                            {number}
                          </span>

                          <span className="pt-0.5">
                            {renderInlineText(
                              cleanLine,
                            )}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <p
                        key={
                          lineIndex
                        }
                        className="text-xs leading-relaxed text-slate-300"
                      >
                        {renderInlineText(
                          cleanLine,
                        )}
                      </p>
                    );
                  },
                )}
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}

function buildEvidenceSources(
  sections?: string[],
): { name: string }[] {
  if (
    !sections ||
    sections.length === 0
  ) {
    return [];
  }

  return sections.map(
    (section) => ({
      name: section,
    }),
  );
}

function detectDriver(
  question: string,
  answer: string,
): string | undefined {
  const combined =
    `${question} ${answer}`;

  return DRIVER_NAMES.find(
    (driver) =>
      new RegExp(
        `\\b${driver}\\b`,
        "i",
      ).test(combined),
  );
}

function buildActionShortcuts(
  question: string,
  answer: string,
): ActionShortcut[] {
  const normalized =
    `${question} ${answer}`.toLowerCase();

  const shortcuts: ActionShortcut[] =
    [];

  if (
    normalized.includes("decision") ||
    normalized.includes("recommend") ||
    normalized.includes("management should") ||
    normalized.includes("focus on")
  ) {
    shortcuts.push({
      label:
        "Review Decision Intelligence",
      screen:
        "decision-intelligence",
      icon: "decision",
    });
  }

  if (
    normalized.includes("scenario") ||
    normalized.includes("what-if") ||
    normalized.includes("what if") ||
    normalized.includes("simulate") ||
    normalized.includes("impact")
  ) {
    shortcuts.push({
      label:
        "Open Scenario Simulator",
      screen:
        "scenario-simulator",
      icon: "scenario",
    });
  }

  if (
    normalized.includes("root cause") ||
    normalized.includes("causal") ||
    normalized.includes("why did") ||
    normalized.includes("why is")
  ) {
    shortcuts.push({
      label:
        "Open Root Cause Analysis",
      screen:
        "root-cause-analysis",
      icon: "root-cause",
    });
  }

  if (
    normalized.includes("anomaly") ||
    normalized.includes("abnormal") ||
    normalized.includes("unusual")
  ) {
    shortcuts.push({
      label:
        "Open Anomaly Center",
      screen:
        "anomaly-center",
      icon: "anomaly",
    });
  }

  if (
    normalized.includes("forecast") ||
    normalized.includes("predict") ||
    normalized.includes("future")
  ) {
    shortcuts.push({
      label:
        "Open Forecasts & Prediction",
      screen:
        "forecasts-prediction",
      icon: "forecast",
    });
  }

  return shortcuts.slice(
    0,
    4,
  );
}

function shortcutIcon(
  type: ActionShortcut["icon"],
) {
  switch (type) {
    case "decision":
      return (
        <Brain className="w-3.5 h-3.5" />
      );

    case "scenario":
      return (
        <Sliders className="w-3.5 h-3.5" />
      );

    case "root-cause":
      return (
        <Target className="w-3.5 h-3.5" />
      );

    case "anomaly":
      return (
        <ShieldAlert className="w-3.5 h-3.5" />
      );

    case "forecast":
      return (
        <Gauge className="w-3.5 h-3.5" />
      );

    default:
      return (
        <ArrowRight className="w-3.5 h-3.5" />
      );
  }
}

function getDecisionRiskClass(
  risk: string,
): string {
  if (risk === "HIGH") {
    return "text-rose-300 border-rose-400/20 bg-rose-400/10";
  }

  if (risk === "MEDIUM") {
    return "text-amber-300 border-amber-400/20 bg-amber-400/10";
  }

  return "text-emerald-300 border-emerald-400/20 bg-emerald-400/10";
}

async function fetchDecisionContext(): Promise<
  DecisionContext | null
> {
  try {
    const response =
      await apiFetch(
        "/api/decisions",
      );

    if (!response.ok) {
      return null;
    }

    const data =
      (await response.json()) as DecisionsResponse;

    const firstDecision =
      data.decisions?.[0];

    if (!firstDecision) {
      return null;
    }

    return {
      title:
        firstDecision.title,
      priority:
        firstDecision.priority,
      riskLevel:
        firstDecision.risk_level,
      confidence:
        firstDecision.confidence,
      rationale:
        firstDecision.rationale,
      relatedMetrics:
        firstDecision.related_metrics ??
        [],
    };
  } catch {
    return null;
  }
}

export const AIAnalystScreen: React.FC<
  AIAnalystScreenProps
> = ({
  onNavigate,
  onOpenScenario,
}) => {
  const [messages, setMessages] =
    useState<Message[]>([
      {
        id: "msg-1",
        sender: "ai",
        text:
          "Hello, I'm **NXUS AI Analyst**.\n\n" +
          "I can analyze the business evidence available in NXUS, including KPIs, variance, drivers, anomalies, forecasts, root-cause candidates, and current decisions.",
        timestamp:
          "Just now",
        suggestedFollowUps:
          DEFAULT_FOLLOW_UPS,
      },
    ]);

  const [input, setInput] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [copiedId, setCopiedId] =
    useState<string | null>(
      null,
    );

  const handleSend = async (
    queryText?: string,
  ) => {
    const textToSend = (
      queryText !== undefined
        ? queryText
        : input
    ).trim();

    if (
      !textToSend ||
      isLoading
    ) {
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp:
        new Date().toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        ),
    };

    setMessages(
      (previous) => [
        ...previous,
        userMessage,
      ],
    );

    setInput("");
    setIsLoading(true);

    try {
      const response =
        await apiFetch(
          "/api/ai/analyze",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              question:
                textToSend,
            }),
          },
        );

      if (!response.ok) {
        let detail =
          `AI analysis failed (${response.status})`;

        try {
          const errorData =
            await response.json();

          if (
            typeof errorData?.detail ===
            "string"
          ) {
            detail =
              errorData.detail;
          }
        } catch {
          // Keep default detail.
        }

        throw new Error(
          detail,
        );
      }

      const data =
        (await response.json()) as AIAnalyzeResponse;

      const answer =
        data.answer ??
        "Analysis completed, but no answer was returned.";

      void recordSecurityEvent(
        "FEATURE_USED",
        {
          feature: "ai-analyst",
          action: "analysis_completed",
          question_length: textToSend.length,
        },
      ).catch(() => {
        // Activity logging must never block AI analysis.
      });

      const detectedDriver =
        detectDriver(
          textToSend,
          answer,
        );

      const decisionContext =
        await fetchDecisionContext();

      const actionShortcuts =
        buildActionShortcuts(
          textToSend,
          answer,
        );

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: answer,
        timestamp:
          new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            },
          ),
        provider:
          data.provider,
        model:
          data.model,
        sources:
          buildEvidenceSources(
            data.evidence_sections,
          ),
        suggestedFollowUps:
          DEFAULT_FOLLOW_UPS,
        actionShortcuts,
        decisionContext,
      };

      // Keep detected driver available for the scenario action.
      // The click handler below uses the current answer/question
      // to select the relevant driver.
      void detectedDriver;

      setMessages(
        (previous) => [
          ...previous,
          aiMessage,
        ],
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error";

      setMessages(
        (previous) => [
          ...previous,
          {
            id: `ai-error-${Date.now()}`,
            sender: "ai",
            text:
              "### Analysis Error\n\n" +
              "I could not complete the analysis.\n\n" +
              `**Reason:** ${message}`,
            timestamp:
              new Date().toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
              ),
            suggestedFollowUps: [],
          },
        ],
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (
    text: string,
    id: string,
  ) => {
    try {
      await navigator.clipboard.writeText(
        text,
      );

      setCopiedId(id);

      setTimeout(
        () =>
          setCopiedId(null),
        2000,
      );
    } catch {
      // Clipboard unavailable.
    }
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200 flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#111319] border border-white/8 rounded-xl px-5 py-3.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00F4FE] to-[#3B82F6] flex items-center justify-center shadow-md shadow-[#00F4FE]/20">
            <Sparkles className="w-4 h-4 text-black font-bold" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white font-mono">
                NXUS AI Analyst
              </h1>

              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00F4FE]/15 border border-[#00F4FE]/30 text-[#00F4FE] font-mono font-semibold">
                GEMINI 2.5 FLASH
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-mono">
              Evidence-grounded analysis connected to NXUS decisions and scenarios
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: "msg-init",
                sender: "ai",
                text:
                  "Chat session cleared. How can I assist with your business metrics today?",
                timestamp:
                  "Just now",
                suggestedFollowUps:
                  DEFAULT_FOLLOW_UPS,
              },
            ])
          }
          className="p-1.5 rounded-lg bg-[#181B24] hover:bg-[#202532] border border-white/10 text-slate-400 hover:text-white text-xs transition-colors"
          title="Clear Conversation"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1 py-2">
        {messages.map(
          (message) => {
            const isAi =
              message.sender ===
              "ai";

            return (
              <div
                key={
                  message.id
                }
                className={`flex gap-3 ${
                  isAi
                    ? "items-start"
                    : "items-start flex-row-reverse"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
                    isAi
                      ? "bg-gradient-to-br from-[#00F4FE] to-[#3B82F6] text-black shadow-md shadow-[#00F4FE]/20"
                      : "bg-slate-800 text-slate-200 border border-white/12"
                  }`}
                >
                  {isAi ? (
                    <Bot className="w-4 h-4 text-black" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>

                {/* Message */}
                <div
                  className={`max-w-4xl rounded-xl p-4 text-xs leading-relaxed space-y-3 ${
                    isAi
                      ? "ai-glow-card text-slate-200 shadow-xl"
                      : "bg-[#1A1E29] text-white border border-white/12"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 text-[10px] text-slate-500 font-mono border-b border-white/6 pb-2">
                    <div className="flex items-center gap-2">
                      <span>
                        {isAi
                          ? "NXUS AI Engine"
                          : "You"}
                      </span>

                      {isAi &&
                        message.provider && (
                          <span className="text-[#00F4FE]">
                            {
                              message.provider
                            }
                          </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span>
                        {
                          message.timestamp
                        }
                      </span>

                      {isAi && (
                        <button
                          onClick={() =>
                            handleCopy(
                              message.text,
                              message.id,
                            )
                          }
                          className="hover:text-white transition-colors"
                          title="Copy"
                        >
                          {copiedId ===
                          message.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {isAi ? (
                    renderAIResponse(
                      message.text,
                    )
                  ) : (
                    <div className="text-xs leading-relaxed whitespace-pre-line">
                      {message.text}
                    </div>
                  )}

                  {isAi &&
                    message.model && (
                      <div className="text-[9px] font-mono text-slate-500">
                        Model:{" "}
                        {
                          message.model
                        }
                      </div>
                    )}

                  {/* Decision context */}
                  {isAi &&
                    message.decisionContext && (
                      <div className="rounded-xl border border-[#00F4FE]/15 bg-[#00F4FE]/5 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-wider text-[#00F4FE]">
                            <Brain className="w-3.5 h-3.5" />
                            LIVE DECISION CONTEXT
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold ${getDecisionRiskClass(
                              message
                                .decisionContext
                                .riskLevel,
                            )}`}
                          >
                            {
                              message
                                .decisionContext
                                .riskLevel
                            }{" "}
                            RISK
                          </span>
                        </div>

                        <div className="text-sm font-semibold text-white">
                          {
                            message
                              .decisionContext
                              .title
                          }
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono">
                          {
                            message
                              .decisionContext
                              .priority
                          }{" "}
                          priority Â·{" "}
                          {
                            message
                              .decisionContext
                              .confidence
                          }
                          % confidence
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {
                            message
                              .decisionContext
                              .rationale
                          }
                        </p>
                      </div>
                    )}

                  {/* Action bridge */}
                  {isAi &&
                    message.actionShortcuts &&
                    message.actionShortcuts
                      .length > 0 && (
                      <div className="pt-2 border-t border-white/6 space-y-2">
                        <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                          NXUS Action Bridge
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {message.actionShortcuts.map(
                            (shortcut) => {
                              const isScenario =
                                shortcut.icon ===
                                "scenario";

                              return (
                                <button
                                  key={`${shortcut.screen}-${shortcut.label}`}
                                  onClick={() => {
                                    if (
                                      isScenario
                                    ) {
                                      const driver =
                                        detectDriver(
                                          "",
                                          message.text,
                                        );

                                      onOpenScenario(
                                        driver,
                                      );

                                      return;
                                    }

                                    onNavigate(
                                      shortcut.screen,
                                    );
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00F4FE]/10 hover:bg-[#00F4FE]/20 border border-[#00F4FE]/25 text-[#00F4FE] font-mono font-semibold transition-colors"
                                >
                                  {shortcutIcon(
                                    shortcut.icon,
                                  )}

                                  <span>
                                    {
                                      shortcut.label
                                    }
                                  </span>

                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              );
                            },
                          )}
                        </div>
                      </div>
                    )}

                  {/* Evidence */}
                  {message.sources &&
                    message.sources.length >
                      0 && (
                      <div className="pt-2 border-t border-white/6 space-y-1.5">
                        <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1">
                          <Database className="w-3 h-3 text-[#00F4FE]" />
                          NXUS Evidence Sources
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {message.sources.map(
                            (
                              source,
                            ) => (
                              <span
                                key={
                                  source.name
                                }
                                className="px-2 py-0.5 rounded bg-black/40 border border-white/6 text-[10px] font-mono text-slate-300"
                              >
                                {
                                  source.name
                                }
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {/* Follow-ups */}
                  {message.suggestedFollowUps &&
                    message
                      .suggestedFollowUps
                      .length >
                      0 && (
                      <div className="pt-2 border-t border-white/6 space-y-1.5">
                        <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                          Suggested Inquiries
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {message.suggestedFollowUps.map(
                            (
                              prompt,
                            ) => (
                              <button
                                key={
                                  prompt
                                }
                                onClick={() =>
                                  handleSend(
                                    prompt,
                                  )
                                }
                                className="text-left px-2.5 py-1 rounded-md bg-[#141720] hover:bg-[#1C2230] border border-white/8 text-[11px] font-mono text-slate-300 hover:text-[#00F4FE] transition-colors"
                              >
                                {prompt} â†’
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            );
          },
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00F4FE] to-[#3B82F6] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-black animate-spin" />
            </div>

            <div className="bg-[#111319] border border-white/8 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00F4FE] animate-pulse" />
              <span>
                Analyzing evidence & synchronizing decision intelligence...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-[#111319] border border-white/8 rounded-xl p-3 shrink-0">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask NXUS about metrics, drivers, decisions, scenarios, anomalies, forecasts, or root causes..."
            value={input}
            onChange={(event) =>
              setInput(
                event.target.value,
              )
            }
            className="flex-1 bg-black/40 border border-white/8 rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[#00F4FE]/50 transition-colors"
          />

          <button
            type="submit"
            disabled={
              !input.trim() ||
              isLoading
            }
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#00F4FE] to-[#3B82F6] hover:opacity-90 disabled:opacity-40 text-black font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-md shadow-[#00F4FE]/20 cursor-pointer"
          >
            <span>
              {isLoading
                ? "Analyzing"
                : "Send"}
            </span>

            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

