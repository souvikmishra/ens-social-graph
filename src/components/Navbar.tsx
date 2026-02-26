import Link from "next/link";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
      <Link href="/" className="text-lg font-bold tracking-tight">
        ENS Social Graph
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href="/graph"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Graph
        </Link>
        <ThemeSwitcher />
      </div>
    </nav>
  );
}
