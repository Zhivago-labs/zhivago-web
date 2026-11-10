import { FileClock } from "lucide-react";
import type { OrganizationAuditLogEntry } from "@zhivago/shared";
import styles from "./TeamSection.module.css";

const ACTION_LABELS: Record<string, string> = {
  BUILDING_LEAD_OWNER_CHANGED: "Lead Owner do empreendimento alterado",
  BUILDING_BACKUP_CHANGED: "Backup do empreendimento alterado",
  LISTING_ORG_APPROVED: "Anúncio aprovado",
  LISTING_ORG_REJECTED: "Anúncio rejeitado",
};

/** Log de auditoria da organização (seção 125 da spec) — só OWNER/ADMIN veem esta seção. */
export function AuditLogSection({ entries }: { entries: OrganizationAuditLogEntry[] }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}><FileClock size={18} aria-hidden="true" /></span>
        <div className={styles.sectionText}>
          <h2 className={styles.sectionTitle}>Auditoria</h2>
          <p className={styles.sectionSubtitle}>
            Mudanças de responsável por empreendimento e moderação de anúncios — quem, quando e por quê.
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className={styles.emptyStateBox}>
          <FileClock size={22} aria-hidden="true" />
          <p className={styles.empty}>Nenhum registro de auditoria ainda.</p>
        </div>
      ) : (
        <ol className={styles.auditList}>
          {entries.map((entry) => (
            <li key={entry.id} className={styles.auditItem} data-action={entry.action}>
              <strong>{ACTION_LABELS[entry.action] ?? entry.action}</strong>
              <span>{entry.actor.user?.name ?? "—"} · {new Date(entry.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
              {entry.reason && <span className={styles.auditReason}>Motivo: {entry.reason}</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
