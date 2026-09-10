import Link from "next/link";
import { SmoothAnchorLink } from "./SmoothAnchorLink";
import shared from "./shared.module.css";
import styles from "./LandingHero.module.css";

export function LandingHero() {
  return (
    <header className={styles.hero}>
      <div className={`${shared.wrap} ${styles.heroGrid}`}>
        <div>
          <div className={styles.badge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.5-6.3 4.5 2.3-7.2-6-4.6h7.6z" />
            </svg>
            <span>Marketplace de imóveis + CRM imobiliário</span>
          </div>

          <h1 className={styles.heroTitle}>Da busca pelo imóvel certo à gestão da imobiliária inteira.</h1>
          <p className={styles.heroSub}>
            Zhivago reúne um marketplace de aluguel e venda com um CRM completo para equipes
            imobiliárias — leads, propostas e reservas, tudo no mesmo lugar.
          </p>

          <div className={styles.heroActions}>
            <Link href="/imoveis" className={shared.btnPrimary}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              Explorar imóveis
            </Link>
            <SmoothAnchorLink href="#crm" className={shared.btnSecondary}>
              Ver o CRM para imobiliárias
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </SmoothAnchorLink>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.propCard}>
            <div className={styles.propPhoto}>
              <div className={styles.propFav}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff" stroke="none">
                  <path d="M12 21s-6.7-4.35-9.3-8.1C1 10.1 1.6 6.6 4.6 5.1 7 3.9 9.6 4.7 12 7.4c2.4-2.7 5-3.5 7.4-2.3 3 1.5 3.6 5 1.9 7.8C18.7 16.65 12 21 12 21z" />
                </svg>
              </div>
            </div>
            <div className={styles.propBody}>
              <div className={styles.propLoc}>Belo Horizonte, MG</div>
              <div className={styles.propName}>Apartamento Savassi</div>
              <div className={styles.propMeta}>
                <span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 10.5L12 4l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />
                  </svg>
                  2 quartos
                </span>
                <span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="7" width="18" height="4" />
                    <path d="M5 7V5a2 2 0 012-2h10a2 2 0 012 2v2M5 11v8M19 11v8" />
                  </svg>
                  1 vaga
                </span>
              </div>
              <div className={styles.propFoot}>
                <div className={styles.propPrice}>
                  R$ 2.450 <small>/ mês</small>
                </div>
                <div className={styles.propStatus}>Disponível</div>
              </div>
            </div>
          </div>

          <div className={`${styles.floatChip} ${styles.chipMsg}`}>
            <span className={styles.dot} /> Nova mensagem do interessado
          </div>
          <div className={`${styles.floatChip} ${styles.chipVerify}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Anúncio moderado
          </div>
        </div>
      </div>
    </header>
  );
}
