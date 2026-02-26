"use client";

import { useEffect } from "react";

export function ConsoleEasterEgg() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    console.log(
      `%c
  █████╗ ██╗   ██╗ ██████╗ ██╗    ██╗███████╗██████╗    ██████╗ ███████╗██╗   ██╗
 ██╔══██╗██║   ██║██╔════╝ ██║    ██║██╔════╝██╔══██╗   ██╔══██╗██╔════╝██║   ██║
 ███████║██║   ██║██║  ███╗██║ █╗ ██║█████╗  ██████╔╝   ██║  ██║█████╗  ██║   ██║
 ██╔══██║╚██╗ ██╔╝██║   ██║██║███╗██║██╔══╝  ██╔══██╗   ██║  ██║██╔══╝  ╚██╗ ██╔╝
 ██║  ██║ ╚████╔╝ ╚██████╔╝╚███╔███╔╝███████╗██████╔╝██╗██████╔╝███████╗ ╚████╔╝ 
 ╚═╝  ╚═╝  ╚═══╝   ╚═════╝  ╚══╝╚══╝ ╚══════╝╚═════╝ ╚═╝╚═════╝ ╚══════╝  ╚═══╝
`,
      "color: #C96442; font-family: monospace;"
    );

    console.log(
      `%c
Hey there, curious cat. 👀

Caught you peeking through the developer console — checking if I was actually 
making DB calls and all that good stuff. I respect the thoroughness.

This was a genuinely fun exercise. You can check out more of my work at:
👉 https://avgweb.dev

── Limitations ──────────────────────────────────────────────────────

  ▸ No user auth — the graph is global. Anyone with the URL can modify your connections.
  ▸ ENS resolution hits Alchemy live on every render — no caching, slow on cold loads,
    and rate-limited under heavy use.
  ▸ The graph is undirected and flat — no edge weights, relationship types, or
    directionality (e.g. "follows" vs "friends with").
  ▸ No pagination — loading 50+ nodes would get messy fast with the current layout.
  ▸ Avatars are fetched individually per node — waterfall requests on large graphs.

── Would-Have-Dones ─────────────────────────────────────────────────

  ▸ Used The Graph Protocol to index ENS data instead of live RPC calls —
    faster, cheaper, and way more reliable at scale.
  ▸ Wallet connect so users own their graph — your connections, your signature.
  ▸ A proper graph diffing algorithm for the save/discard flow instead of
    simple array comparison.
  ▸ Animated edges to show connection strength or recency.
  ▸ Redis caching layer for ENS resolution with a 24h TTL.

─────────────────────────────────────────────────────────────────────
`,
      "color: #888; font-family: monospace; font-size: 12px; line-height: 1.6;"
    );
  }, []);

  return null;
}
