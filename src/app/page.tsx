"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function parseEnsInput(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default function Home() {
  const router = useRouter();
  const [ensInput, setEnsInput] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const names = parseEnsInput(ensInput);
    if (names.length === 0) return;

    if (names.length === 1) {
      router.push(`/profile/${names[0]}`);
    } else {
      router.push(`/graph?names=${names.join(",")}`);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            ENS Social Graph
          </h1>
          <p className="text-muted-foreground">
            Explore ENS profiles and visualize connections
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={ensInput}
            onChange={(e) => setEnsInput(e.target.value)}
            placeholder="One name for profile, multiple for graph (e.g. vitalik.eth, balajis.eth)"
            className="flex-1"
          />
          <Button type="submit">Go</Button>
        </form>

        <Link
          href="/graph"
          className="inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Open Graph
        </Link>
      </div>
    </div>
  );
}
