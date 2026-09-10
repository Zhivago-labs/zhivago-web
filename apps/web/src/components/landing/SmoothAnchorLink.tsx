"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";

interface SmoothAnchorLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: `#${string}`;
}

// Scroll suave só para os links âncora da landing page — evitado no nível global
// (html{scroll-behavior:smooth}) pra não afetar a navegação do resto do app.
export function SmoothAnchorLink({ href, onClick, children, ...rest }: SmoothAnchorLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(href.slice(1));
    if (target) {
      e.preventDefault();
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      history.pushState(null, "", href);
    }
    onClick?.(e);
  };

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
