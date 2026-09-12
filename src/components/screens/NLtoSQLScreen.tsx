import React, {
  useState,
} from "react";

import {
  Terminal,
  Sparkles,
  Play,
  Copy,
  Check,
  Database,
  Code2,
  Table as TableIcon,
  Download,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import { ScreenId } from "../../types";
import {
  apiFetch,
  recordSecurityEvent,
} from "../../services/api";

interface NLtoSQLScreenProps {
  onNavigate: (
    screen: ScreenId,
  ) => void;
}

interface GenerateResponse {
  status: string;
  sql: string;
  provider: string;
  model: string;
}

interface ExecuteResponse {
  status: string;
  sql: string;
  columns: string[];
  rows: unknown[][];
  row_count: number;
  execution_ms: number;
}


const DEFAULT_QUERY =
  "Show total revenue by region";

const STARTERS = [
  "Show total revenue by region",
  "Show total revenue by product",
  "Show orders by customer tier",
  "Show gross margin by product category",
];

function formatCell(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "Ã¢â‚¬â€";
  }

  if (
    typeof value ===
    "number"
  ) {
    return value.toLocaleString(
      undefined,
      {
        maximumFractionDigits: 2,
      },
    );
  }

  return String(value);
}

export const NLtoSQLScreen: React.FC<
  NLtoSQLScreenProps
> = ({
  onNavigate,
}) => {
  const [
    nlPrompt,
    setNlPrompt,
  ] = useState(
    DEFAULT_QUERY,
  );

  const [
    dialect,
    setDialect,
  ] = useState(
    "Snowflake / PostgreSQL",
  );

  const [
    generatedSql,
    setGeneratedSql,
  ] = useState("");

  const [
    queryResults,
    setQueryResults,
  ] = useState<
    unknown[][]
  >([]);

  const [
    columns,
    setColumns,
  ] = useState<string[]>(
    [],
  );

  const [
    executionMs,
    setExecutionMs,
  ] = useState<
    number | null
  >(null);

  const [
    provider,
    setProvider,
  ] = useState("");

  const [
    model,
    setModel,
  ] = useState("");

  const [
    isGenerating,
    setIsGenerating,
  ] = useState(false);

  const [
    isExecuting,
    setIsExecuting,
  ] = useState(false);

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<
    string | null
  >(null);

  const handleGenerateSql =
    async () => {
      const prompt =
        nlPrompt.trim();

      if (!prompt) {
        return;
      }

      setIsGenerating(true);
      setError(null);
      setSuccessMessage(
        null,
      );

      try {
        const response =
          await apiFetch(
            "/api/nl2sql/generate",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                prompt,
                dialect,
              }),
            },
          );

        const data =
          (await response.json()) as
            | GenerateResponse
            | {
                detail?: string;
              };

        if (!response.ok) {
          throw new Error(
            "detail" in data &&
              typeof data.detail ===
                "string"
              ? data.detail
              : `SQL generation failed (${response.status})`,
          );
        }

        const generated =
          data as GenerateResponse;

        setGeneratedSql(
          generated.sql,
        );

        setProvider(
          generated.provider ??
            "",
        );

        setModel(
          generated.model ??
            "",
        );

        setQueryResults(
          [],
        );

        setColumns(
          [],
        );

        setExecutionMs(null);

        setSuccessMessage(
          "SQL generated successfully.",
        );
      } catch (
        generationError
      ) {
        setError(
          generationError instanceof
            Error
            ? generationError.message
            : "SQL generation failed.",
        );
      } finally {
        setIsGenerating(false);
      }
    };

  const handleExecuteQuery =
    async () => {
      const sql =
        generatedSql.trim();

      if (!sql) {
        setError(
          "Generate SQL before executing the query.",
        );

        return;
      }

      setIsExecuting(true);
      setError(null);
      setSuccessMessage(
        null,
      );

      try {
        const response =
          await apiFetch(
            "/api/nl2sql/execute",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                sql,
              }),
            },
          );

        const data =
          (await response.json()) as
            | ExecuteResponse
            | {
                detail?: string;
              };

        if (!response.ok) {
          throw new Error(
            "detail" in data &&
              typeof data.detail ===
                "string"
              ? data.detail
              : `SQL execution failed (${response.status})`,
          );
        }

        const execution =
          data as ExecuteResponse;

        setColumns(
          execution.columns ??
            [],
        );

        setQueryResults(
          execution.rows ??
            [],
        );

        setExecutionMs(
          execution.execution_ms ??
            null,
        );

        setSuccessMessage(
          `Query executed successfully. ${execution.row_count} row${
            execution.row_count ===
            1
              ? ""
              : "s"
          } returned.`,
        );

        void recordSecurityEvent(
          "FEATURE_USED",
          {
            feature: "nl-to-sql",
            action: "query_executed",
            row_count: execution.row_count,
            execution_ms: execution.execution_ms,
          },
        ).catch(() => {
          // Activity logging must never block SQL execution.
        });
      } catch (
        executionError
      ) {
        setError(
          executionError instanceof
            Error
            ? executionError.message
            : "SQL execution failed.",
        );
      } finally {
        setIsExecuting(false);
      }
    };

  const handleCopy =
    async () => {
      if (!generatedSql) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          generatedSql,
        );

        setCopied(true);

        setTimeout(
          () =>
            setCopied(false),
          2000,
        );
      } catch {
        setError(
          "Unable to copy SQL to clipboard.",
        );
      }
    };

  const handleClear =
    () => {
      setNlPrompt("");
      setGeneratedSql("");
      setQueryResults([]);
      setColumns([]);
      setExecutionMs(null);
      setProvider("");
      setModel("");
      setError(null);
      setSuccessMessage(
        null,
      );
    };

  const handleExport =
    () => {
      if (
        columns.length ===
          0 ||
        queryResults.length ===
          0
      ) {
        setError(
          "No query results available to export.",
        );

        return;
      }

      const csvRows = [
        columns,
        ...queryResults.map(
          (row) =>
            columns.map(
              (_, index) =>
                row[index],
            ),
        ),
      ];

      const csv = csvRows
        .map((row) =>
          row
            .map((value) => {
              const text =
                formatCell(
                  value,
                );

              return `"${text.replace(
                /"/g,
                '""',
              )}"`;
            })
            .join(","),
        )
        .join("\n");

      const blob =
        new Blob(
          [csv],
          {
            type: "text/csv;charset=utf-8;",
          },
        );

      const url =
        URL.createObjectURL(
          blob,
        );

      const anchor =
        document.createElement(
          "a",
        );

      anchor.href =
        url;

      anchor.download =
        "nxus-query-results.csv";

      document.body.appendChild(
        anchor,
      );

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(
        url,
      );
    };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111319] border border-white/8 rounded-xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5" />
              NATURAL LANGUAGE Ã¢â€ â€™ SQL
            </span>

            <span className="text-xs text-slate-500 font-mono">
              Schema-aware PostgreSQL execution
            </span>
          </div>

          <h1 className="text-xl font-bold text-white tracking-tight">
            Enterprise NL Ã¢â€ â€™ SQL Execution Engine
          </h1>

          <p className="text-xs text-slate-400">
            Convert business questions into validated,
            read-only SQL and execute them against the
            live NXUS warehouse.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={
              dialect
            }
            onChange={(event) =>
              setDialect(
                event.target.value,
              )
            }
            className="bg-[#181B24] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none"
          >
            <option value="Snowflake / PostgreSQL">
              Snowflake / PostgreSQL
            </option>

            <option value="Google BigQuery">
              Google BigQuery
            </option>

            <option value="ClickHouse">
              ClickHouse
            </option>

            <option value="Databricks SQL">
              Databricks SQL
            </option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-300 mt-0.5 shrink-0" />

          <div className="text-xs text-rose-200 font-mono">
            {error}
          </div>
        </div>
      )}

      {/* Success */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 flex items-start gap-2">
          <Check className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />

          <div className="text-xs text-emerald-200 font-mono">
            {successMessage}
          </div>
        </div>
      )}

      {/* Natural Language Query */}
      <div className="bg-[#111319] border border-white/8 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#00F4FE]" />

          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Natural Language Business Query
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={
              nlPrompt
            }
            onChange={(event) =>
              setNlPrompt(
                event.target.value,
              )
            }
            onKeyDown={(
              event,
            ) => {
              if (
                event.key ===
                "Enter"
              ) {
                void handleGenerateSql();
              }
            }}
            placeholder="Ask a business question..."
            className="flex-1 bg-black/40 border border-white/8 rounded-lg px-4 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-[#00F4FE]/50"
          />

          <button
            onClick={() =>
              void handleGenerateSql()
            }
            disabled={
              isGenerating ||
              !nlPrompt.trim()
            }
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#00F4FE] to-[#3B82F6] hover:opacity-90 disabled:opacity-40 text-black font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#00F4FE]/20 cursor-pointer shrink-0"
          >
            <Sparkles
              className={`w-3.5 h-3.5 ${
                isGenerating
                  ? "animate-spin"
                  : ""
              }`}
            />

            <span>
              {isGenerating
                ? "Compiling..."
                : "Generate SQL"}
            </span>
          </button>

          <button
            onClick={
              handleClear
            }
            className="px-3 py-2.5 rounded-lg bg-[#181B24] hover:bg-[#202532] border border-white/10 text-slate-300 text-xs font-mono transition-colors"
            title="Clear"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Starters */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[11px] font-mono text-slate-500">
            Quick Templates:
          </span>

          {STARTERS.map(
            (starter) => (
              <button
                key={
                  starter
                }
                onClick={() =>
                  setNlPrompt(
                    starter,
                  )
                }
                className="text-[11px] font-mono bg-white/4 hover:bg-white/8 text-slate-400 hover:text-[#00F4FE] px-2 py-0.5 rounded border border-white/6 transition-colors"
              >
                {starter}
              </button>
            ),
          )}
        </div>
      </div>

      {/* SQL Editor */}
      <div className="bg-[#111319] border border-white/8 rounded-xl overflow-hidden shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 py-3 bg-[#0C0E14] border-b border-white/8 text-xs font-mono">
          <div className="flex items-center gap-2 flex-wrap">
            <Code2 className="w-4 h-4 text-[#00F4FE]" />

            <span className="font-bold text-slate-300">
              Generated SQL
            </span>

            {provider && (
              <span className="text-[10px] text-[#00F4FE] bg-[#00F4FE]/10 border border-[#00F4FE]/20 px-2 py-0.5 rounded">
                {provider}
              </span>
            )}

            {model && (
              <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                {model}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={
                handleCopy
              }
              disabled={
                !generatedSql
              }
              className="px-3 py-1.5 rounded bg-[#181B24] hover:bg-[#202532] disabled:opacity-40 border border-white/10 text-slate-300 text-xs flex items-center gap-1 transition-colors"
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}

              <span>
                {copied
                  ? "Copied"
                  : "Copy SQL"}
              </span>
            </button>

            <button
              onClick={() =>
                void handleExecuteQuery()
              }
              disabled={
                isExecuting ||
                !generatedSql
              }
              className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Play
                className={`w-3 h-3 fill-current ${
                  isExecuting
                    ? "animate-spin"
                    : ""
                }`}
              />

              <span>
                {isExecuting
                  ? "Executing..."
                  : "Execute Query"}
              </span>
            </button>
          </div>
        </div>

        <div className="p-4 bg-[#08090C] font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed border-b border-white/8 min-h-[140px]">
          {generatedSql ? (
            <pre className="text-emerald-400/90 whitespace-pre-wrap">
              {generatedSql}
            </pre>
          ) : (
            <div className="text-slate-600">
              Generated SQL will appear here.
            </div>
          )}
        </div>

        {/* Query Results */}
        <div className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-400">
              <TableIcon className="w-3.5 h-3.5 text-[#00F4FE]" />

              <span>
                Query Results
                {" "}
                ({queryResults.length} rows)
              </span>

              {executionMs !==
                null && (
                <span className="text-slate-500">
                  Ã¢â‚¬Â¢{" "}
                  {executionMs.toFixed(
                    2,
                  )}
                  ms
                </span>
              )}
            </div>

            <button
              onClick={
                handleExport
              }
              disabled={
                queryResults.length ===
                0
              }
              className="text-slate-400 hover:text-white disabled:opacity-30 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>
                Export CSV
              </span>
            </button>
          </div>

          {queryResults.length ===
          0 ? (
            <div className="rounded-lg border border-white/8 bg-black/20 px-4 py-10 text-center">
              <Database className="w-6 h-6 mx-auto text-slate-600 mb-2" />

              <div className="text-xs text-slate-500 font-mono">
                Execute a generated query to view real warehouse results.
              </div>
            </div>
          ) : columns.length ===
            0 ? (
            <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-4 text-xs text-amber-200 font-mono">
              Rows returned, but no column metadata was provided by the backend.
            </div>
          ) : (
            <div className="overflow-x-auto border border-white/8 rounded-lg">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0C0E14] text-slate-400 uppercase text-[10px] border-b border-white/8">
                  <tr>
                    {columns.map(
                      (
                        column,
                      ) => (
                        <th
                          key={
                            column
                          }
                          className="py-2.5 px-3 whitespace-nowrap"
                        >
                          {
                            column
                          }
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5 bg-black/20">
                  {queryResults.map(
                    (
                      row,
                      rowIndex,
                    ) => (
                      <tr
                        key={
                          rowIndex
                        }
                        className="hover:bg-white/4"
                      >
                        {columns.map(
                          (
                            column,
                            columnIndex,
                          ) => (
                            <td
                              key={`${rowIndex}-${column}-${columnIndex}`}
                              className="py-2 px-3 text-slate-300 whitespace-nowrap"
                            >
                              {formatCell(
                                row[
                                  columnIndex
                                ],
                              )}
                            </td>
                          ),
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

