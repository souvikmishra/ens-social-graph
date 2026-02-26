"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";

type EnsNodeData = {
  label: string;
  avatar: string | null;
};

function EnsNodeComponent({ data }: NodeProps) {
  const router = useRouter();
  const { label, avatar } = data as EnsNodeData;

  return (
    <Card
      className="cursor-pointer px-3 py-2 hover:shadow-md transition-shadow"
      onClick={() => router.push(`/profile/${label}`)}
    >
      <Handle type="target" position={Position.Left} className="bg-gray-400!" />
      <div className="flex items-center gap-2">
        {avatar ? (
          <img
            src={avatar}
            alt={label as string}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
            {(label as string).slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className="text-sm font-medium">{label as string}</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="bg-gray-400!"
      />
    </Card>
  );
}

export const EnsNode = memo(EnsNodeComponent);
