import Link from "next/link";

export default function Header() {
  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="Wattwise dashboard">
        <span className="brand-mark">W</span>
        <span>Wattwise</span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link className="active" href="/">Dashboard</Link>
        <Link href="/solar">Solar analytics</Link>
      </nav>
    </header>
  );
}
