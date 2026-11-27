import Link from "next/link";
import { Mail, Phone, ChatBubble, ArrowLeft } from "iconoir-react";
import { requireWorkspace } from "@/lib/workspace";
import { getApiUrl } from "@/lib/api";
import { safeRedirectTarget } from "@/lib/safe-redirect";
import type { WorkspaceContactDetail } from "@/lib/workspace-types";
import { SOURCE_LABELS, LOST_REASON_LABELS, OPERATION_LABELS } from "@/lib/leads-api";
import { avatarTone, initials, STAGE_LABELS, STAGE_TONES, fmtDate, fmtDateTime, fmtAge } from "@/components/workspace/workspace-ui";
import { SlaBadge } from "@/components/dashboard/SlaBadge";
import styles from "@/components/workspace/Workspace.module.css";

export const metadata = { title: "Ficha do contato" };

const ENTRY_LABELS: Record<string, string> = { ENTRY: "Entrada", REENTRY: "Reentrada", INTENT: "Clique em canal externo" };

export default async function ContactDetail({ params, searchParams }: { params: Promise<{ userId: string }>; searchParams: Promise<{ back?: string }> }) {
  const { userId } = await params;
  const { back: backParam } = await searchParams;
  const { token } = await requireWorkspace(`/empresa/contatos/${userId}`);
  const back = safeRedirectTarget(backParam, "/empresa/contatos");
  const here = `/empresa/contatos/${userId}?back=${encodeURIComponent(back)}`;

  const res = await fetch(`${getApiUrl()}/organizations/contacts/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (res.status === 404 || res.status === 403) {
    return <main className={styles.page}><Link href={back} className={styles.linkAction}><ArrowLeft width={16} height={16} aria-hidden="true" />Voltar aos contatos</Link><div className={styles.emptyState}><strong>Contato não encontrado</strong><span>Esta pessoa não tem oportunidades visíveis para você.</span></div></main>;
  }
  if (!res.ok) {
    return <main className={styles.page}><div className={styles.emptyState} role="alert"><strong>Não foi possível carregar a ficha</strong><Link href={here} className={styles.secondary}>Tentar novamente</Link></div></main>;
  }
  const data: WorkspaceContactDetail = await res.json();
  const { contact } = data;

  return (
    <main className={styles.page}>
      <Link href={back} className={styles.linkAction}><ArrowLeft width={16} height={16} aria-hidden="true" />Voltar aos contatos</Link>
      <div className={styles.header}>
        <div className={styles.property}>
          <span className={styles.avatar} data-tone={avatarTone(contact.name)}>{initials(contact.name)}</span>
          <div>
            <h1>{contact.name}</h1>
            <p className={styles.muted}>{data.opportunities.length} {data.opportunities.length === 1 ? "oportunidade" : "oportunidades"} · última atividade {fmtAge(data.lastActivityAt)}</p>
          </div>
        </div>
        <div>
          <a className={styles.channel} href={`mailto:${contact.email}`}><Mail width={16} height={16} aria-hidden="true" />{contact.email}</a>
          {contact.phone
            ? <a className={styles.channel} href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}><Phone width={16} height={16} aria-hidden="true" />{contact.phone}</a>
            : <span className={styles.channel} style={{ color: "var(--muted)" }}><Phone width={16} height={16} aria-hidden="true" />Sem telefone</span>}
        </div>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}><h2>Oportunidades</h2></div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Imóvel</th><th>Etapa e desfecho</th><th>Responsável</th><th>Origem · entrada</th><th>Próxima ação</th><th>Ações</th></tr></thead>
            <tbody>
              {data.opportunities.map((opp) => (
                <tr key={opp.id}>
                  <td><strong>{opp.listing.name}</strong><p className={styles.muted} style={{ fontSize: 12 }}>{OPERATION_LABELS[opp.listing.operationType] ?? opp.listing.operationType}{opp.listing.building ? ` · ${opp.listing.building.name}` : ""}</p></td>
                  <td data-label="Etapa">
                    <span className={styles.badge} data-tone={STAGE_TONES[opp.status] ?? "slate"}>{STAGE_LABELS[opp.status] ?? opp.status}</span>
                    {opp.status === "LOST" && <p className={styles.muted} style={{ fontSize: 12 }}>{opp.lostReason ? LOST_REASON_LABELS[opp.lostReason] ?? opp.lostReason : "Motivo não registrado"}{opp.closedAt ? ` · ${fmtDate(opp.closedAt)}` : ""}</p>}
                    {opp.status === "WON" && opp.closedAt && <p className={styles.muted} style={{ fontSize: 12 }}>Ganho em {fmtDate(opp.closedAt)}</p>}
                    <div><SlaBadge status={opp.slaStatus} /></div>
                  </td>
                  <td data-label="Responsável">{opp.broker?.name ?? <em>Sem responsável</em>}</td>
                  <td data-label="Origem">{SOURCE_LABELS[opp.source] ?? opp.source}<p className={styles.muted} style={{ fontSize: 12 }}>{fmtDate(opp.createdAt)} · ativ. {fmtAge(opp.lastActivityAt)}</p></td>
                  <td data-label="Próxima ação">{opp.nextAction ? <>{opp.nextAction.title}<p className={styles.muted} style={{ fontSize: 12 }}>{opp.nextAction.at ? fmtDateTime(opp.nextAction.at) : "Sem prazo"}</p></> : "—"}</td>
                  <td data-label="Ações">
                    <Link className={styles.linkAction} href={`/imobiliaria/leads/${opp.id}?back=${encodeURIComponent(here)}`}>Abrir oportunidade</Link>
                    {opp.conversationId && <><br /><Link className={styles.linkAction} href={`/empresa/mensagens?openChat=${opp.conversationId}`}><ChatBubble width={15} height={15} aria-hidden="true" />Abrir conversa</Link></>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {data.entries.length > 0 && (
        <section className={styles.panel}>
          <div className={styles.panelHead}><h2>Entradas recentes</h2></div>
          <ul className={styles.rows}>
            {data.entries.map((entry) => {
              const opp = data.opportunities.find((o) => o.id === entry.leadId);
              return (
                <li key={entry.id} className={styles.row}>
                  <span className={styles.rowText}>
                    <strong>{ENTRY_LABELS[entry.kind] ?? entry.kind} · {SOURCE_LABELS[entry.source] ?? entry.source}</strong>
                    <span>{opp?.listing.name ?? ""} · {fmtDateTime(entry.createdAt)}{entry.note ? ` · ${entry.note}` : ""}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
