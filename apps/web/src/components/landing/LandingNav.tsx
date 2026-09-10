"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SmoothAnchorLink } from "./SmoothAnchorLink";
import styles from "./LandingNav.module.css";

const LINKS: { href: `#${string}`; label: string }[] = [
  { href: "#marketplace", label: "Para quem procura imóvel" },
  { href: "#crm", label: "Para imobiliárias" },
];

export function LandingNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Fecha o menu mobile com Esc, e ao redimensionar pra além do breakpoint mobile.
  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth > 720) setMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [menuOpen]);

  return (
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        <div className={styles.logo}>
          zhiv<span>a</span>go
        </div>
        <div className={styles.navLinks}>
          {LINKS.map((link) => (
            <SmoothAnchorLink key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </SmoothAnchorLink>
          ))}
          <Link href="/login" className={styles.navCta}>
            Entrar
          </Link>
          <button
            type="button"
            className={styles.menuToggle}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className={styles.mobilePanel} data-open={menuOpen}>
        {LINKS.map((link) => (
          <SmoothAnchorLink key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
            {link.label}
          </SmoothAnchorLink>
        ))}
      </div>
    </nav>
  );
}
