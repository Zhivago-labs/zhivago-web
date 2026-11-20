"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { Listing } from "@zhivago/shared";
import { ListingCard } from "@/components/ListingCard";
import styles from "./FeaturedCarousel.module.css";

const AUTOPLAY_MS = 5000;

/**
 * Destaques em carrossel que avança sozinho (um card por vez, voltando ao início no fim).
 * Para quando a pessoa passa o mouse, foca algo dentro, troca de aba ou aperta "pausar" — e nem
 * começa para quem pediu menos movimento no sistema. Setas e rolagem lateral continuam manuais.
 */
export function FeaturedCarousel({
  listings,
  title,
  kicker,
  viewAllHref,
  viewAllClassName,
  headingClassName,
  kickerClassName,
}: {
  listings: Listing[];
  title: string;
  kicker: string;
  viewAllHref: string;
  viewAllClassName?: string;
  headingClassName?: string;
  kickerClassName?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    const visibility = () => setPageHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", visibility);
    return () => {
      query.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const step = useCallback(() => {
    const track = trackRef.current;
    const [first, second] = Array.from(track?.children ?? []) as HTMLElement[];
    return track && first ? (second ? second.offsetLeft - first.offsetLeft : first.offsetWidth) : 0;
  }, []);

  const move = useCallback(
    (direction: 1 | -1, wrap = false) => {
      const track = trackRef.current;
      if (!track) return;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
      const atStart = track.scrollLeft <= 8;
      const behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth";
      if (wrap && direction === 1 && atEnd) track.scrollTo({ left: 0, behavior });
      else if (wrap && direction === -1 && atStart) track.scrollTo({ left: track.scrollWidth, behavior });
      else track.scrollBy({ left: direction * step(), behavior });
    },
    [reducedMotion, step]
  );

  const autoplay = !userPaused && !hovering && !focused && !reducedMotion && !pageHidden && listings.length > 1;
  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setInterval(() => move(1, true), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [autoplay, move]);

  const updateEdges = () => {
    const track = trackRef.current;
    if (!track) return;
    setEdges({ start: track.scrollLeft <= 8, end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 8 });
  };

  const canAutoplay = !reducedMotion && listings.length > 1;

  return (
    <div
      className={styles.carousel}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    >
      <div className={styles.head}>
        <div>
          <div className={kickerClassName}>{kicker}</div>
          <h2 id="featured-title" className={headingClassName}>{title}</h2>
        </div>
        <div className={styles.controls}>
          <Link href={viewAllHref} className={viewAllClassName}>
            Ver todos <span aria-hidden="true">→</span>
          </Link>
          {canAutoplay && (
            <button type="button" className={styles.control} onClick={() => setUserPaused((value) => !value)}
              aria-label={userPaused ? "Retomar a passagem automática" : "Pausar a passagem automática"}>
              {userPaused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
            </button>
          )}
          <button type="button" className={styles.control} onClick={() => move(-1, true)} aria-label="Imóveis anteriores">
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button type="button" className={styles.control} onClick={() => move(1, true)} aria-label="Próximos imóveis">
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className={styles.track}
        onScroll={updateEdges}
        role="region"
        aria-roledescription="carrossel"
        aria-label="Imóveis em destaque"
        data-start={edges.start}
        data-end={edges.end}
      >
        {listings.map((listing, index) => (
          <div key={listing.id} className={styles.slide} role="group" aria-roledescription="item" aria-label={`${index + 1} de ${listings.length}`}>
            <ListingCard listing={listing} explore priority={index < 2} />
          </div>
        ))}
      </div>
    </div>
  );
}
