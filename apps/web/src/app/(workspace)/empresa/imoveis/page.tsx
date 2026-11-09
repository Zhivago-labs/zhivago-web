import Link from "next/link";
import { Upload, Plus, InfoCircle } from "iconoir-react";
import { requireWorkspace } from "@/lib/workspace";
import { getOrganizationListings, getMyAssignedListings } from "@/lib/organizations-api";
import { CompactListings } from "@/components/workspace/CompactListings";
import styles from "@/components/workspace/Workspace.module.css";
export const metadata = { title: "Imóveis da imobiliária" };
export default async function Properties({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { token, user, membership } = await requireWorkspace("/empresa/imoveis");
  const orgWide = ["OWNER", "ADMIN", "MANAGER", "ASSISTANT"].includes(membership.role);
  const canCreate = ["OWNER", "ADMIN", "BROKER"].includes(membership.role);
  const listings = orgWide ? await getOrganizationListings(token) : await getMyAssignedListings(token);
  const { status } = await searchParams;
  const initialStatus = status === "SOLD" ? "SOLD" : "";
  const soldCount = listings.filter((listing) => listing.status === "SOLD").length;
  return <main className={styles.page}>
    <div className={styles.header}>
      <div><h1>Imóveis</h1><p className={styles.muted}>{orgWide ? "Portfólio da imobiliária" : "Anúncios sob sua responsabilidade"}. O responsável pelo anúncio é independente do responsável pela oportunidade.</p></div>
      {canCreate && <div className={styles.actions}><Link href="/anuncios/importar" className={styles.btn}><Upload width={17} height={17} aria-hidden="true" />Importar em lote</Link><Link href="/anuncios/novo" className={`${styles.btn} ${styles.btnPrimary}`}><Plus width={18} height={18} aria-hidden="true" />Novo anúncio</Link></div>}
    </div>
    <nav className={styles.tabs} aria-label="Disponibilidade dos imóveis">
      <Link href="/empresa/imoveis" aria-current={!initialStatus ? "page" : undefined}>Todos os imóveis <span>{listings.length}</span></Link>
      <Link href="/empresa/imoveis?status=SOLD" aria-current={initialStatus === "SOLD" ? "page" : undefined}>Vendidos <span>{soldCount}</span></Link>
    </nav>
    <div className={styles.note}><InfoCircle width={18} height={18} aria-hidden="true" /><p><strong>Em análise</strong> e <strong>rejeitado</strong> indicam moderação; <strong>publicado</strong>, <strong>rascunho</strong>, <strong>vendido</strong> e <strong>alugado</strong> indicam disponibilidade.</p></div>
    <CompactListings key={initialStatus} listings={listings} role={membership.role} userId={user.id} initialStatus={initialStatus} />
  </main>;
}
