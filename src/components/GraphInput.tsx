"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type GraphInputProps = {
  onAddNames: (names: string[]) => Promise<void>;
  loading: boolean;
  existingNodes: string[];
};

export function GraphInput({ onAddNames, loading, existingNodes }: GraphInputProps) {
  const [input, setInput] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const names = input
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (names.length === 0) return;

    await onAddNames(names);
    setInput("");
  }

  const totalNodes = existingNodes.length;
  const placeholder =
    totalNodes > 0
      ? "Add ENS names — they'll connect to existing nodes"
      : "Add ENS names (e.g. vitalik.eth, balajis.eth)";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <Button type="submit" disabled={loading || !input.trim()}>
        {loading ? "Adding..." : "Add Edge"}
      </Button>
    </form>
  );
}
