import Link from "next/link";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
      <Link href="/" className="text-lg font-bold tracking-tight">
        ENS Social Graph
      </Link>
      <Link
        href="/graph"
        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        Graph
      </Link>
    </nav>
  );
}
