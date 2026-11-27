"use client";

import { useActionState, useState } from "react";
import { reopenLeadAction } from "@/lib/actions/leads";
import styles from "./LeadControls.module.css";

export function ReopenLeadForm({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(reopenLeadAction, undefined);
  if (!open) return <button type="button" className={styles.secondaryButton} onClick={() => setOpen(true)}>Reabrir oportunidade</button>;
  return (
    <form action={formAction} className={styles.panel} aria-label="Reabrir oportunidade">
      <input type="hidden" name="leadId" value={leadId} />
      <label className={styles.distributionLabel}>Retomar na etapa
        <select name="status" defaultValue="CONTACTED" className={styles.select}>
          <option value="NEW">Novo</option>
          <option value="CONTACTED">Contatado</option>
          <option value="QUALIFIED">Qualificado</option>
          <option value="NEGOTIATION">Negociação</option>
        </select>
      </label>
      <textarea name="note" placeholder="Por que está reabrindo? (opcional)" className={styles.textarea} maxLength={500} />
      <p className={styles.hint}>O desfecho anterior fica no histórico. Se o responsável não estiver mais disponível, a oportunidade segue a distribuição ou vai para a fila.</p>
      <div className={styles.row}>
        <button type="submit" className={styles.submitButton} disabled={pending}>{pending ? "Reabrindo…" : "Reabrir"}</button>
        <button type="button" className={styles.secondaryButton} onClick={() => setOpen(false)}>Cancelar</button>
      </div>
      {state?.error && <p className={styles.error}>{state.error}</p>}
    </form>
  );
}
