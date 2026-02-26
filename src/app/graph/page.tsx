"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [avatars, setAvatars] = useState<AvatarMap>({});
  const [relationships, setRelationships] = useState<RelationshipRow[]>([]);
  const [addingEdge, setAddingEdge] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const nodeTypes = useMemo(() => ({ ensNode: EnsNode }), []);
  const edgeTypes = useMemo(() => ({ deletable: DeletableEdge }), []);

  async function fetchAvatar(name: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/ens/avatar?name=${encodeURIComponent(name)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return (data as { avatar: string | null }).avatar;
    } catch {
      return null;
    }
  }

  async function fetchAvatars(names: string[]) {
    const newAvatars: AvatarMap = {};
    await Promise.allSettled(
      names.map(async (name) => {
        if (avatars[name] !== undefined) {
          newAvatars[name] = avatars[name];
        } else {
          newAvatars[name] = await fetchAvatar(name);
        }
      })
    );
    setAvatars((prev) => ({ ...prev, ...newAvatars }));
    return { ...avatars, ...newAvatars };
  }

  const buildGraph = useCallback(
    (rels: RelationshipRow[], avatarMap: AvatarMap) => {
      const uniqueNames = new Set<string>();
      rels.forEach((r) => {
        uniqueNames.add(r.fromEns);
        uniqueNames.add(r.toEns);
      });

      const rawNodes: Node[] = Array.from(uniqueNames).map((name) => ({
        id: name,
        type: "ensNode",
        data: { label: name, avatar: avatarMap[name] ?? null },
        position: { x: 0, y: 0 },
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

      const laidOutNodes = layoutGraph(rawNodes, graphEdges);
      setNodes(laidOutNodes);
      setEdges(graphEdges);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  async function loadRelationships() {
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

      const avatarMap = await fetchAvatars(Array.from(allNames));
      buildGraph(rels, avatarMap);
    } catch {
      toast.error("Failed to load relationships");
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    loadRelationships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddEdge(fromEns: string, toEns: string) {
    setAddingEdge(true);

    const optimisticRel: RelationshipRow = {
      id: `temp-${Date.now()}`,
      fromEns,
      toEns,
      createdAt: new Date().toISOString(),
    };
    const prevRelationships = [...relationships];
    const nextRelationships = [...relationships, optimisticRel];
    setRelationships(nextRelationships);

    const allNames = new Set<string>();
    nextRelationships.forEach((r) => {
      allNames.add(r.fromEns);
      allNames.add(r.toEns);
    });
    const avatarMap = await fetchAvatars(Array.from(allNames));
    buildGraph(nextRelationships, avatarMap);

    try {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromEns, toEns }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(
          (errData as { error: string }).error || "Failed to add edge"
        );
      }

      toast.success(`Edge added: ${fromEns} → ${toEns}`);
      await loadRelationships();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add edge";
      toast.error(message);
      setRelationships(prevRelationships);
      buildGraph(prevRelationships, avatarMap);
    } finally {
      setAddingEdge(false);
    }
  }

  async function handleDeleteEdge(fromEns: string, toEns: string) {
    const prevRelationships = [...relationships];
    const nextRelationships = relationships.filter(
      (r) => !(r.fromEns === fromEns && r.toEns === toEns)
    );
    setRelationships(nextRelationships);

    const allNames = new Set<string>();
    nextRelationships.forEach((r) => {
      allNames.add(r.fromEns);
      allNames.add(r.toEns);
    });
    buildGraph(nextRelationships, avatars);

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
      buildGraph(prevRelationships, avatars);
    }
  }

  if (initialLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <p className="text-muted-foreground">Loading graph...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <div className="border-b p-4">
        <GraphInput onAddEdge={handleAddEdge} loading={addingEdge} />
      </div>

      {relationships.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-muted-foreground">
            No connections yet. Add ENS name pairs below to build the graph.
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
