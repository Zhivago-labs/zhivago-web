import Link from "next/link";
import { MapPin } from "@/components/icons";
import type { CitySummary } from "./home-data";
import shared from "./shared.module.css";
import styles from "./LocationsSection.module.css";

/**
 * Cidades com imóveis publicados, cada uma com a foto de um imóvel de lá (`images`, pela
 * `city.query`). Só renderiza com 2+ cidades — uma lista de uma cidade só não ajuda.
 */
export function LocationsSection({ cities, images = {} }: { cities: CitySummary[]; images?: Record<string, string> }) {
  if (cities.length < 2) return null;

  return (
    <section className={styles.section} aria-labelledby="locations-title">
      <div className={shared.wrap}>
        <div className={shared.sectionHead}>
          <div className={shared.sectionKicker}>Por perto ou longe</div>
          <h2 id="locations-title" className={shared.sectionTitle}>
            Explore por cidade
          </h2>
        </div>
        <ul className={styles.list}>
          {cities.slice(0, 8).map((city) => {
            const image = images[city.query];
            return (
              <li key={city.query}>
                <Link href={`/imoveis?q=${encodeURIComponent(city.query)}`} className={styles.city}>
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className={styles.thumb} loading="lazy" decoding="async" />
                  ) : (
                    <span className={styles.thumb} aria-hidden="true">
                      <MapPin size={20} />
                    </span>
                  )}
                  <span className={styles.name}>{city.label}</span>
                  <span className={styles.count}>
                    {city.count} {city.count === 1 ? "imóvel" : "imóveis"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
