import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-border bg-white shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/">
          <h1 className="text-h2 font-bold text-neutral-ink hover:text-primary transition-colors cursor-pointer">
            CastCue
          </h1>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="hover-lift">ログイン</Button>
          </Link>
          <Link href="/login">
            <Button className="hover-lift shadow-lg shadow-primary/25">
              無料で始める
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
