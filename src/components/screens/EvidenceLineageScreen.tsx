import React, {
  useEffect,
  useState,
} from "react";

import {
  Network,
  Database,
  CheckCircle2,
  ShieldCheck,
  Code2,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

import { ScreenId } from "../../types";
import { apiFetch } from "../../services/api";

interface EvidenceLineageScreenProps {
  onNavigate: (
    screen: ScreenId,
  ) => void;
}

interface LineageNode {
  id: string;
  name: string;
  type:
    | "DIMENSION"
    | "FACT"
    | "LIVE";
  layerName: string;
  rowCount: number;
  availability: string;
  owner: string;
  source: string;
  sequence: number;
}

interface LineageResponse {
  status: string;
  schema: string;
  nodeCount: number;
  nodes: LineageNode[];
}

export const EvidenceLineageScreen: React.FC<
  EvidenceLineageScreenProps
> = ({
  onNavigate,
}) => {
  const [
    nodes,
    setNodes,
  ] = useState<LineageNode[]>(
    [],
  );

  const [
    selectedNode,
    setSelectedNode,
  ] =
    useState<LineageNode | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const loadLineage =
    async (
      refresh = false,
    ) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const response =
          await apiFetch(
            "/api/lineage",
          );

        if (!response.ok) {
          throw new Error(
            `Failed to load lineage (${response.status})`,
          );
        }

        const data =
          (await response.json()) as LineageResponse;

        setNodes(
          data.nodes ?? [],
        );

        setSelectedNode(
          (current) =>
            current ??
            data.nodes?.[0] ??
            null,
        );
      } catch (
        loadError
      ) {
        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "Unable to load lineage data.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

  useEffect(() => {
    void loadLineage();
  }, []);

  const totalRows =
    nodes.reduce(
      (sum, node) =>
        sum + node.rowCount,
      0,
    );

  const availableNodes =
    nodes.filter(
      (node) =>
        node.availability ===
        "AVAILABLE",
    ).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111319] border border-white/8 rounded-xl p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-mono font-semibold">
              FULL-STACK AUDITABILITY & DATA LINEAGE
            </span>

            <span className="text-xs text-slate-500 font-mono">
              Live Warehouse Metadata
            </span>
          </div>

          <h1 className="text-xl font-bold text-white tracking-tight">
            End-to-End Pipeline & Calculation Lineage
          </h1>

          <p className="text-xs text-slate-400">
            Live lineage metadata from the NXUS warehouse schema.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-3 py-2 rounded-lg bg-black/40 border border-white/8 text-slate-300">
            Nodes:{" "}
            <strong className="text-[#00F4FE] font-bold">
              {nodes.length}
            </strong>
          </div>

          <div className="px-3 py-2 rounded-lg bg-black/40 border border-white/8 text-slate-300">
            Available:{" "}
            <strong className="text-emerald-400 font-bold">
              {availableNodes}
            </strong>
          </div>

          <button
            onClick={() =>
              void loadLineage(
                true,
              )
            }
            disabled={
              isRefreshing
            }
            className="px-3 py-2 rounded-lg bg-[#181C26] hover:bg-[#202534] border border-white/10 text-slate-300"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRefreshing
                  ? "animate-spin"
                  : ""
              }`}
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs font-mono text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-[#111319] border border-white/8 rounded-xl p-10 text-center">
          <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin text-[#00F4FE]" />

          <div className="text-xs text-slate-400 font-mono">
            Loading live lineage metadata...
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline */}
          <div className="lg:col-span-2 bg-[#111319] border border-white/8 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/6 pb-3">
              <h2 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold flex items-center gap-2">
                <Network className="w-3.5 h-3.5 text-[#00F4FE]" />
                Warehouse Lineage
              </h2>

              <span className="text-xs font-mono text-slate-400">
                {nodes.length} Connected Nodes
              </span>
            </div>

            <div className="space-y-3 py-2">
              {nodes.map(
                (
                  node,
                  index,
                ) => {
                  const isSelected =
                    selectedNode?.id ===
                    node.id;

                  return (
                    <div
                      key={
                        node.id
                      }
                      className="space-y-2"
                    >
                      <div
                        onClick={() =>
                          setSelectedNode(
                            node,
                          )
                        }
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#181C26] border-2 border-[#00F4FE] shadow-lg shadow-[#00F4FE]/10"
                            : "bg-[#141720] hover:bg-[#1A1E29] border-white/8"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center font-mono text-xs text-[#00F4FE] font-bold">
                              {index + 1}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white font-mono">
                                  {node.name}
                                </span>

                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-black/40 text-slate-400">
                                  {
                                    node.type
                                  }
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {
                                  node.layerName
                                }{" "}
                                â€¢{" "}
                                <span className="font-mono text-slate-300">
                                  {node.rowCount.toLocaleString()}
                                </span>{" "}
                                rows
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                            <div className="text-right">
                              <div className="text-[10px] text-slate-500">
                                Availability
                              </div>

                              <div
                                className={
                                  node.availability ===
                                  "AVAILABLE"
                                    ? "text-emerald-400 font-medium"
                                    : "text-amber-400 font-medium"
                                }
                              >
                                {
                                  node.availability
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {index <
                        nodes.length -
                          1 && (
                        <div className="flex items-center justify-center text-slate-600">
                          <ChevronRight className="w-4 h-4 rotate-90" />
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </div>

          {/* Inspector */}
          <div className="bg-[#111319] border border-white/8 rounded-xl p-5 space-y-4 flex flex-col justify-between">
            {selectedNode ? (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/6 pb-3">
                    <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold">
                      Lineage Node Specification
                    </h3>

                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Live
                    </span>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-500">
                      Dataset Entity
                    </div>

                    <h4 className="text-sm font-bold text-white font-mono mt-0.5">
                      {
                        selectedNode.name
                      }
                    </h4>

                    <div className="text-xs font-mono text-[#00F4FE] mt-0.5">
                      Owner:{" "}
                      {
                        selectedNode.owner
                      }
                    </div>
                  </div>

                  <div className="bg-black/50 p-3.5 rounded-lg border border-white/6 space-y-2">
                    <div className="text-[11px] font-mono text-slate-400 uppercase flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-[#00F4FE]" />
                      Source Definition
                    </div>

                    <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {selectedNode.source}
                    </pre>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-white/6">
                      <span className="text-slate-400">
                        Layer Type:
                      </span>

                      <span className="text-slate-200">
                        {
                          selectedNode.type
                        }
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-white/6">
                      <span className="text-slate-400">
                        Row Count:
                      </span>

                      <span className="text-slate-200 font-bold">
                        {selectedNode.rowCount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-white/6">
                      <span className="text-slate-400">
                        Availability:
                      </span>

                      <span className="text-emerald-400 font-bold">
                        {
                          selectedNode.availability
                        }
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-slate-400">
                        Schema:
                      </span>

                      <span className="text-slate-200">
                        warehouse
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    onNavigate(
                      "nl-to-sql",
                    )
                  }
                  className="w-full py-2.5 rounded-lg bg-[#181C26] hover:bg-[#202534] border border-white/10 text-slate-200 text-xs font-mono font-medium flex items-center justify-center gap-2"
                >
                  Inspect Table in NL â†’ SQL Studio
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                <Database className="w-8 h-8 text-slate-600 mb-3" />

                <div className="text-sm text-slate-500">
                  Select a lineage node.
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-white/6 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Live metadata
              </span>

              <span>
                Total rows:{" "}
                {totalRows.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};