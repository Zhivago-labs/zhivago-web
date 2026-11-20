import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Listing } from "@zhivago/shared";
import { getListings } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { thumbnailUrl } from "@/lib/images";
import { ModalitiesSection, type ModalityTile } from "@/components/landing/ModalitiesSection";
import { LandingNav } from "@/components/landing/LandingNav";
import { HomeHero } from "@/components/landing/HomeHero";
import { LocationsSection } from "@/components/landing/LocationsSection";
import { FeaturedListingsSection } from "@/components/landing/FeaturedListingsSection";
import { WhyZhivagoSection } from "@/components/landing/WhyZhivagoSection";
import { ChatSection } from "@/components/landing/ChatSection";
import { ListYourPropertySection } from "@/components/landing/ListYourPropertySection";
import { AgencyTeaserSection } from "@/components/landing/AgencyTeaserSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { fraunces, inter } from "@/components/landing/fonts";
import { byRelevance, citySummaries, eligiblePublicListings, locationSuggestions } from "@/components/landing/home-data";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: { absolute: "Zhivago — Imóveis para comprar, alugar ou temporada" },
  description:
    "Encontre casas e apartamentos para comprar, alugar ou ficar por temporada e fale direto com quem anuncia pelo chat do Zhivago.",
};

// Carrossel: poucos e bons — 6 destaques que passam sozinhos, em vez de uma grade longa.
const FEATURED_LIMIT = 6;

const MODALITIES: { categoria: ModalityTile["categoria"]; operationType: Listing["operationType"]; title: string; text: string }[] = [
  { categoria: "venda", operationType: "SALE", title: "Comprar", text: "Casas e apartamentos para chamar de seus." },
  { categoria: "aluguel", operationType: "MONTHLY_RENT", title: "Alugar", text: "Para morar por meses, com contrato mensal." },
  { categoria: "temporada", operationType: "DAILY_RENT", title: "Temporada", text: "Diárias para viajar, descansar ou trabalhar." },
];

export default async function LandingPage() {
  const user = await getSessionUser();

  if (user) {
    if (!user.onboardingCompleted) redirect("/boas-vindas");
    const isAgencyAccount = user.accountType === "AGENCY" && user.role !== "ADMIN";
    redirect(isAgencyAccount ? "/dashboard" : "/imoveis");
  }

  let listings: Listing[] = [];
  let loadError = false;
  try {
    listings = eligiblePublicListings(await getListings());
  } catch {
    loadError = true;
  }

  // Destaques só com foto — um card sem imagem não vende o imóvel na vitrine da home.
  const featured = listings
    .filter((listing) => listing.images.length > 0)
    .sort(byRelevance)
    .slice(0, FEATURED_LIMIT);

  // Foto e contagem reais de cada modalidade e de cada cidade (sempre do imóvel mais relevante).
  const withPhotos = listings.filter((listing) => listing.images.length > 0).sort(byRelevance);
  const modalityTiles: ModalityTile[] = MODALITIES.map(({ operationType, ...tile }) => ({
    ...tile,
    count: listings.filter((listing) => listing.operationType === operationType).length,
    image: withPhotos.find((listing) => listing.operationType === operationType)?.images[0]?.url ?? null,
  }));
  const cityImages: Record<string, string> = {};
  for (const listing of withPhotos) {
    const city = listing.cidade?.trim();
    const thumb = thumbnailUrl(listing.images[0]?.url);
    if (city && thumb && !cityImages[city]) cityImages[city] = thumb;
  }

  return (
    <div className={`${styles.landingRoot} ${fraunces.variable} ${inter.variable}`}>
      <LandingNav />
      <main>
        <HomeHero suggestions={locationSuggestions(listings)} />
        <FeaturedListingsSection listings={featured} loadError={loadError} />
        <ModalitiesSection tiles={modalityTiles} />
        <LocationsSection cities={citySummaries(listings)} images={cityImages} />
        <WhyZhivagoSection />
        <ChatSection />
        <ListYourPropertySection />
        <AgencyTeaserSection />
        <FaqSection />
      </main>
      <LandingFooter />
    </div>
  );
}
