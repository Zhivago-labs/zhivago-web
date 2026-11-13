import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/session";
import { NewListingForm } from "@/components/listings/NewListingForm";
import { getMyOrganization, getOrganizationBuildings } from "@/lib/organizations-api";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Anunciar imóvel | Zhivago" };

export default async function NewListingPage() {
  const { user, token } = await requireAuth("/anuncios/novo");

  // Etapas de empreendimento + atendimento/CRM do assistente só existem pra conta de organização.
  const myOrg = await getMyOrganization(token);
  const buildings = myOrg ? await getOrganizationBuildings(token) : [];

  if (user.role === "ADMIN" || (myOrg && !["OWNER", "ADMIN", "BROKER"].includes(myOrg.role))) {
    return (
      <main className={styles.main}>
        <p className={styles.restricted}>Seu papel não permite criar anúncios.</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Voltar ao dashboard</span>
        </Link>
        <div>
          <h1 className={styles.title}>Anuncie seu imóvel no Zhivago</h1>
          <p className={styles.subtitle}>Preencha em poucas etapas. Você pode salvar um rascunho e continuar depois.</p>
        </div>
      </header>

      <NewListingForm
        userId={user.id}
        myOrg={myOrg}
        buildings={buildings.map((b) => ({ id: b.id, name: b.name, address: b.address }))}
      />
    </main>
  );
}
