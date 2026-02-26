"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { IconUser } from "@tabler/icons-react";

type EnsNodeData = {
  label: string;
  avatar: string | null;
};

function getInitials(name: string): string {
  const base = name.replace(/\.eth$/, "");
  if (base.length === 0) return "";
  return base.slice(0, 2).toUpperCase();
}

function EnsNodeComponent({ data }: NodeProps) {
  const router = useRouter();
  const { label, avatar } = data as EnsNodeData;
  const initials = getInitials(label as string);

  return (
    <Card
      className="cursor-pointer px-3 py-2 hover:shadow-md transition-shadow"
      onClick={() => router.push(`/profile/${label}`)}
    >
      <Handle type="target" position={Position.Left} className="bg-gray-400!" />
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          {avatar && <AvatarImage src={avatar} alt={label as string} />}
          <AvatarFallback className="text-xs font-bold">
            {initials || <IconUser size={14} stroke={1.5} />}
          </AvatarFallback>
        </Avatar>
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
