"use client";

import { useEffect, useId, useRef, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import styles from "./ListingTabs.module.css";

export type ListingTab = { id: string; label: string; content: ReactNode };

// A aba aberta mora no endereço (#visao-geral, #localizacao…): dá para compartilhar o link e os
// links internos para #aba (ex.: "Ver no mapa") também abrem a aba certa.
const HASH_EVENT = "zhivago:listing-tab";
const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  window.addEventListener(HASH_EVENT, notify);
  return () => {
    window.removeEventListener("hashchange", notify);
    window.removeEventListener(HASH_EVENT, notify);
  };
};
const readHash = () => decodeURIComponent(window.location.hash.slice(1));

/** Abas da página do imóvel: cada uma mostra o próprio conteúdo no painel (padrão WAI-ARIA Tabs). */
export function ListingTabs({ tabs }: { tabs: ListingTab[] }) {
  const baseId = useId();
  const hash = useSyncExternalStore(subscribe, readHash, () => "");
  const active = tabs.some((tab) => tab.id === hash) ? hash : tabs[0]?.id;
  const navRef = useRef<HTMLDivElement>(null);
  const lastHash = useRef("");

  // Chegou por um link para uma aba: traz o painel para a tela.
  useEffect(() => {
    if (hash && hash !== lastHash.current && tabs.some((tab) => tab.id === hash)) {
      navRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    lastHash.current = hash;
  }, [hash, tabs]);

  const select = (id: string, focus = false) => {
    // replaceState não dispara "hashchange" nem rola a página; avisa as abas manualmente.
    window.history.replaceState(window.history.state, "", `#${id}`);
    lastHash.current = id;
    window.dispatchEvent(new Event(HASH_EVENT));
    if (focus) document.getElementById(`${baseId}-tab-${id}`)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === active);
    const next =
      event.key === "ArrowRight" ? (index + 1) % tabs.length
      : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
      : event.key === "Home" ? 0
      : event.key === "End" ? tabs.length - 1
      : -1;
    if (next < 0) return;
    event.preventDefault();
    select(tabs[next].id, true);
  };

  return (
    <div className={styles.wrap}>
      <div ref={navRef} className={styles.tabs} role="tablist" aria-label="Seções do anúncio" onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className={`${styles.tab} ${selected ? styles.active : ""}`}
              onClick={() => select(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Todos os painéis ficam no HTML (bom para busca); só o da aba aberta aparece. */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${baseId}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          className={styles.panel}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
