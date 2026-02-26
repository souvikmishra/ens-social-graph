"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Footer } from "@/components/Footer";

function parseEnsInput(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isValidEnsFormat(name: string): boolean {
  return name.endsWith(".eth") && name.length > 4 && !name.includes(" ");
}

const formSchema = z.object({
  ensInput: z.string().refine(
    (val) => val.trim().length > 0,
    "Please enter at least one ENS name"
  ),
});

type FormValues = z.infer<typeof formSchema>;
type ValidateResult = { exists: boolean; reason?: string };

export default function Home() {
  const router = useRouter();
  const [validating, setValidating] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onSubmit",
    defaultValues: { ensInput: "" },
  });

  const ensInputValue = form.watch("ensInput");

  async function onSubmit(values: FormValues) {
    const names = parseEnsInput(values.ensInput);
    if (names.length === 0) {
      form.setError("ensInput", {
        message: "Please enter at least one ENS name",
      });
      return;
    }

    const invalidFormat = names.filter((n) => !isValidEnsFormat(n));
    if (invalidFormat.length > 0) {
      form.setError("ensInput", {
        message: invalidFormat
          .map((n) => `"${n}" is not a valid ENS format`)
          .join(". "),
      });
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
      form.setError("ensInput", {
        message:
          failedNames
            .map((n) => `"${n}" doesn't exist on Ethereum`)
            .join(". ") + ". Double-check the name(s).",
      });
      return;
    }

    if (names.length === 1) {
      router.push(`/profile/${names[0]}`);
    } else {
      router.push(`/graph?names=${names.join(",")}`);
    }
  }

  return (
    <>
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <FormField
              control={form.control}
              name="ensInput"
              render={({ field }) => (
                <FormItem>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="vitalik.eth or vitalik.eth, balajis.eth"
                        className="flex-1"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (form.formState.errors.ensInput) {
                            form.clearErrors("ensInput");
                          }
                        }}
                      />
                    </FormControl>
                    <Button
                      type="submit"
                      disabled={validating}
                      className="min-w-[160px]"
                    >
                      {validating ? (
                        <IconLoader2
                          size={16}
                          stroke={1.5}
                          className="animate-spin"
                        />
                      ) : parseEnsInput(ensInputValue).length >= 2 ? (
                        "Generate Graph"
                      ) : (
                        "View ENS Profile"
                      )}
                    </Button>
                  </div>
                  <FormDescription className="text-left">
                    Enter a single name to view a profile, or multiple names
                    separated by commas to generate a social graph.
                  </FormDescription>
                  <FormMessage className="text-left" />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <Link
          href="/graph"
          className="inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Open Graph
        </Link>
      </div>
    </div>
    <Footer />
    </>
  );
}
