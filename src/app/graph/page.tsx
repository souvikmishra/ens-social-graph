"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconArrowLeft,
  IconX,
  IconDeviceFloppy,
  IconLoader2,
} from "@tabler/icons-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

function relKey(r: { fromEns: string; toEns: string }): string {
  const [a, b] = [r.fromEns, r.toEns].sort();
  return `${a}:${b}`;
}

function computeIsDirty(
  saved: RelationshipRow[],
  local: RelationshipRow[]
): boolean {
  if (saved.length !== local.length) return true;
  const savedSet = new Set(saved.map(relKey));
  return local.some((r) => !savedSet.has(relKey(r)));
}

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
          className="nodrag nopan pointer-events-auto absolute flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
        >
          <IconX size={12} stroke={2} />
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

export default function GraphPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <p className="text-muted-foreground">Loading graph...</p>
        </div>
      }
    >
      <GraphPageContent />
    </Suspense>
  );
}

function GraphPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [avatars, setAvatars] = useState<AvatarMap>({});

  const [savedRelationships, setSavedRelationships] = useState<
    RelationshipRow[]
  >([]);
  const [localRelationships, setLocalRelationships] = useState<
    RelationshipRow[]
  >([]);

  const [addingEdge, setAddingEdge] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const queryProcessed = useRef(false);

  const [navDialogOpen, setNavDialogOpen] = useState(false);
  const pendingNavTarget = useRef<string | null>(null);

  const isDirty = computeIsDirty(savedRelationships, localRelationships);

  const nodeTypes = useMemo(() => ({ ensNode: EnsNode }), []);
  const edgeTypes = useMemo(() => ({ deletable: DeletableEdge }), []);

  // ── Avatar fetching ──

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

  // ── Graph rendering ──

  const buildGraph = useCallback(
    (rels: RelationshipRow[], avatarMap: AvatarMap) => {
      const uniqueNames = new Set<string>();
      rels.forEach((r) => {
        uniqueNames.add(r.fromEns);
        uniqueNames.add(r.toEns);
      });

      const rawNodes: Node[] = Array.from(uniqueNames).map((name, i) => ({
        id: name,
        type: "ensNode",
        data: {
          label: name,
          avatar: avatarMap[name] ?? null,
          onNavigate: handleNodeNavigate,
        },
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

  // ── DB loading ──

  async function loadFromDb() {
    try {
      const res = await fetch("/api/relationships");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const rels = (data as { relationships: RelationshipRow[] }).relationships;
      setSavedRelationships(rels);
      setLocalRelationships(rels);

      const allNames = new Set<string>();
      rels.forEach((r) => {
        allNames.add(r.fromEns);
        allNames.add(r.toEns);
      });

      const avatarMap = await fetchAvatars(Array.from(allNames), avatars);
      buildGraph(rels, avatarMap);
    } catch {
      toast.error("Failed to load relationships");
    } finally {
      setInitialLoading(false);
    }
  }

  // ── Homepage seed flow (writes directly to DB) ──

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

  async function seedFromQueryParam(names: string[]) {
    if (names.length < 2) {
      await loadFromDb();
      return;
    }

    const pairs = generatePairs(names);
    let addedCount = 0;

    const results = await Promise.allSettled(
      pairs.map(async ([fromEns, toEns]) => {
        const res = await fetch("/api/relationships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromEns, toEns }),
        });
        if (res.status === 409) return "duplicate";
        if (!res.ok) throw new Error("Failed to create edge");
        addedCount++;
        return "added";
      })
    );

    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      toast.error(
        `${failures.length} connection(s) failed to create. The rest were saved.`
      );
    }
    if (addedCount > 0) {
      toast.success(`${addedCount} connection(s) created`);
    }

    await loadFromDb();
  }

  // ── Mount ──

  useEffect(() => {
    const namesParam = searchParams.get("names");

    if (namesParam && !queryProcessed.current) {
      queryProcessed.current = true;
      const seedNames = namesParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      router.replace("/graph");

      if (seedNames.length > 0) {
        seedFromQueryParam(seedNames);
      } else {
        loadFromDb();
      }
    } else {
      loadFromDb();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Rebuild graph whenever localRelationships or avatars change ──

  useEffect(() => {
    if (!initialLoading) {
      buildGraph(localRelationships, avatars);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localRelationships, avatars, initialLoading]);

  // ── Browser beforeunload guard ──

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (computeIsDirty(savedRelationships, localRelationships)) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [savedRelationships, localRelationships]);

  // ── Navigation guard ──

  function handleNodeNavigate(ensName: string) {
    if (isDirty) {
      pendingNavTarget.current = `/profile/${ensName}`;
      setNavDialogOpen(true);
    } else {
      router.push(`/profile/${ensName}`);
    }
  }

  function handleBack() {
    if (isDirty) {
      pendingNavTarget.current = "__back__";
      setNavDialogOpen(true);
    } else {
      if (window.history.length <= 1) {
        router.push("/");
      } else {
        router.back();
      }
    }
  }

  function confirmNavigation() {
    setNavDialogOpen(false);
    setLocalRelationships(savedRelationships);
    const target = pendingNavTarget.current;
    pendingNavTarget.current = null;

    if (target === "__back__") {
      if (window.history.length <= 1) {
        router.push("/");
      } else {
        router.back();
      }
    } else if (target) {
      router.push(target);
    }
  }

  function cancelNavigation() {
    setNavDialogOpen(false);
    pendingNavTarget.current = null;
  }

  // ── Local state mutations ──

  function getExistingNodeNames(): string[] {
    const names = new Set<string>();
    localRelationships.forEach((r) => {
      names.add(r.fromEns);
      names.add(r.toEns);
    });
    return Array.from(names);
  }

  function addLocalRelationship(fromEns: string, toEns: string) {
    const [a, b] = [fromEns, toEns].sort();
    const exists = localRelationships.some((r) => relKey(r) === `${a}:${b}`);
    if (exists) return false;

    const newRel: RelationshipRow = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fromEns: a,
      toEns: b,
      createdAt: new Date().toISOString(),
    };
    setLocalRelationships((prev) => [...prev, newRel]);
    return true;
  }

  async function handleAddNames(names: string[]) {
    const existingNames = getExistingNodeNames();

    const newNames = names.filter((n) => !existingNames.includes(n));
    const duplicateNames = names.filter((n) => existingNames.includes(n));

    if (names.length === 1 && duplicateNames.length === 1) {
      toast.info(`${duplicateNames[0]} is already in the graph`);
      return;
    }

    if (names.length === 1 && existingNames.length === 0) {
      toast.warning("Enter at least 2 names to create a connection");
      return;
    }

    setAddingEdge(true);

    const newAvatarNames = newNames.filter((n) => avatars[n] === undefined);
    if (newAvatarNames.length > 0) {
      await fetchAvatars(newAvatarNames, avatars);
    }

    const pairs: [string, string][] = [];
    for (const nn of newNames) {
      for (const en of existingNames) {
        pairs.push([nn, en]);
      }
    }
    pairs.push(...generatePairs(newNames));

    if (
      duplicateNames.length > 0 &&
      newNames.length === 0 &&
      names.length >= 2
    ) {
      const extraPairs = generatePairs(names);
      pairs.push(...extraPairs);
    }

    let addedCount = 0;
    for (const [a, b] of pairs) {
      if (addLocalRelationship(a, b)) addedCount++;
    }

    if (addedCount === 0) {
      toast.info("All connections already exist");
    } else {
      toast.success(
        `${addedCount} connection(s) added locally — save to persist`
      );
    }

    setAddingEdge(false);
  }

  function handleDeleteEdge(fromEns: string, toEns: string) {
    setLocalRelationships((prev) =>
      prev.filter((r) => relKey(r) !== relKey({ fromEns, toEns }))
    );
  }

  // ── Save / Discard ──

  async function handleSave() {
    if (!isDirty || saving) return;
    setSaving(true);

    const savedSet = new Set(savedRelationships.map(relKey));
    const localSet = new Set(localRelationships.map(relKey));

    const toAdd = localRelationships.filter((r) => !savedSet.has(relKey(r)));
    const toRemove = savedRelationships.filter((r) => !localSet.has(relKey(r)));

    let failed = false;

    const addResults = await Promise.allSettled(
      toAdd.map(async (r) => {
        const res = await fetch("/api/relationships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromEns: r.fromEns, toEns: r.toEns }),
        });
        if (res.status === 409) return;
        if (!res.ok) throw new Error("POST failed");
      })
    );

    const deleteResults = await Promise.allSettled(
      toRemove.map(async (r) => {
        const res = await fetch("/api/relationships", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromEns: r.fromEns, toEns: r.toEns }),
        });
        if (!res.ok) throw new Error("DELETE failed");
      })
    );

    const addFailures = addResults.filter((r) => r.status === "rejected");
    const deleteFailures = deleteResults.filter((r) => r.status === "rejected");

    if (addFailures.length > 0 || deleteFailures.length > 0) {
      failed = true;
      toast.error("Some changes couldn't be saved. Please try again.");
    }

    if (!failed) {
      toast.success("Changes saved");
    }

    await loadFromDb();
    setSaving(false);
  }

  function handleDiscard() {
    setLocalRelationships(savedRelationships);
  }

  // ── Render ──

  const hasContent = localRelationships.length > 0;

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
          onClick={handleBack}
        >
          <IconArrowLeft size={18} stroke={1.5} />
        </Button>
        <div className="flex-1">
          <GraphInput
            onAddNames={handleAddNames}
            loading={addingEdge}
            existingNodes={getExistingNodeNames()}
          />
        </div>
      </div>

      {!hasContent ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-muted-foreground">
            No connections yet. Add ENS name pairs above to build the graph.
          </p>
        </div>
      ) : (
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            snapToGrid
            autoPanOnNodeFocus
            fitView
            fitViewOptions={{
              padding: 0.1,
              includeHiddenNodes: false,
              minZoom: 0.1,
              maxZoom: 1,
              duration: 200,
              nodes: nodes,
            }}
            proOptions={{ hideAttribution: true }}
          />

          {/* Save/Discard floating bar */}
          <div
            className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
              isDirty
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
          >
            <div className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3 shadow-lg">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                You have unsaved changes
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscard}
                  disabled={saving}
                >
                  <IconX size={16} stroke={1.5} />
                  Discard
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <IconLoader2
                      size={16}
                      stroke={1.5}
                      className="animate-spin"
                    />
                  ) : (
                    <IconDeviceFloppy size={16} stroke={1.5} />
                  )}
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation guard dialog */}
      <AlertDialog open={navDialogOpen} onOpenChange={setNavDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to your graph. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelNavigation}>
              Go back &amp; Save
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmNavigation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard &amp; Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
