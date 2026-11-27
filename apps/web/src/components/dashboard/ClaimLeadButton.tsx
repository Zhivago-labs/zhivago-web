"use client";

import { useActionState } from "react";
import { claimLeadAction } from "@/lib/actions/leads";
import styles from "./LeadControls.module.css";

export function ClaimLeadButton({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState(claimLeadAction, undefined);
  return (
    <form action={formAction} className={styles.assignForm}>
      <input type="hidden" name="leadId" value={leadId} />
      <button type="submit" className={styles.secondaryButton} disabled={pending}>{pending ? "Assumindo…" : "Assumir"}</button>
      {state?.error && <span className={styles.error}>{state.error}</span>}
    </form>
  );
}
