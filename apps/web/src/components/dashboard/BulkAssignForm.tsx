"use client";

import { useActionState } from "react";
import { bulkAssignAction } from "@/lib/actions/leads";
import type { LeadAssignee } from "@zhivago/shared";
import styles from "./LeadControls.module.css";

/**
 * Barra de atribuição em lote da fila. As caixas de seleção ficam nas linhas da tabela e se ligam a
 * este formulário pelo atributo `form` (id abaixo). Limite de 50 por vez, igual à API.
 */
export const BULK_FORM_ID = "bulk-assign-form";

export function BulkAssignForm({ assignees }: { assignees: LeadAssignee[] }) {
  const [state, formAction, pending] = useActionState(bulkAssignAction, undefined);
  return (
    <form id={BULK_FORM_ID} action={formAction} className={styles.row} aria-label="Atribuir selecionadas">
      <select name="brokerMemberId" defaultValue="" className={styles.select} aria-label="Responsável para as selecionadas" required>
        <option value="" disabled>Atribuir selecionadas a…</option>
        {assignees.map((a) => (
          <option key={a.memberId} value={a.memberId} disabled={!a.eligible}>
            {a.name} · {a.openLeads} em aberto{a.eligible ? "" : ` — ${a.ineligibleReason}`}
          </option>
        ))}
      </select>
      <label className={styles.check}><input type="checkbox" name="confirm" required /> Confirmo a atribuição</label>
      <button type="submit" className={styles.submitButton} disabled={pending}>{pending ? "Atribuindo…" : "Atribuir"}</button>
      <span aria-live="polite">
        {state?.error && <span className={styles.error}>{state.error}</span>}
        {state?.ok && <span className={styles.ok}>{state.ok}</span>}
      </span>
    </form>
  );
}
