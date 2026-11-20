import Link from "next/link";
import shared from "./shared.module.css";
import styles from "./ListYourPropertySection.module.css";

const STEPS = [
  { title: "Cadastre", text: "Fotos, preço e as características do imóvel." },
  { title: "Publique", text: "Pessoas físicas publicam diretamente; imobiliárias aprovam os anúncios da própria equipe." },
  { title: "Receba interessados", text: "As conversas chegam direto nas suas mensagens." },
];

export function ListYourPropertySection() {
  return (
    <section className={styles.section} id="anunciar">
      <div className={shared.wrap}>
        <div className={styles.panel}>
          <div className={styles.copy}>
            <div className={shared.sectionKicker}>Para proprietários</div>
            <h2 className={shared.sectionTitle}>Tem um imóvel para anunciar?</h2>
            <p className={shared.sectionSub}>
              Publique seu imóvel e comece a receber interessados pelo Zhivago.
            </p>

            <ol className={styles.steps}>
              {STEPS.map((step, index) => (
                <li key={step.title} className={styles.step}>
                  <span className={styles.stepNum} aria-hidden="true">{index + 1}</span>
                  <span>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </span>
                </li>
              ))}
            </ol>

            <Link href="/anuncios/novo" className={`${shared.btnPrimary} ${styles.cta}`}>
              Anunciar imóvel
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          <picture className={styles.art}>
            <source type="image/avif" sizes="(max-width: 860px) 100vw, 560px" srcSet="/images/system/auth-bg-1024.avif 1024w, /images/system/auth-bg-1920.avif 1920w" />
            <source type="image/webp" sizes="(max-width: 860px) 100vw, 560px" srcSet="/images/system/auth-bg-1024.webp 1024w, /images/system/auth-bg-1920.webp 1920w" />
            <img src="/images/system/auth-bg-1024.jpg" alt="" loading="lazy" decoding="async" />
          </picture>
        </div>
      </div>
    </section>
  );
}
