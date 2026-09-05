import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAgencyProfile } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { ListingsExplorer } from "@/components/ListingsExplorer";
import { AgencyBadge } from "@/components/AgencyBadge";
import styles from "./page.module.css";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const profile = await getAgencyProfile(id);
  if (!profile || profile.user.accountType !== "AGENCY") return { title: "Imobiliária não encontrada" };

  const title = profile.organization?.name || profile.user.companyName || profile.user.name;
  return {
    title,
    description: `Confira os imóveis anunciados por ${title} no Zhivago.`,
  };
}

export default async function AgencyPage({ params }: Params) {
  const { id } = await params;
  const profile = await getAgencyProfile(id);

  if (!profile || profile.user.accountType !== "AGENCY") notFound();

  const viewer = await getSessionUser();
  // Contas de imobiliária só enxergam a própria vitrine — a de outra conta é bloqueada. Vitrine de
  // organização (B2B) é a "loja" do time inteiro, então qualquer membro (ou visitante) pode vê-la.
  if (
    viewer?.accountType === "AGENCY" &&
    viewer.role !== "ADMIN" &&
    viewer.id !== profile.user.id &&
    !profile.organization
  ) {
    redirect("/dashboard");
  }

  const { user, organization, listings } = profile;
  const displayName = organization?.name || user.companyName || user.name;
  const avatarUrl =
    organization?.logo ??
    user.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=f0f0f0`;
  const verified = organization ? organization.verified : user.verified;
  const memberSince = new Date(user.createdAt).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className={styles.main}>
      <div className={styles.headerCard}>
        <div className={styles.avatarWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt={displayName} />
        </div>
        <div>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{displayName}</h1>
            <AgencyBadge verified={verified} />
          </div>
          {displayName !== user.name && <p className={styles.responsible}>Responsável: {user.name}</p>}
          <div className={styles.metaRow}>
            {user.creci && <span>CRECI {user.creci}</span>}
            <span>
              {user.creci && " · "}Membro desde {memberSince}
            </span>
          </div>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Imóveis anunciados ({listings.length})</h2>

      <ListingsExplorer listings={listings} />
    </main>
  );
}
