import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import type { Listing } from "@zhivago/shared";
import { getListings } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { ListingsExplorer } from "@/components/ListingsExplorer";
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

  const firstName = user?.name ? user.name.split(" ")[0] : "visitante";

  return (
    <main className={styles.main}>
      <div className={styles.heroSection}>
        <div className={styles.greetingBadge}>
          <Sparkles size={14} className={styles.sparkleIcon} />
          <span>Olá, {firstName} 👋</span>
        </div>

        <h1 className={styles.title}>Encontre seu próximo imóvel</h1>
        <p className={styles.subtitle}>
          Explore as melhores opções de casas e apartamentos para alugar ou comprar com facilidade e segurança.
        </p>
      </div>

      {loadError ? (
        <p className={styles.error}>
          Não foi possível carregar os imóveis agora. Tente novamente em alguns instantes.
        </p>
      ) : (
        <ListingsExplorer listings={listings} isAdmin={user?.role === "ADMIN"} />
      )}
    </main>
  );
}
