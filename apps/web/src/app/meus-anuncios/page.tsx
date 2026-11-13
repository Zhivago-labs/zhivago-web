import { ErrorState } from "@/components/ErrorState";
import { redirect } from "next/navigation";
import { getMyOrganization } from "@/lib/organizations-api";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/session";
import { getMyListings, type OwnedListing } from "@/lib/listings-api";
import { MyListingsView } from "@/components/my-listings/MyListingsView";
import styles from "./meus-anuncios.module.css";

export const metadata: Metadata = { title: "Meus Anúncios | Zhivago" };

export default async function MyListingsPage() {
  const { token, user } = await requireAuth("/meus-anuncios");
  if (await getMyOrganization(token)) redirect("/empresa/imoveis");
  const isAgency = user.accountType === "AGENCY";

  let listings: OwnedListing[] = [];
  let loadError = false;

  try {
    listings = await getMyListings(token);
  } catch {
    loadError = true;
  }

  return (
    <main className={styles.main}>
      {loadError ? (
        <ErrorState title="Seus anúncios não carregaram" message="Não conseguimos buscar seus imóveis agora. Tente novamente para continuar." />
      ) : (
        <MyListingsView listings={listings} isAgency={isAgency} />
      )}
    </main>
  );
}
