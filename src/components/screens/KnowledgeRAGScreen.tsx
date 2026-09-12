import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BookOpen,
  Search,
  Sparkles,
  FileText,
  Database,
  CheckCircle2,
  User,
  Layers,
  AlertTriangle,
} from "lucide-react";

import { ScreenId } from "../../types";
import {
  apiFetch,
  recordSecurityEvent,
} from "../../services/api";

interface KnowledgeRAGScreenProps {
  onNavigate: (
    screen: ScreenId,
  ) => void;
}

interface KnowledgeSource {
  chunk_id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  title: string;
  category: string;
  author: string;
  score: number;
}

interface SearchResponse {
  status: string;
  query: string;
  matches: KnowledgeSource[];
  count: number;
}

interface AskResponse {
  status: string;
  question: string;
  answer: string;
  provider?: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  sources: KnowledgeSource[];
}

const CATEGORIES = [
  "ALL",
  "POST_MORTEM",
  "METRIC_TAXONOMY",
  "SOP",
  "QBR_DECK",
];

export const KnowledgeRAGScreen: React.FC<
  KnowledgeRAGScreenProps
> = ({
  onNavigate,
}) => {
  const [
    searchQuery,
    setSearchQuery,
  ] = useState(
    "APAC checkout latency",
  );

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("ALL");

  const [
    matches,
    setMatches,
  ] = useState<KnowledgeSource[]>(
    [],
  );

  const [
    selectedSource,
    setSelectedSource,
  ] = useState<KnowledgeSource | null>(
    null,
  );

  const [
    ragAnswer,
    setRagAnswer,
  ] = useState<string | null>(
    null,
  );

  const [
    ragSources,
    setRagSources,
  ] = useState<KnowledgeSource[]>(
    [],
  );

  const [
    provider,
    setProvider,
  ] = useState<string>("");

  const [
    model,
    setModel,
  ] = useState<string>("");

  const [
    isSearching,
    setIsSearching,
  ] = useState(false);

  const [
    isAskingRAG,
    setIsAskingRAG,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const filteredMatches =
    useMemo(() => {
      if (
        selectedCategory ===
        "ALL"
      ) {
        return matches;
      }

      return matches.filter(
        (item) =>
          item.category ===
          selectedCategory,
      );
    }, [
      matches,
      selectedCategory,
    ]);

  const runSearch = async (
    queryOverride?: string,
  ) => {
    const query = (
      queryOverride ??
      searchQuery
    ).trim();

    if (!query) {
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response =
        await apiFetch(
          "/api/knowledge/search",
          {
            method: "POST",
            body: JSON.stringify({
              query,
              limit: 5,
            }),
          },
        );

      const data =
        (await response.json()) as
          | SearchResponse
          | { detail?: string };

      if (!response.ok) {
        throw new Error(
          "detail" in data &&
            typeof data.detail ===
              "string"
            ? data.detail
            : `Knowledge search failed (${response.status})`,
        );
      }

      const searchData =
        data as SearchResponse;

      setMatches(
        searchData.matches ?? [],
      );

      setSelectedSource(
        searchData.matches?.[0] ??
          null,
      );

      void recordSecurityEvent(
        "FEATURE_USED",
        {
          feature: "knowledge-rag",
          action: "knowledge_search",
          query_length: query.length,
          result_count: searchData.count,
        },
      ).catch(() => {
        // Activity logging must never block knowledge search.
      });
    } catch (
      searchError
    ) {
      setError(
        searchError instanceof
          Error
          ? searchError.message
          : "Knowledge search failed.",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleAskRAG =
    async () => {
      const query =
        searchQuery.trim();

      if (!query) {
        return;
      }

      setIsAskingRAG(true);
      setError(null);
      setRagAnswer(null);

      try {
        const response =
          await apiFetch(
            "/api/knowledge/ask",
            {
              method: "POST",
              body: JSON.stringify({
                query,
                limit: 5,
              }),
            },
          );

        const data =
          (await response.json()) as
            | AskResponse
            | { detail?: string };

        if (!response.ok) {
          throw new Error(
            "detail" in data &&
              typeof data.detail ===
                "string"
              ? data.detail
              : `Knowledge RAG failed (${response.status})`,
          );
        }

        const answerData =
          data as AskResponse;

        setRagAnswer(
          answerData.answer,
        );

        void recordSecurityEvent(
          "FEATURE_USED",
          {
            feature: "knowledge-rag",
            action: "rag_answer_generated",
            query_length: query.length,
            source_count: answerData.sources?.length ?? 0,
          },
        ).catch(() => {
          // Activity logging must never block RAG.
        });

        setRagSources(
          answerData.sources ??
            [],
        );

        setProvider(
          answerData.provider ??
            "",
        );

        setModel(
          answerData.model ??
            "",
        );

        setMatches(
          answerData.sources ??
            [],
        );

        setSelectedSource(
          answerData.sources?.[0] ??
            null,
        );
      } catch (
        ragError
      ) {
        setError(
          ragError instanceof
            Error
            ? ragError.message
            : "Knowledge RAG failed.",
        );
      } finally {
        setIsAskingRAG(false);
      }
    };

  useEffect(() => {
    void runSearch(
      "APAC checkout latency",
    );
  }, []);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111319] border border-white/8 rounded-xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-mono font-semibold flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              ENTERPRISE KNOWLEDGE BASE & RAG
            </span>

            <span className="text-xs text-slate-500 font-mono">
              PostgreSQL Grounded Retrieval
            </span>
          </div>

          <h1 className="text-xl font-bold text-white tracking-tight">
            Institutional Context & SOP Grounding
          </h1>

          <p className="text-xs text-slate-400">
            Search and reason over the live NXUS knowledge corpus with source-grounded answers.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-3 py-2 rounded-lg bg-black/40 border border-white/8 text-slate-300">
            Chunks:{" "}
            <strong className="text-purple-400 font-bold">
              {matches.length}
            </strong>
          </div>

          <div className="px-3 py-2 rounded-lg bg-black/40 border border-white/8 text-slate-300">
            Vector Store:{" "}
            <strong className="text-emerald-400 font-bold">
              PostgreSQL
            </strong>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-300 mt-0.5" />

          <div className="text-xs text-rose-200 font-mono">
            {error}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-[#111319] border border-white/8 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />

            <input
              type="text"
              value={
                searchQuery
              }
              onChange={(
                event,
              ) =>
                setSearchQuery(
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
                  void runSearch();
                }
              }}
              placeholder="Search incidents, SOPs, definitions..."
              className="w-full bg-black/40 border border-white/8 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <button
            onClick={() =>
              void runSearch()
            }
            disabled={
              isSearching
            }
            className="px-5 py-2.5 rounded-lg bg-[#181B24] hover:bg-[#202532] disabled:opacity-50 border border-purple-500/30 text-purple-300 font-bold text-xs font-mono flex items-center justify-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />

            <span>
              {isSearching
                ? "Searching..."
                : "Search Knowledge"}
            </span>
          </button>

          <button
            onClick={() =>
              void handleAskRAG()
            }
            disabled={
              isAskingRAG
            }
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-[#3B82F6] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20"
          >
            <Sparkles
              className={`w-3.5 h-3.5 ${
                isAskingRAG
                  ? "animate-spin"
                  : ""
              }`}
            />

            <span>
              {isAskingRAG
                ? "Grounding..."
                : "Ask Vector RAG"}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs font-mono">
          <span className="text-slate-500">
            Document Type:
          </span>

          {CATEGORIES.map(
            (category) => (
              <button
                key={
                  category
                }
                onClick={() =>
                  setSelectedCategory(
                    category,
                  )
                }
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedCategory ===
                  category
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold"
                    : "bg-[#14171F] text-slate-400 hover:text-white border border-white/6"
                }`}
              >
                {category}
              </button>
            ),
          )}
        </div>
      </div>

      {/* RAG Answer */}
      {ragAnswer && (
        <div className="bg-[#171424] border border-purple-500/30 rounded-xl p-5 space-y-3 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />

              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Grounded RAG Answer
              </span>
            </div>

            <div className="text-[10px] font-mono text-slate-500">
              {provider && (
                <span>
                  {provider}
                </span>
              )}

              {model && (
                <span className="ml-2">
                  {model}
                </span>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line bg-black/40 p-4 rounded-lg border border-white/6">
            {ragAnswer}
          </div>

          {ragSources.length >
            0 && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                Grounding Sources
              </div>

              <div className="grid gap-2">
                {ragSources.map(
                  (
                    source,
                    index,
                  ) => (
                    <button
                      key={
                        source.chunk_id
                      }
                      onClick={() =>
                        setSelectedSource(
                          source,
                        )
                      }
                      className="text-left rounded-lg border border-white/6 bg-black/20 hover:bg-white/[0.03] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-white font-semibold">
                          [SOURCE{" "}
                          {index +
                            1}
                          ]{" "}
                          {
                            source.title
                          }
                        </span>

                        <span className="text-[10px] text-purple-300 font-mono">
                          {(
                            source.score *
                            100
                          ).toFixed(
                            0,
                          )}
                          %
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                        {
                          source.category
                        }{" "}
                        Ã‚Â·{" "}
                        {
                          source.author
                        }
                      </div>
                    </button>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sources */}
        <div className="space-y-3">
          <div className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold flex items-center justify-between">
            <span>
              Knowledge Results (
              {
                filteredMatches.length
              }
              )
            </span>

            <span className="text-slate-500 text-[10px]">
              Ranked Retrieval
            </span>
          </div>

          {filteredMatches.map(
            (
              source,
            ) => {
              const isSelected =
                selectedSource?.chunk_id ===
                source.chunk_id;

              return (
                <button
                  key={
                    source.chunk_id
                  }
                  onClick={() =>
                    setSelectedSource(
                      source,
                    )
                  }
                  className={`w-full text-left p-4 rounded-xl border transition-all space-y-2 ${
                    isSelected
                      ? "bg-[#1C182A] border-2 border-purple-400 shadow-lg shadow-purple-500/10"
                      : "bg-[#111319] hover:bg-[#161922] border-white/8"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-black/40 text-purple-300 border border-purple-500/20">
                      {
                        source.category
                      }
                    </span>

                    <span className="text-emerald-400 font-bold">
                      {(
                        source.score *
                        100
                      ).toFixed(
                        0,
                      )}
                      %
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-white tracking-tight leading-snug">
                    {
                      source.title
                    }
                  </h3>

                  <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                    {
                      source.content
                    }
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-500 border-t border-white/6">
                    <span>
                      {
                        source.author
                      }
                    </span>

                    <span>
                      Chunk{" "}
                      {source.chunk_index +
                        1}
                    </span>
                  </div>
                </button>
              );
            },
          )}

          {filteredMatches.length ===
            0 && (
            <div className="rounded-xl border border-white/8 bg-[#111319] p-6 text-center">
              <Database className="w-6 h-6 mx-auto text-slate-600 mb-2" />

              <div className="text-xs text-slate-500 font-mono">
                No matching knowledge chunks found.
              </div>
            </div>
          )}
        </div>

        {/* Reader */}
        <div className="lg:col-span-2 bg-[#111319] border border-white/8 rounded-xl p-6 space-y-4 flex flex-col shadow-xl">
          {selectedSource ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-white/6 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    {
                      selectedSource.category
                    }
                  </span>

                  <h2 className="text-lg font-bold text-white tracking-tight mt-2">
                    {
                      selectedSource.title
                    }
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {
                        selectedSource.author
                      }
                    </span>

                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      Chunk{" "}
                      {selectedSource.chunk_index +
                        1}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    onNavigate(
                      "ai-analyst",
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[#00F4FE] text-xs font-mono font-medium flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Discuss with AI Analyst
                </button>
              </div>

              <div className="bg-[#0C0E14] p-5 rounded-lg border border-white/6 font-sans text-xs text-slate-300 leading-relaxed">
                <div className="flex items-center gap-2 mb-3 text-slate-500 font-mono text-[10px] uppercase">
                  <FileText className="w-3.5 h-3.5" />
                  Retrieved Knowledge Chunk
                </div>

                {selectedSource.content}
              </div>

              <div className="pt-4 border-t border-white/6 flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Source-grounded retrieval
                </span>

                <span className="text-purple-400 font-bold">
                  Score:{" "}
                  {(
                    selectedSource.score *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center min-h-[320px]">
              <div className="text-center">
                <BookOpen className="w-8 h-8 mx-auto text-slate-600 mb-3" />

                <div className="text-sm text-slate-500">
                  Select a knowledge result to inspect it.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


