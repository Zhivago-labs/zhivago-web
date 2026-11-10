import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Clock, KeyRound, XCircle } from "lucide-react";
import { requireAuth } from "@/lib/session";
import { getMyOrganization } from "@/lib/organizations-api";
import { getMyJoinRequest } from "@/lib/join-requests-api";
import { cancelJoinRequestAction } from "@/lib/actions/join-requests";
import { JoinCodeForm } from "./JoinCodeForm";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Entrar em uma imobiliária" };

type Props = { searchParams: Promise<{ codigo?: string }> };

/** Corretor entra numa imobiliária com o código de convite; o dono aprova o pedido. */
export default async function JoinAgencyPage({ searchParams }: Props) {
  const { codigo } = await searchParams;
  const code = codigo?.slice(0, 12);
  const { token } = await requireAuth(code ? `/entrar-imobiliaria?codigo=${encodeURIComponent(code)}` : "/entrar-imobiliaria");

  const membership = await getMyOrganization(token);
  if (membership) redirect("/empresa");
  const request = await getMyJoinRequest(token);

  if (request?.status === "PENDING") {
    return <main className={styles.main}>
      <section className={styles.card}>
        <span className={styles.icon} data-tone="amber"><Clock aria-hidden="true" /></span>
        <h1>Pedido enviado</h1>
        <p>Seu pedido para entrar na equipe da <strong>{request.organization.name}</strong> está aguardando a aprovação do dono ou administrador. Avisaremos você assim que ele responder.</p>
        <div className={styles.orgBox}><Building2 aria-hidden="true" /><div><strong>{request.organization.name}</strong><span>Enviado em {new Date(request.createdAt).toLocaleDateString("pt-BR")}</span></div><span className={styles.pill}>Aguardando aprovação</span></div>
        <div className={styles.actions}>
          <Link href="/imoveis" className={styles.primary}>Explorar imóveis enquanto isso</Link>
          <form action={cancelJoinRequestAction}><button type="submit" className={styles.secondary}>Cancelar pedido</button></form>
        </div>
      </section>
    </main>;
  }

  return <main className={styles.main}>
    <section className={styles.card}>
      <span className={styles.icon}><KeyRound aria-hidden="true" /></span>
      <h1>Entrar em uma imobiliária</h1>
      <p>Digite o código de convite que a imobiliária passou para você. O dono ou administrador aprova o pedido e você passa a atender como corretor.</p>
      {request?.status === "REJECTED" && <p className={styles.rejected}><XCircle aria-hidden="true" />A {request.organization.name} não aprovou o seu último pedido. Confira com a imobiliária ou use outro código.</p>}
      <JoinCodeForm initialCode={code} />
      <p className={styles.hint}>Quer abrir a sua própria imobiliária? Fale com a gente pela <Link href="/ajuda">central de ajuda</Link>.</p>
    </section>
  </main>;
}
