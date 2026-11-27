"use client";

import { useActionState, useState } from "react";
import { registerLeadAction } from "@/lib/actions/leads";
import styles from "./LeadControls.module.css";

const SOURCES = [
  { value: "PHONE", label: "Telefone" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "WALK_IN", label: "Plantão / visita presencial" },
  { value: "REFERRAL", label: "Indicação" },
  { value: "FORM", label: "Formulário" },
  { value: "OTHER", label: "Outro canal" },
];

/**
 * Registro pela equipe de um interesse que chegou por fora do produto. O cliente precisa ter conta
 * (busca por e-mail exato ou telefone); repetir para a mesma pessoa e imóvel registra nova entrada
 * na oportunidade existente em vez de duplicar.
 */
export function RegisterLeadForm({ listings, canChooseSelf }: { listings: { id: string; name: string }[]; canChooseSelf: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(registerLeadAction, undefined);
  if (!open) return <button type="button" className={styles.submitButton} onClick={() => setOpen(true)}>Registrar contato</button>;
  return (
    <form action={formAction} className={styles.panel} aria-label="Registrar contato recebido por outro canal">
      <select name="listingId" required defaultValue="" className={styles.select} aria-label="Imóvel de interesse">
        <option value="" disabled>Imóvel de interesse…</option>
        {listings.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      <input name="contact" required className={styles.input} placeholder="E-mail ou telefone do cliente" aria-label="E-mail ou telefone do cliente" maxLength={120} />
      <select name="source" required defaultValue="PHONE" className={styles.select} aria-label="Canal de entrada">
        {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <textarea name="note" placeholder="Observação (opcional)" aria-label="Observação" className={styles.textarea} maxLength={1000} />
      <label className={styles.check}><input type="checkbox" name="contacted" /> Já falei com o cliente por esse canal (conta como 1ª resposta em telefone/WhatsApp)</label>
      {canChooseSelf && <label className={styles.check}><input type="checkbox" name="assignToMe" /> Ficar como responsável (se eu puder receber leads)</label>}
      <p className={styles.hint}>O cliente precisa ter conta no Zhivago. Sem conta, peça o cadastro antes de registrar.</p>
      <div className={styles.row}>
        <button type="submit" className={styles.submitButton} disabled={pending}>{pending ? "Registrando…" : "Registrar"}</button>
        <button type="button" className={styles.secondaryButton} onClick={() => setOpen(false)}>Fechar</button>
      </div>
      <span aria-live="polite">
        {state?.error && <span className={styles.error}>{state.error}</span>}
        {state?.ok && <span className={styles.ok}>{state.ok}</span>}
      </span>
    </form>
  );
}
