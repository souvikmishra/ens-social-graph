"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  EdgeLabelRenderer,
  getBezierPath,
  BaseEdge,
  type Edge,
  type Node,
  type EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EnsNode } from "@/components/EnsNode";
import { GraphInput } from "@/components/GraphInput";

type RelationshipRow = {
  id: string;
  fromEns: string;
  toEns: string;
  createdAt: string;
};

type AvatarMap = Record<string, string | null>;

const NODE_WIDTH = 180;
const NODE_HEIGHT = 50;

function layoutGraph(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}

function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const onDelete = data?.onDelete as (() => void) | undefined;

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <button
          className="nodrag nopan pointer-events-auto absolute flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white hover:bg-red-600 transition-colors"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
        >
          ✕
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

export default function GraphPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [avatars, setAvatars] = useState<AvatarMap>({});
  const [relationships, setRelationships] = useState<RelationshipRow[]>([]);
  const [addingEdge, setAddingEdge] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [extraNodes, setExtraNodes] = useState<string[]>([]);
  const queryProcessed = useRef(false);

  const nodeTypes = useMemo(() => ({ ensNode: EnsNode }), []);
  const edgeTypes = useMemo(() => ({ deletable: DeletableEdge }), []);

  async function fetchAvatar(name: string): Promise<string | null> {
    try {
      const res = await fetch(
        `/api/ens/avatar?name=${encodeURIComponent(name)}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      return (data as { avatar: string | null }).avatar;
    } catch {
      return null;
    }
  }

  async function fetchAvatars(names: string[], currentAvatars: AvatarMap) {
    const newAvatars: AvatarMap = {};
    await Promise.allSettled(
      names.map(async (name) => {
        if (currentAvatars[name] !== undefined) {
          newAvatars[name] = currentAvatars[name];
        } else {
          newAvatars[name] = await fetchAvatar(name);
        }
      })
    );
    const merged = { ...currentAvatars, ...newAvatars };
    setAvatars(merged);
    return merged;
  }

  const buildGraph = useCallback(
    (
      rels: RelationshipRow[],
      avatarMap: AvatarMap,
      floatingNames: string[] = []
    ) => {
      const uniqueNames = new Set<string>();
      rels.forEach((r) => {
        uniqueNames.add(r.fromEns);
        uniqueNames.add(r.toEns);
      });
      floatingNames.forEach((n) => uniqueNames.add(n));

      const rawNodes: Node[] = Array.from(uniqueNames).map((name, i) => ({
        id: name,
        type: "ensNode",
        data: { label: name, avatar: avatarMap[name] ?? null },
        position: { x: (i % 4) * 220, y: Math.floor(i / 4) * 100 },
      }));

      const graphEdges: Edge[] = rels.map((r) => ({
        id: r.id,
        source: r.fromEns,
        target: r.toEns,
        type: "deletable",
        data: {
          onDelete: () => handleDeleteEdge(r.fromEns, r.toEns),
        },
      }));

      const laidOutNodes =
        graphEdges.length > 0 ? layoutGraph(rawNodes, graphEdges) : rawNodes;
      setNodes(laidOutNodes);
      setEdges(graphEdges);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  async function loadRelationships(floating: string[] = []) {
    try {
      const res = await fetch("/api/relationships");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const rels = (data as { relationships: RelationshipRow[] }).relationships;
      setRelationships(rels);

      const allNames = new Set<string>();
      rels.forEach((r) => {
        allNames.add(r.fromEns);
        allNames.add(r.toEns);
      });
      floating.forEach((n) => allNames.add(n));

      const avatarMap = await fetchAvatars(
        Array.from(allNames),
        avatars
      );
      buildGraph(rels, avatarMap, floating);
    } catch {
      toast.error("Failed to load relationships");
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    const namesParam = searchParams.get("names");
    let seedNames: string[] = [];

    if (namesParam && !queryProcessed.current) {
      queryProcessed.current = true;
      seedNames = namesParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (seedNames.length > 0) {
        setExtraNodes(seedNames);
      }
      router.replace("/graph");
    }

    loadRelationships(seedNames);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function generatePairs(names: string[]): [string, string][] {
    const pairs: [string, string][] = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const [a, b] = [names[i], names[j]].sort();
        pairs.push([a, b]);
      }
    }
    return pairs;
  }

  async function handleAddNames(names: string[]) {
    if (names.length < 2) {
      toast.warning("Enter at least 2 names to create a connection");
      return;
    }

    setAddingEdge(true);

    const pairs = generatePairs(names);
    let addedCount = 0;
    let skippedCount = 0;

    try {
      const results = await Promise.allSettled(
        pairs.map(async ([fromEns, toEns]) => {
          const res = await fetch("/api/relationships", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromEns, toEns }),
          });

          if (res.status === 409) {
            skippedCount++;
            return "duplicate";
          }

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(
              (errData as { error: string }).error || "Failed to add edge"
            );
          }

          addedCount++;
          return "added";
        })
      );

      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        toast.error(`${failures.length} connection(s) failed to create`);
      }

      if (addedCount === 0 && skippedCount === pairs.length) {
        toast.info("All connections already exist");
      } else if (addedCount > 0) {
        toast.success(`${addedCount} connection(s) added`);
      }

      setExtraNodes([]);
      await loadRelationships();
    } catch {
      toast.error("Failed to create connections");
    } finally {
      setAddingEdge(false);
    }
  }

  async function handleDeleteEdge(fromEns: string, toEns: string) {
    const prevRelationships = [...relationships];
    const prevExtra = [...extraNodes];
    const nextRelationships = relationships.filter(
      (r) => !(r.fromEns === fromEns && r.toEns === toEns)
    );
    setRelationships(nextRelationships);
    buildGraph(nextRelationships, avatars, extraNodes);

    try {
      const res = await fetch("/api/relationships", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromEns, toEns }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete edge");
      }

      toast.success(`Edge removed: ${fromEns} → ${toEns}`);
    } catch {
      toast.error("Failed to delete edge");
      setRelationships(prevRelationships);
      buildGraph(prevRelationships, avatars, prevExtra);
    }
  }

  const hasContent = relationships.length > 0 || extraNodes.length > 0;

  if (initialLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <p className="text-muted-foreground">Loading graph...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <div className="flex items-center gap-2 border-b p-4">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => {
            if (window.history.length <= 1) {
              router.push("/");
            } else {
              router.back();
            }
          }}
        >
          <IconArrowLeft size={18} stroke={1.5} />
        </Button>
        <div className="flex-1">
          <GraphInput onAddNames={handleAddNames} loading={addingEdge} />
        </div>
      </div>

      {!hasContent ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-muted-foreground">
            No connections yet. Add ENS name pairs above to build the graph.
          </p>
        </div>
      ) : (
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
          />
        </div>
      )}
    </div>
  );
}
