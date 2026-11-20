"use client";

import { useActionState } from "react";
import { createOrganizationBuildingAction, type CreateBuildingState } from "@/lib/actions/organizations";
import styles from "./TeamSection.module.css";
import formStyles from "@/components/listings/ListingForm.module.css";

export function CreateBuildingForm() {
  const [state, formAction, pending] = useActionState<CreateBuildingState, FormData>(createOrganizationBuildingAction, undefined);

  return (
    <form action={formAction} className={styles.inlineForm}>
      <label className={styles.labeledField}>Nome do empreendimento
        <input type="text" name="name" required className={styles.inlineInput} />
      </label>
      <label className={styles.labeledField}>Endereço (opcional)
        <input type="text" name="address" className={styles.inlineInput} />
      </label>
      <button type="submit" disabled={pending} className={styles.primaryInlineButton}>
        {pending ? "Criando…" : "+ Novo empreendimento"}
      </button>
      {state && "error" in state && <p role="alert" className={formStyles.error}>{state.error}</p>}
    </form>
  );
}
