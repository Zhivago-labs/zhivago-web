"use client";

import { useActionState } from "react";
import { UserPlus, Mail } from "lucide-react";
import { inviteMemberAction } from "@/lib/actions/organizations";
import styles from "./TeamSection.module.css";
import formStyles from "@/components/listings/ListingForm.module.css";

export function InviteMemberForm() {
  const [state, formAction, pending] = useActionState(inviteMemberAction, undefined);

  return (
    <div className={styles.addMemberBox}>
      <div className={styles.addMemberHeader}>
        <UserPlus size={18} className={styles.addMemberIcon} />
        <div>
          <h4 className={styles.addMemberTitle}>Convidar por e-mail</h4>
          <p className={styles.addMemberSubtitle}>
            Para gerentes e administradores, ou se preferir não usar o código. A pessoa entra só depois de aceitar.
          </p>
        </div>
      </div>

      <form action={formAction}>
        {state?.error && <p role="alert" id="invite-error" className={formStyles.error}>{state.error}</p>}
        <div className={styles.inlineForm}>
          <label className={styles.labeledField}>E-mail do convidado
            <span className={styles.inputWrapper}>
              <Mail size={16} className={styles.inputIcon} aria-hidden="true" />
              <input name="email" type="email" placeholder="nome@exemplo.com" required
                aria-describedby={state?.error ? "invite-error" : undefined} className={styles.inlineInputWithIcon} />
            </span>
          </label>
          <label className={styles.labeledField}>Função na imobiliária
            <select name="role" defaultValue="BROKER" className={styles.inlineInput} required>
              <option value="BROKER">Corretor</option>
              <option value="MANAGER">Gerente</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>
          <button type="submit" disabled={pending} className={styles.primaryInlineButton}>
            {pending ? "Enviando…" : "Enviar Convite"}
          </button>
        </div>
      </form>
    </div>
  );
}
