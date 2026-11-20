import { ErrorState } from "@/components/ErrorState";
import Link from "next/link";
import type { Listing } from "@zhivago/shared";
import { FeaturedCarousel } from "./FeaturedCarousel";
import shared from "./shared.module.css";
import styles from "./FeaturedListingsSection.module.css";

export function FeaturedListingsSection({
  listings,
  loadError = false,
}: {
  listings: Listing[];
  loadError?: boolean;
}) {
  const heading = (
    <div>
      <div className={shared.sectionKicker}>Selecionados para você</div>
      <h2 id="featured-title" className={shared.sectionTitle}>
        Imóveis em destaque
      </h2>
    </div>
  );

  return (
    <section className={styles.section} id="destaques" aria-labelledby="featured-title">
      <div className={`${shared.wrap} ${styles.wideWrap}`}>
        {loadError || listings.length === 0 ? (
          <>
            <div className={styles.head}>{heading}</div>
            {loadError ? (
              <ErrorState message="Não conseguimos buscar os imóveis agora. Tente novamente em instantes." />
            ) : (
              <div className={styles.empty}>
                <p className={styles.state}>Ainda não há imóveis publicados por aqui. Que tal ser o primeiro a anunciar?</p>
                <Link href="/anuncios/novo" className={shared.btnPrimary}>
                  Anunciar imóvel
                </Link>
              </div>
            )}
          </>
        ) : (
          <FeaturedCarousel
            listings={listings}
            kicker="Selecionados para você"
            title="Imóveis em destaque"
            kickerClassName={shared.sectionKicker}
            headingClassName={shared.sectionTitle}
            viewAllHref="/imoveis"
            viewAllClassName={styles.viewAll}
          />
        )}
      </div>
    </section>
  );
}
