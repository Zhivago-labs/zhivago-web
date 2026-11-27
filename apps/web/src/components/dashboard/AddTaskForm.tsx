"use client";

import { useActionState } from "react";
import { addTaskAction } from "@/lib/actions/leads";
import styles from "./LeadControls.module.css";

export function AddTaskForm({ leadId, members = [] }: { leadId: string; members?: { memberId: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(addTaskAction, undefined);

  return (
    <form action={formAction} className={styles.distributionForm}>
      <input type="hidden" name="leadId" value={leadId} />
      <input type="text" name="title" placeholder="Ex: Ligar para confirmar visita" className={styles.input} required maxLength={200} aria-label="Título da tarefa" />
      <label className={styles.hint}>Prazo (horário de Brasília)
        <input type="datetime-local" name="dueAt" className={styles.input} />
      </label>
      {members.length > 0 && (
        <select name="assigneeId" defaultValue="" className={styles.select} aria-label="Quem executa a tarefa">
          <option value="">Eu mesmo</option>
          {members.map((m) => <option key={m.memberId} value={m.memberId}>{m.name}</option>)}
        </select>
      )}
      <button type="submit" disabled={pending} className={styles.submitButton}>{pending ? "Adicionando…" : "Adicionar tarefa"}</button>
      {state?.error && <p className={styles.error}>{state.error}</p>}
    </form>
  );
}
