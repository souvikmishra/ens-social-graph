"use client";

import { useState, type FormEvent } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function isValidEnsFormat(name: string): boolean {
  return name.endsWith(".eth") && name.length > 4 && !name.includes(" ");
}

type ValidateResult = { exists: boolean; reason?: string };

type GraphInputProps = {
  onAddNames: (names: string[]) => Promise<void>;
  loading: boolean;
  existingNodes: string[];
};

export function GraphInput({
  onAddNames,
  loading,
  existingNodes,
}: GraphInputProps) {
  const [input, setInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormatError(null);

    const names = input
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (names.length === 0) return;

    const invalidFormat = names.filter((n) => !isValidEnsFormat(n));
    if (invalidFormat.length > 0) {
      setFormatError(
        invalidFormat.map((n) => `"${n}" is not a valid ENS format`).join(". ")
      );
      return;
    }

    setValidating(true);
    const validNames: string[] = [];

    await Promise.allSettled(
      names.map(async (name) => {
        try {
          const res = await fetch(
            `/api/ens/validate?name=${encodeURIComponent(name)}`
          );
          if (!res.ok) {
            toast.error(`Couldn't verify ${name} — check your connection`);
            return;
          }
          const data = (await res.json()) as ValidateResult;
          if (data.exists) {
            validNames.push(name);
          } else {
            toast.error(
              `${name} doesn't exist on Ethereum. Double-check the name.`
            );
          }
        } catch {
          toast.error(`Couldn't verify ${name} — check your connection`);
        }
      })
    );

    setValidating(false);

    if (validNames.length > 0) {
      await onAddNames(validNames);
      setInput("");
    }
  }

  const isLoading = loading || validating;
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
      <div className="flex-1 space-y-1">
        <Input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (formatError) setFormatError(null);
          }}
          placeholder={placeholder}
          className="w-full"
        />
        {formatError && (
          <p className="text-sm text-destructive">{formatError}</p>
        )}
      </div>
      <Button type="submit" disabled={isLoading || !input.trim()}>
        {isLoading ? (
          <>
            <IconLoader2 size={16} stroke={1.5} className="animate-spin" />
            Validating...
          </>
        ) : (
          "Add Edge"
        )}
      </Button>
    </form>
  );
}
