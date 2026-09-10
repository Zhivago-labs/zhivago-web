import { redirect } from "next/navigation";
import { Fraunces, Inter } from "next/font/google";
import { getSessionUser } from "@/lib/session";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { MarketplaceSection } from "@/components/landing/MarketplaceSection";
import { TransitionBand } from "@/components/landing/TransitionBand";
import { CrmSection } from "@/components/landing/CrmSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import styles from "./page.module.css";

// Tipografia exclusiva da landing page (Fraunces nos títulos, Inter no corpo) — carregada só
// aqui via next/font, sem afetar a fonte (Geist) usada no resto do app.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-landing-serif",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-landing-sans",
});

export default async function LandingPage() {
  const user = await getSessionUser();

  if (user) {
    // Contas de imobiliária são "back-office": gerenciam o próprio inventário
    const isAgencyAccount = user.accountType === "AGENCY" && user.role !== "ADMIN";
    redirect(isAgencyAccount ? "/dashboard" : "/imoveis");
  }

  return (
    <div className={`${styles.landingRoot} ${fraunces.variable} ${inter.variable}`}>
      <LandingNav />
      <main>
        <LandingHero />
        <MarketplaceSection />
        <TransitionBand />
        <CrmSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
