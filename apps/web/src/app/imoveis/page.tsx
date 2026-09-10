import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { Listing } from "@zhivago/shared";
import { getListings } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { ListingsExplorer } from "@/components/ListingsExplorer";
import { ErrorState } from "@/components/ErrorState";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Explorar imóveis" };

export default async function ImoveisPage() {
  let listings: Listing[];
  let loadError = false;
  const user = await getSessionUser();

  // Contas de imobiliária são "back-office": gerenciam o próprio inventário
  if (user?.accountType === "AGENCY" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  try {
    listings = await getListings();
  } catch {
    loadError = true;
    listings = [];
  }

  return (
    <main className={styles.main}>
      <div className={styles.heroSection}>
        <h1 className={styles.title}>Explorar imóveis</h1>
        <p className={styles.subtitle}>Casas e apartamentos para alugar ou comprar.</p>
      </div>

      {loadError ? (
        <ErrorState message="Tente novamente em alguns instantes." />
      ) : (
        <ListingsExplorer listings={listings} isAdmin={user?.role === "ADMIN"} />
      )}
    </main>
  );
}
