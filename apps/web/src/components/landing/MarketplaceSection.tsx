import shared from "./shared.module.css";
import styles from "./MarketplaceSection.module.css";

const FEATURES = [
  {
    title: "Buscar e filtrar",
    text: "Filtre por cidade, preço, tipo e características até achar o imóvel ideal, pra alugar por diária, por mês, ou comprar.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
    ),
  },
  {
    title: "Anuncie seu espaço",
    text: "Publique em poucos passos, salve como rascunho enquanto ajusta os detalhes e acompanhe tudo pelo dashboard.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9.5L12 3l9 6.5" />
        <path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
      </svg>
    ),
  },
  {
    title: "Anúncios moderados",
    text: "Todo anúncio passa por revisão antes de ficar público, pra manter o marketplace confiável pra quem procura e pra quem anuncia.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l2.6 7.9H22l-6.5 4.8 2.5 7.8L12 17.7l-6 4.8 2.5-7.8L2 9.9h7.4z" />
      </svg>
    ),
  },
  {
    title: "Negocie pelo chat",
    text: "Converse com o proprietário ou a imobiliária, receba pedidos de reserva e propostas sem sair da conversa.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 11.5a8.4 8.4 0 01-8.9 8.4 8.6 8.6 0 01-3.5-.8L3 20l1-5a8.3 8.3 0 01-1-4A8.4 8.4 0 0111.6 3a8.5 8.5 0 019.4 8.5z" />
      </svg>
    ),
  },
  {
    title: "Favoritos",
    text: "Salve os imóveis que você gosta e volte a eles quando quiser, sem perder o histórico de busca.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 21s-6.7-4.35-9.3-8.1C1 10.1 1.6 6.6 4.6 5.1 7 3.9 9.6 4.7 12 7.4c2.4-2.7 5-3.5 7.4-2.3 3 1.5 3.6 5 1.9 7.8C18.7 16.65 12 21 12 21z" />
      </svg>
    ),
  },
  {
    title: "Reservas",
    text: "Acompanhe o status de cada reserva — pendente, confirmada ou cancelada — em um só painel.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </svg>
    ),
  },
];

const STEPS = [
  { title: "Cadastre o imóvel", text: "Nome, fotos, preço, tipo e características do espaço." },
  { title: "Aguarde a moderação", text: "A equipe Zhivago revisa antes da publicação." },
  { title: "Publique e receba interessados", text: "O imóvel aparece na busca e as conversas chegam no inbox." },
];

export function MarketplaceSection() {
  return (
    <section className={styles.section} id="marketplace">
      <div className={shared.wrap}>
        <div className={shared.sectionHead}>
          <div className={shared.sectionKicker}>Para quem procura ou anuncia</div>
          <h2 className={shared.sectionTitle}>Alugar, comprar ou anunciar, sem sair da conversa</h2>
          <p className={shared.sectionSub}>
            Diária, mensal ou venda direta — filtre até achar o imóvel certo, ou publique o seu em poucos
            passos.
          </p>
        </div>

        <div className={styles.featGrid}>
          {FEATURES.map((feature) => (
            <div key={feature.title} className={styles.featCell}>
              <div className={styles.featIcon}>{feature.icon}</div>
              <div className={styles.featTitle}>{feature.title}</div>
              <div className={styles.featText}>{feature.text}</div>
            </div>
          ))}
        </div>

        <div className={styles.process}>
          <div className={styles.processTitle}>Como funciona o anúncio</div>
          <div className={styles.processRow}>
            {STEPS.map((step, index) => (
              <div key={step.title} className={styles.processStep}>
                <div className={styles.processNum}>{index + 1}</div>
                <h4>{step.title}</h4>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
