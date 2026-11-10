"use client";

import { useActionState } from "react";
import { joinWithCodeAction } from "@/lib/actions/join-requests";
import { FeedbackNotice } from "@/components/feedback/FeedbackNotice";
import styles from "./page.module.css";

export function JoinCodeForm({ initialCode }: { initialCode?: string }) {
  const [state, formAction, pending] = useActionState(joinWithCodeAction, undefined);
  return <form action={formAction} className={styles.form}>
    <label htmlFor="code">Código de convite</label>
    <input id="code" name="code" placeholder="ABCD-2345" required autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={12} defaultValue={initialCode} className={styles.codeInput} />
    {state?.error && <FeedbackNotice>{state.error}</FeedbackNotice>}
    <button type="submit" className={styles.primary} disabled={pending}>{pending ? "Enviando…" : "Enviar pedido"}</button>
  </form>;
}
