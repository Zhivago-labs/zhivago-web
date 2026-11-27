"use client";

import { useActionState, useRef, useState } from "react";
import { updateLeadStatusAction } from "@/lib/actions/leads";
import type { LeadStatus } from "@zhivago/shared";
import styles from "./LeadControls.module.css";

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "NEW", label: "Novo" },
  { value: "CONTACTED", label: "Contatado" },
  { value: "QUALIFIED", label: "Qualificado" },
  { value: "VISIT_SCHEDULED", label: "Visita agendada" },
  { value: "PROPOSAL", label: "Proposta" },
  { value: "NEGOTIATION", label: "Negociação" },
  { value: "WON", label: "Ganho" },
  { value: "LOST", label: "Perdido" },
];

const LOST_REASON_OPTIONS = [
  { value: "PRICE", label: "Preço ou condições" },
  { value: "FOUND_OTHER", label: "Escolheu outro imóvel" },
  { value: "LOCATION", label: "Localização" },
  { value: "FINANCING", label: "Crédito ou financiamento" },
  { value: "UNAVAILABLE", label: "Imóvel ou datas indisponíveis" },
  { value: "NO_RESPONSE", label: "Cliente parou de responder" },
  { value: "GAVE_UP", label: "Desistiu da busca" },
  { value: "DUPLICATE", label: "Contato duplicado ou inválido" },
  { value: "OTHER", label: "Outro motivo" },
];

/**
 * Seletor de etapa. Etapas abertas salvam ao escolher (enviando a etapa esperada, para detectar
 * edição concorrente). "Perdido" abre o formulário de motivo antes de salvar. Oportunidade
 * encerrada não volta por aqui — a ficha oferece "Reabrir oportunidade".
 */
export function LeadStatusSelect({ leadId, currentStatus, label = "Etapa da oportunidade" }: { leadId: string; currentStatus: LeadStatus; label?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(updateLeadStatusAction, undefined);
  const [choice, setChoice] = useState<string>(currentStatus);
  const closed = currentStatus === "WON" || currentStatus === "LOST";

  if (closed) {
    return <span className={styles.hint}>{currentStatus === "WON" ? "Ganho" : "Perdido"} · encerrada</span>;
  }

  return (
    <form ref={formRef} action={formAction} className={styles.assignForm}>
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="expectedStatus" value={currentStatus} />
      <select
        name="status"
        aria-label={label}
        value={choice}
        className={styles.select}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          setChoice(next);
          if (next !== "LOST") queueMicrotask(() => formRef.current?.requestSubmit());
        }}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {choice === "LOST" && (
        <div className={styles.panel} role="group" aria-label="Encerrar como perdido">
          <select name="lostReason" required defaultValue="" className={styles.select} aria-label="Motivo da perda">
            <option value="" disabled>Motivo da perda…</option>
            {LOST_REASON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <textarea name="lostNote" placeholder="Observação (opcional)" className={styles.textarea} maxLength={1000} />
          <div className={styles.row}>
            <button type="submit" className={styles.submitButton} disabled={pending}>{pending ? "Salvando…" : "Encerrar como perdido"}</button>
            <button type="button" className={styles.secondaryButton} onClick={() => setChoice(currentStatus)}>Cancelar</button>
          </div>
        </div>
      )}
      <span aria-live="polite">
        {pending && <span className={styles.hint}>Salvando…</span>}
        {state?.error && <span className={styles.error}>{state.error}</span>}
      </span>
    </form>
  );
}
