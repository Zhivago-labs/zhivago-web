"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { Check, Copy, KeyRound, MessageCircle, RefreshCw, UserCheck, UserX } from "lucide-react";
import { approveJoinRequestAction, regenerateJoinCodeAction, rejectJoinRequestAction } from "@/lib/actions/join-requests";
import type { PendingJoinRequest } from "@/lib/join-requests-api";
import { FeedbackNotice } from "@/components/feedback/FeedbackNotice";
import styles from "./JoinCodeSection.module.css";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0] ?? "").join("").toUpperCase();
}

function RequestRow({ request }: { request: PendingJoinRequest }) {
  const [approveState, approve, approving] = useActionState(approveJoinRequestAction, undefined);
  const [rejectState, reject, rejecting] = useActionState(rejectJoinRequestAction, undefined);
  const error = approveState?.error ?? rejectState?.error;
  return <li className={styles.request}>
    <span className={styles.avatar}>{initials(request.user.name)}</span>
    <div className={styles.requestText}>
      <strong>{request.user.name}</strong>
      <span>{request.user.email} · pediu em {new Date(request.createdAt).toLocaleDateString("pt-BR")}</span>
      {error && <FeedbackNotice>{error}</FeedbackNotice>}
    </div>
    <div className={styles.requestActions}>
      <form action={reject}><input type="hidden" name="id" value={request.id} /><button type="submit" className={styles.reject} disabled={approving || rejecting}><UserX size={16} aria-hidden="true" />Recusar</button></form>
      <form action={approve}><input type="hidden" name="id" value={request.id} /><button type="submit" className={styles.approve} disabled={approving || rejecting}><UserCheck size={16} aria-hidden="true" />{approving ? "Aprovando…" : "Aprovar"}</button></form>
    </div>
  </li>;
}

export function JoinCodeSection({ code, requests, organizationName }: { code: string; requests: PendingJoinRequest[]; organizationName: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [regenState, regenerate, regenerating] = useActionState(regenerateJoinCodeAction, undefined);
  // Origem só existe no navegador; no servidor usa o domínio de produção (sem divergência de hidratação).
  const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => "https://zhivago.com.br");
  const link = `${origin}/entrar-imobiliaria?codigo=${encodeURIComponent(code)}`;
  const whatsappText = `Olá! Para entrar na equipe da ${organizationName} no Zhivago, acesse ${link} e use o código ${code}.`;

  async function copy(kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(kind === "code" ? code : link);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* navegador sem permissão de área de transferência: o código continua visível */ }
  }

  return <section className={styles.section}>
    <div className={styles.head}>
      <span className={styles.headIcon}><KeyRound size={20} aria-hidden="true" /></span>
      <div><h2>Código de convite</h2><p>Envie para os corretores. Quem usar o código pede para entrar e só acessa a equipe depois que você aprovar.</p></div>
    </div>

    <div className={styles.codeRow}>
      <code className={styles.code} aria-label={`Código de convite ${code.split("").join(" ")}`}>{code}</code>
      <div className={styles.codeActions}>
        <button type="button" className={styles.button} onClick={() => copy("code")}>{copied === "code" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copied === "code" ? "Copiado" : "Copiar código"}</button>
        <button type="button" className={styles.button} onClick={() => copy("link")}>{copied === "link" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copied === "link" ? "Link copiado" : "Copiar link"}</button>
        <a className={`${styles.button} ${styles.whatsapp}`} href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} aria-hidden="true" />Enviar no WhatsApp</a>
        <form action={regenerate} onSubmit={(event) => { if (!confirm("Gerar um novo código? O código atual deixa de funcionar na hora. Pedidos já enviados continuam na lista.")) event.preventDefault(); }}>
          <button type="submit" className={`${styles.button} ${styles.ghost}`} disabled={regenerating}><RefreshCw size={16} aria-hidden="true" />{regenerating ? "Gerando…" : "Gerar novo código"}</button>
        </form>
      </div>
    </div>
    {regenState?.error && <FeedbackNotice>{regenState.error}</FeedbackNotice>}

    <div className={styles.requestsHead}><h3>Pedidos para entrar</h3><span className={styles.count} data-empty={requests.length === 0}>{requests.length}</span></div>
    {requests.length ? <ul className={styles.requests}>{requests.map((request) => <RequestRow key={request.id} request={request} />)}</ul>
      : <p className={styles.empty}>Nenhum pedido aguardando. Quando alguém usar o código, o pedido aparece aqui e você recebe uma notificação.</p>}
  </section>;
}
