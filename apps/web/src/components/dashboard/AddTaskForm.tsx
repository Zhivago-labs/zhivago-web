"use client";

import { useActionState, useEffect, useRef } from "react";
import { addTaskAction } from "@/lib/actions/leads";
import styles from "./LeadControls.module.css";

/** `onSuccess`: quem embute o formulário (prévia de Contatos) recarrega os dados afetados. */
export function AddTaskForm({ leadId, members = [], onSuccess }: { leadId: string; members?: { memberId: string; name: string }[]; onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(addTaskAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => { onSuccessRef.current = onSuccess; });
  useEffect(() => {
    if (!state?.ok) return;
    formRef.current?.reset();
    onSuccessRef.current?.();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className={styles.distributionForm}>
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
      <span aria-live="polite">
        {state?.error && <span className={styles.error}>{state.error}</span>}
        {state?.ok && <span className={styles.ok}>Tarefa criada.</span>}
      </span>
    </form>
  );
}
