"use client";

import { useActionState, useState } from "react";
import { assignLeadAction } from "@/lib/actions/leads";
import type { LeadAssignee } from "@zhivago/shared";
import styles from "./LeadControls.module.css";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Atribuir / transferir com confirmação. Lista quem pode receber pela MESMA regra da API (quem
 * pausou ou não tem papel elegível aparece desabilitado com o motivo). Transferência exige motivo e
 * mostra o impacto em tarefas, visitas e conversa antes de confirmar.
 */
export function TransferLeadForm({
  leadId,
  currentBrokerMemberId,
  assignees,
  impact,
}: {
  leadId: string;
  currentBrokerMemberId: string | null;
  assignees: LeadAssignee[];
  impact: { pendingTasks: number; futureVisits: number; conversations: number } | null;
}) {
  const [state, formAction, pending] = useActionState(assignLeadAction, undefined);
  const [target, setTarget] = useState("");
  const isTransfer = !!currentBrokerMemberId;
  const options = assignees.filter((a) => a.memberId !== currentBrokerMemberId);

  return (
    <form action={formAction} className={styles.panel} aria-label={isTransfer ? "Transferir oportunidade" : "Atribuir responsável"}>
      <input type="hidden" name="leadId" value={leadId} />
      <label className={styles.distributionLabel} htmlFor={`assignee-${leadId}`}>{isTransfer ? "Transferir para" : "Atribuir a"}</label>
      <select id={`assignee-${leadId}`} name="brokerMemberId" value={target} onChange={(e) => setTarget(e.target.value)} className={styles.select} required>
        <option value="" disabled>Escolha um responsável…</option>
        {options.map((a) => (
          <option key={a.memberId} value={a.memberId} disabled={!a.eligible}>
            {a.name} · {a.openLeads} em aberto{a.eligible ? "" : ` — ${a.ineligibleReason}`}
          </option>
        ))}
      </select>
      {target && (
        <>
          {isTransfer && (
            <textarea name="reason" required minLength={3} maxLength={500} placeholder="Motivo da transferência (obrigatório)" aria-label="Motivo da transferência" className={styles.textarea} />
          )}
          {isTransfer && impact && (
            <div role="note">
              <p className={styles.hint}>
                Ao confirmar, o responsável anterior perde o acesso comercial à conversa ({plural(impact.conversations, "conversa", "conversas")}) e o novo passa a ver as mensagens.
              </p>
              {(impact.pendingTasks > 0 || impact.futureVisits > 0) && (
                <label className={styles.check}>
                  <input type="checkbox" name="moveOpenWork" defaultChecked />
                  <span>Levar também {plural(impact.pendingTasks, "tarefa pendente", "tarefas pendentes")} e {plural(impact.futureVisits, "visita futura", "visitas futuras")} para o novo responsável</span>
                </label>
              )}
            </div>
          )}
          <div className={styles.row}>
            <button type="submit" className={styles.submitButton} disabled={pending}>{pending ? "Salvando…" : isTransfer ? "Confirmar transferência" : "Confirmar atribuição"}</button>
            <button type="button" className={styles.secondaryButton} onClick={() => setTarget("")}>Cancelar</button>
          </div>
        </>
      )}
      {!options.some((a) => a.eligible) && <p className={styles.hint}>Ninguém pode receber agora: reative o recebimento de alguém em Equipe.</p>}
      <span aria-live="polite">
        {state?.error && <span className={styles.error}>{state.error}</span>}
        {state?.ok && <span className={styles.ok}>{state.ok}</span>}
      </span>
    </form>
  );
}
