'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authClient } from '../../lib/auth-client.js';
export default function Header() {
  const pathname = usePathname(),
    router = useRouter(),
    { data: session, isPending } = authClient.useSession();
  async function signOut() {
    await authClient.signOut();
    router.replace('/sign-in');
    router.refresh();
  }
  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="Wattwise dashboard">
        <span className="brand-mark">W</span>
        <span>Wattwise</span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link className={pathname === '/' ? 'active' : ''} href="/">
          Dashboard
        </Link>
        <Link className={pathname.startsWith('/solar') ? 'active' : ''} href="/solar">
          Solar analytics
        </Link>
      </nav>
      <div className="auth-nav">
        {!isPending &&
          (session?.user ? (
            <button className="auth-nav-button" onClick={signOut}>
              Sign out
            </button>
          ) : (
            <Link className="auth-nav-button" href="/sign-in">
              Sign in
            </Link>
          ))}
      </div>
    </header>
  );
}
