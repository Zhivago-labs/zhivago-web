import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/session";
import { getListing } from "@/lib/api";
import { getMyOrganization, getOrganizationBuildings } from "@/lib/organizations-api";
import { NewListingForm } from "@/components/listings/NewListingForm";
import styles from "../../novo/page.module.css";

export const metadata: Metadata = { title: "Editar anúncio | Zhivago" };

type Params = { params: Promise<{ id: string }> };

export default async function EditListingPage({ params }: Params) {
  const { id } = await params;
  const { user, token } = await requireAuth(`/anuncios/${id}/editar`);

  const listing = await getListing(id, token);
  if (!listing) notFound();

  const myOrg = await getMyOrganization(token);

  // Mesma regra de `canManageOrgListing` no backend: dono (pessoa física), ou OWNER/ADMIN de
  // qualquer imóvel da própria organização, ou o BROKER responsável por este imóvel específico.
  const isOwner = listing.owner?.id === user.id;
  const isOrgManager = !!listing.organizationId && !!myOrg && (myOrg.role === "OWNER" || myOrg.role === "ADMIN");
  const isAssignedBroker = !!listing.organizationId && listing.agentId === user.id;
  if (!isOwner && !isOrgManager && !isAssignedBroker) notFound();

  const buildings = myOrg ? await getOrganizationBuildings(token) : [];
  // Volta para a lista de onde a pessoa gerencia os anúncios.
  const back = myOrg ? { href: "/empresa/imoveis", label: "Voltar aos imóveis da imobiliária" } : { href: "/meus-anuncios", label: "Voltar aos meus anúncios" };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href={back.href} className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{back.label}</span>
        </Link>
        <div>
          <h1 className={styles.title}>Editar anúncio</h1>
          <p className={styles.subtitle}>{listing.name}</p>
        </div>
      </header>

      <NewListingForm
        userId={user.id}
        myOrg={myOrg}
        buildings={buildings.map((b) => ({ id: b.id, name: b.name, address: b.address }))}
        listing={listing}
        returnTo={back.href}
      />
    </main>
  );
}
