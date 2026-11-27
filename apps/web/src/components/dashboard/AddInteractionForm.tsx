"use client";

import { useActionState, useState } from "react";
import { addInteractionAction } from "@/lib/actions/leads";
import styles from "./LeadControls.module.css";

const TYPE_OPTIONS = [
  { value: "PHONE_CALL", label: "Ligação" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "E-mail" },
  { value: "VISIT", label: "Visita" },
  { value: "NOTE", label: "Nota interna" },
];

export function AddInteractionForm({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState(addInteractionAction, undefined);
  const [type, setType] = useState("PHONE_CALL");

  return (
    <form action={formAction} className={styles.distributionForm}>
      <input type="hidden" name="leadId" value={leadId} />
      <select name="type" value={type} onChange={(e) => setType(e.target.value)} className={styles.select} aria-label="Tipo de contato" required>
        {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {type !== "NOTE" ? (
        <label className={styles.check}><input type="checkbox" name="attempt" /> Tentativa sem sucesso (não falou com o cliente)</label>
      ) : (
        <p className={styles.hint}>Nota interna não conta como resposta ao cliente.</p>
      )}
      <textarea name="content" placeholder="O que foi conversado? (opcional)" aria-label="Descrição do contato" className={styles.textarea} maxLength={2000} />
      <button type="submit" disabled={pending} className={styles.submitButton}>{pending ? "Registrando…" : "Registrar"}</button>
      <span aria-live="polite">{state?.error && <span className={styles.error}>{state.error}</span>}</span>
    </form>
  );
}
