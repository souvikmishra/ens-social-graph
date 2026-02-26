import Link from "next/link";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
      <Link href="/" className="text-lg font-bold tracking-tight">
        ENS Social Graph
      </Link>
      <ThemeSwitcher />
    </nav>
  );
}
