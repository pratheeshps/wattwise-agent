"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="Wattwise dashboard">
        <span className="brand-mark">W</span>
        <span>Wattwise</span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link
          className={pathname === "/" ? "active" : ""}
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
        >
          Dashboard
        </Link>
        <Link
          className={pathname === "/solar" || pathname.startsWith("/solar/") ? "active" : ""}
          href="/solar"
          aria-current={pathname === "/solar" || pathname.startsWith("/solar/") ? "page" : undefined}
        >
          Solar analytics
        </Link>
      </nav>
    </header>
  );
}
