"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { registerLeadAction } from "@/lib/actions/leads";
import { Plus, Xmark } from "@/components/icons";
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
 * "Registrar interesse": a equipe registra um interesse que chegou por fora do produto. Fluxo
 * inalterado da API (`POST /leads`): o cliente PRECISA já ter conta (busca por e-mail exato ou
 * telefone) e o interesse é sempre num imóvel da imobiliária; repetir para a mesma pessoa e imóvel
 * registra nova entrada na oportunidade existente em vez de duplicar. Abre em diálogo modal.
 */
export function RegisterLeadForm({ listings, canChooseSelf, buttonClassName }: { listings: { id: string; name: string }[]; canChooseSelf: boolean; buttonClassName?: string }) {
  const [state, formAction, pending] = useActionState(registerLeadAction, undefined);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  useEffect(() => { if (state?.ok) formRef.current?.reset(); }, [state]);

  return (
    <>
      <button type="button" className={buttonClassName ?? styles.submitButton} onClick={() => dialogRef.current?.showModal()}>
        <Plus width={18} height={18} aria-hidden="true" />Registrar interesse
      </button>
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
        <form ref={formRef} action={formAction} className={styles.dialogForm}>
          <div className={styles.dialogHead}>
            <h2 id={titleId}>Registrar interesse</h2>
            <button type="button" className={styles.iconButton} onClick={() => dialogRef.current?.close()} aria-label="Fechar"><Xmark width={18} height={18} aria-hidden="true" /></button>
          </div>
          <p className={styles.hint}>
            Para interesses que chegaram por telefone, WhatsApp, plantão ou indicação. <strong>Requisitos:</strong> o cliente
            já precisa ter conta no Zhivago (informe o e-mail ou telefone dessa conta) e o interesse fica ligado a um imóvel
            da imobiliária. Sem conta, peça o cadastro antes.
          </p>
          <label className={styles.field}>Imóvel de interesse (obrigatório)
            <select name="listingId" required defaultValue="" className={styles.select}>
              <option value="" disabled>Escolha o imóvel…</option>
              {listings.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label className={styles.field}>E-mail ou telefone da conta do cliente (obrigatório)
            <input name="contact" required className={styles.input} placeholder="ana@email.com ou (31) 99999-0000" maxLength={120} autoComplete="off" />
          </label>
          <label className={styles.field}>Canal de entrada
            <select name="source" required defaultValue="PHONE" className={styles.select}>
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className={styles.field}>Observação (opcional)
            <textarea name="note" className={styles.textarea} maxLength={1000} />
          </label>
          <label className={styles.check}><input type="checkbox" name="contacted" /> Já falei com o cliente por esse canal (conta como 1ª resposta em telefone/WhatsApp)</label>
          {canChooseSelf && <label className={styles.check}><input type="checkbox" name="assignToMe" /> Ficar como responsável (se eu puder receber leads)</label>}
          {listings.length === 0 && <p className={styles.error}>Nenhum imóvel disponível para registrar interesse.</p>}
          <span aria-live="polite">
            {state?.error && <span className={styles.error}>{state.error}</span>}
            {state?.ok && <span className={styles.ok}>{state.ok}</span>}
          </span>
          <div className={styles.row}>
            <button type="submit" className={styles.submitButton} disabled={pending || listings.length === 0}>{pending ? "Registrando…" : "Registrar"}</button>
            <button type="button" className={styles.secondaryButton} onClick={() => dialogRef.current?.close()}>{state?.ok ? "Fechar" : "Cancelar"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
