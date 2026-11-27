import Link from "next/link";
import { redirect } from "next/navigation";
import { UserXmark } from "iconoir-react";
import { requireWorkspace, workspaceFetch } from "@/lib/workspace";
import type { UnassignedQueue } from "@/lib/workspace-types";
import { getLeadAssignees, SOURCE_LABELS, OPERATION_LABELS } from "@/lib/leads-api";
import { fmtDateTime, fmtHours } from "@/components/workspace/workspace-ui";
import { ClaimLeadButton } from "@/components/dashboard/ClaimLeadButton";
import { BulkAssignForm, BULK_FORM_ID } from "@/components/dashboard/BulkAssignForm";
import styles from "@/components/workspace/Workspace.module.css";

export const metadata = { title: "Sem responsável" };

const READ_ROLES = ["OWNER", "ADMIN", "MANAGER", "ASSISTANT"];
const MANAGE_ROLES = ["OWNER", "ADMIN", "MANAGER"];

/**
 * Fila de trabalho da gestão: oportunidades em aberto sem responsável, da entrada mais antiga para
 * a mais nova, com idade, canal, empreendimento e o motivo de terem ficado sem destino.
 */
export default async function UnassignedQueuePage({ searchParams }: { searchParams: Promise<{ page?: string; source?: string }> }) {
  const { token, membership, user } = await requireWorkspace("/empresa/fila");
  if (!READ_ROLES.includes(membership.role)) redirect("/empresa");
  const params = await searchParams;
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  const query = new URLSearchParams({ page: String(page) });
  if (params.source && params.source in SOURCE_LABELS) query.set("source", params.source);
  const canManage = MANAGE_ROLES.includes(membership.role);
  const [queue, assignees] = await Promise.all([
    workspaceFetch<UnassignedQueue>(token, `/leads/queue?${query}`),
    canManage ? getLeadAssignees(token) : Promise.resolve([]),
  ]);
  const me = assignees.find((a) => a.userId === user.id);
  const totalPages = Math.max(1, Math.ceil(queue.total / queue.limit));

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Sem responsável</h1>
          <p className={styles.muted}>Oportunidades em aberto que ainda não têm quem atenda, da mais antiga para a mais nova.</p>
        </div>
      </div>

      <form className={`${styles.filters} ${styles.toolbar}`} action="/empresa/fila">
        <select name="source" aria-label="Canal de entrada" defaultValue={params.source ?? ""}>
          <option value="">Todos os canais</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button type="submit">Filtrar</button>
        {canManage && queue.items.length > 0 && <BulkAssignForm assignees={assignees} />}
      </form>

      <p className={styles.resultCount} role="status">{queue.total} {queue.total === 1 ? "oportunidade" : "oportunidades"} na fila</p>

      {queue.items.length === 0 ? (
        <div className={styles.emptyState}><UserXmark aria-hidden="true" /><strong>Fila vazia</strong><span>Todas as oportunidades em aberto têm responsável.</span></div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>{canManage && <th aria-label="Selecionar">Sel.</th>}<th>Cliente e imóvel</th><th>Espera</th><th>Canal</th><th>Por que está aqui</th><th>Ações</th></tr></thead>
            <tbody>
              {queue.items.map((item) => (
                <tr key={item.id}>
                  {canManage && <td><input type="checkbox" name="leadIds" value={item.id} form={BULK_FORM_ID} aria-label={`Selecionar ${item.user.name}`} /></td>}
                  <td>
                    <strong>{item.user.name}</strong>
                    <p className={styles.muted} style={{ fontSize: 12 }}>{item.listing.name} · {OPERATION_LABELS[item.listing.operationType] ?? item.listing.operationType}{item.listing.building ? ` · ${item.listing.building.name}` : ""}</p>
                  </td>
                  <td data-label="Espera"><strong>{fmtHours(item.ageHours)}</strong><p className={styles.muted} style={{ fontSize: 12 }}>Entrada {fmtDateTime(item.createdAt)}</p></td>
                  <td data-label="Canal">{SOURCE_LABELS[item.source] ?? item.source}</td>
                  <td data-label="Motivo">{item.queueReasonLabel}</td>
                  <td data-label="Ações">
                    <Link className={styles.linkAction} href={`/imobiliaria/leads/${item.id}?back=${encodeURIComponent("/empresa/fila")}`}>Atribuir na ficha</Link>
                    {canManage && me?.eligible && <ClaimLeadButton leadId={item.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <nav className={styles.pagination} aria-label="Páginas da fila">
          {page > 1 && <Link href={`/empresa/fila?page=${page - 1}${params.source ? `&source=${params.source}` : ""}`}>← Anterior</Link>}
          <span>Página {page} de {totalPages}</span>
          {page < totalPages && <Link href={`/empresa/fila?page=${page + 1}${params.source ? `&source=${params.source}` : ""}`}>Próxima →</Link>}
        </nav>
      )}
    </main>
  );
}
