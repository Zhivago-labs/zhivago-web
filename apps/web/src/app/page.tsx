import { redirect } from "next/navigation";
import Link from "next/link";
import { Search, KeyRound, Building2, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import styles from "./page.module.css";

export default async function LandingPage() {
  const user = await getSessionUser();

  if (user) {
    // Contas de imobiliária são "back-office": gerenciam o próprio inventário
    const isAgencyAccount = user.accountType === "AGENCY" && user.role !== "ADMIN";
    redirect(isAgencyAccount ? "/dashboard" : "/imoveis");
  }

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <Sparkles size={14} />
          <span>O marketplace de imóveis Zhivago</span>
        </div>

        <h1 className={styles.heroTitle}>Encontre, alugue ou anuncie o imóvel certo</h1>
        <p className={styles.heroSubtitle}>
          Casas e apartamentos para diária, mensal ou venda — tudo num só lugar, com moderação de
          anúncios e negociação direta entre proprietário e interessado.
        </p>

        <div className={styles.heroActions}>
          <Link href="/imoveis" className={styles.primaryButton}>
            <Search size={18} />
            <span>Explorar imóveis</span>
          </Link>
          <Link href="/login?next=/anuncios/novo" className={styles.secondaryButton}>
            <span>Anunciar meu imóvel</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className={styles.featuresGrid}>
        <div className={styles.featureCard}>
          <div className={styles.featureIconWrap}>
            <KeyRound size={22} />
          </div>
          <h2 className={styles.featureTitle}>Alugue ou compre</h2>
          <p className={styles.featureText}>
            Diária, mensal ou venda direta — filtre por cidade, preço e características até achar o
            imóvel ideal.
          </p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.featureIconWrap}>
            <Building2 size={22} />
          </div>
          <h2 className={styles.featureTitle}>Anuncie seu espaço</h2>
          <p className={styles.featureText}>
            Publique em poucos passos, salve como rascunho enquanto ajusta os detalhes e acompanhe
            tudo pelo seu dashboard.
          </p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.featureIconWrap}>
            <ShieldCheck size={22} />
          </div>
          <h2 className={styles.featureTitle}>Anúncios moderados</h2>
          <p className={styles.featureText}>
            Todo anúncio passa por revisão antes de ficar público, pra manter o marketplace confiável
            pra quem procura e pra quem anuncia.
          </p>
        </div>
      </section>

      <section className={styles.ctaBanner}>
        <div>
          <h2 className={styles.ctaTitle}>Pronto para começar?</h2>
          <p className={styles.ctaText}>Crie sua conta gratuita e explore os imóveis disponíveis agora.</p>
        </div>
        <div className={styles.ctaActions}>
          <Link href="/login" className={styles.ctaSecondary}>
            Entrar
          </Link>
          <Link href="/cadastro" className={styles.ctaPrimary}>
            Cadastre-se
          </Link>
        </div>
      </section>
    </main>
  );
}
