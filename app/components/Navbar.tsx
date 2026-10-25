"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/hunt", label: "Hunt", icon: "◎" },
  { href: "/analyse", label: "Analyse", icon: "◇" },
  { href: "/sell", label: "Sell", icon: "↗" },
  { href: "/account", label: "Account", icon: "♙" },
];

export default function Navbar() {
  const pathname = usePathname();
  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <>
      <header className="th-header">
        <nav className="th-header-inner">
          <Link href="/" className="th-brand" aria-label="ToyHunter AI home">
            <span className="th-logo" aria-hidden="true">TH</span>
            <span>ToyHunter <span className="th-brand-ai">AI</span></span>
          </Link>
          <div className="th-desktop-links">
            {[
              { href: "/", label: "Home" },
              { href: "/hunt", label: "Daily Hunt" },
              { href: "/analyse", label: "Analyse" },
              { href: "/sell", label: "Sell" },
              { href: "/events", label: "Events" },
              { href: "/account", label: "My Account" },
            ].map(tab => <Link key={tab.href} href={tab.href} className={active(tab.href) ? "th-nav-active" : ""}>{tab.label}</Link>)}
          </div>
          <Link href="/events" className="th-mobile-events">Events</Link>
        </nav>
      </header>
      <nav className="th-bottom-nav" aria-label="Hoofdnavigatie">
        {tabs.map(tab => (
          <Link key={tab.href} href={tab.href} className={`th-bottom-tab ${active(tab.href) ? "is-active" : ""}`} aria-current={active(tab.href) ? "page" : undefined}>
            <span className="th-bottom-icon" aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
