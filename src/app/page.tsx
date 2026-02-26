"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function parseEnsInput(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isValidEnsFormat(name: string): boolean {
  return name.endsWith(".eth") && name.length > 4 && !name.includes(" ");
}

type ValidateResult = { exists: boolean; reason?: string };

export default function Home() {
  const router = useRouter();
  const [ensInput, setEnsInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const names = parseEnsInput(ensInput);
    if (names.length === 0) return;

    const invalidFormat = names.filter((n) => !isValidEnsFormat(n));
    if (invalidFormat.length > 0) {
      setError(
        invalidFormat
          .map((n) => `"${n}" is not a valid ENS format`)
          .join(". ")
      );
      return;
    }

    setValidating(true);
    const failedNames: string[] = [];

    await Promise.allSettled(
      names.map(async (name) => {
        try {
          const res = await fetch(
            `/api/ens/validate?name=${encodeURIComponent(name)}`
          );
          if (!res.ok) {
            failedNames.push(name);
            return;
          }
          const data = (await res.json()) as ValidateResult;
          if (!data.exists) {
            failedNames.push(name);
          }
        } catch {
          failedNames.push(name);
        }
      })
    );

    setValidating(false);

    if (failedNames.length > 0) {
      setError(
        failedNames
          .map((n) => `"${n}" doesn't exist on Ethereum`)
          .join(". ") + ". Double-check the name(s)."
      );
      return;
    }

    if (names.length === 1) {
      router.push(`/profile/${names[0]}`);
    } else {
      router.push(`/graph?names=${names.join(",")}`);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            ENS Social Graph
          </h1>
          <p className="text-muted-foreground">
            Explore ENS profiles and visualize connections
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={ensInput}
              onChange={(e) => {
                setEnsInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="One name for profile, multiple for graph (e.g. vitalik.eth, balajis.eth)"
              className="flex-1"
            />
            <Button type="submit" disabled={validating} className="min-w-[160px]">
              {validating ? (
                <IconLoader2 size={16} stroke={1.5} className="animate-spin" />
              ) : parseEnsInput(ensInput).length >= 2 ? (
                "Generate Graph"
              ) : (
                "View ENS Profile"
              )}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-destructive text-left">{error}</p>
          )}
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
