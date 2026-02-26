"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type GraphInputProps = {
  onAddEdge: (fromEns: string, toEns: string) => Promise<void>;
  loading: boolean;
};

export function GraphInput({ onAddEdge, loading }: GraphInputProps) {
  const [fromEns, setFromEns] = useState("");
  const [toEns, setToEns] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const from = fromEns.trim();
    const to = toEns.trim();
    if (!from || !to) return;

    await onAddEdge(from, to);
    setFromEns("");
    setToEns("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <Input
        value={fromEns}
        onChange={(e) => setFromEns(e.target.value)}
        placeholder="From (e.g. vitalik.eth)"
        className="flex-1"
      />
      <Input
        value={toEns}
        onChange={(e) => setToEns(e.target.value)}
        placeholder="To (e.g. balajis.eth)"
        className="flex-1"
      />
      <Button type="submit" disabled={loading || !fromEns.trim() || !toEns.trim()}>
        {loading ? "Adding..." : "Add Edge"}
      </Button>
    </form>
  );
}
