import Link from "next/link";
import shared from "./shared.module.css";
import styles from "./CtaSection.module.css";

export function CtaSection() {
  return (
    <section className={styles.ctaSection} id="cta">
      <div className={shared.wrap}>
        <div className={styles.ctaSplit}>
          <div className={`${styles.ctaCard} ${styles.a}`}>
            <h3>Quer alugar, comprar ou anunciar um imóvel?</h3>
            <p>Crie sua conta gratuita e explore os imóveis disponíveis agora.</p>
            <Link href="/cadastro" className={shared.btnPrimary}>
              Cadastre-se
            </Link>
          </div>
          <div className={`${styles.ctaCard} ${styles.b}`}>
            <h3>Sua imobiliária quer organizar os leads?</h3>
            <p>Cadastre sua organização, convide a equipe e comece a distribuir leads hoje mesmo.</p>
            <Link href="/cadastro" className={shared.btnLight}>
              Criar organização
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
