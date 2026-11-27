"use client";

import { useActionState, useRef } from "react";
import { updateLeadDistributionModeAction } from "@/lib/actions/leads";
import type { LeadDistributionMode } from "@zhivago/shared";
import styles from "./LeadControls.module.css";

const EXPLAIN: Record<string, string> = {
  MANUAL: "Usar o responsável principal do empreendimento, o substituto e o responsável do imóvel, nessa ordem. Sem nenhum deles disponível, a oportunidade vai para a fila \"Sem responsável\".",
  ROUND_ROBIN: "Usar o responsável principal do empreendimento, o substituto e o responsável do imóvel, nessa ordem. Sem nenhum deles disponível, distribuir em rodízio entre quem está recebendo; sem ninguém recebendo, vai para a fila.",
};

export function LeadDistributionModeToggle({ mode }: { mode: LeadDistributionMode }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(updateLeadDistributionModeAction, undefined);

  return (
    <form ref={formRef} action={formAction} className={styles.distributionForm}>
      <label className={styles.distributionLabel}>
        Quando não houver responsável direto:
        <select
          name="mode"
          defaultValue={mode}
          className={styles.select}
          disabled={pending}
          onChange={() => formRef.current?.requestSubmit()}
        >
          <option value="MANUAL">Enviar para a fila da gestão</option>
          <option value="ROUND_ROBIN">Rodízio entre a equipe</option>
        </select>
      </label>
      <p className={styles.hint}>{EXPLAIN[mode] ?? ""}</p>
      <p className={styles.hint}>Mudar aqui vale para novas oportunidades; as atuais mantêm o responsável até uma transferência.</p>
      {state?.error && <p className={styles.error}>{state.error}</p>}
    </form>
  );
}
