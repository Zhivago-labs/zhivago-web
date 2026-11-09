import Link from "next/link";
import { ChatBubble, NavArrowRight } from "iconoir-react";
import { requireWorkspace, workspaceFetch } from "@/lib/workspace";
import type { WorkspaceMessage } from "@/lib/workspace-types";
import { avatarTone, initials } from "@/components/workspace/workspace-ui";
import styles from "@/components/workspace/Workspace.module.css";
export const metadata = { title: "Mensagens da imobiliária" };
export default async function Messages() {
  const { token } = await requireWorkspace("/empresa/mensagens");
  const items = await workspaceFetch<WorkspaceMessage[]>(token, "/organizations/messages");
  const open = items.filter((item) => !item.isClosed).length;
  return <main className={styles.page}>
    <div className={styles.header}>
      <div><h1>Mensagens</h1><p className={styles.muted}>Conversas corporativas das quais você participa, vinculadas às oportunidades autorizadas. As mensagens abrem no chat.</p></div>
      <Link href="/empresa/mensagens?openChat=true" className={`${styles.btn} ${styles.btnPrimary}`}><ChatBubble width={18} height={18} aria-hidden="true" />Abrir central de mensagens</Link>
    </div>
    <section className={styles.panel}>
      <div className={styles.panelHead}><div><span className={styles.metricIcon} data-tone="blue"><ChatBubble width={18} height={18} aria-hidden="true" /></span><div><h2>Conversas recentes</h2><p>Até 100 conversas. O histórico completo está na central.</p></div></div>{items.length > 0 && <span className={styles.count} data-tone="green">{open} em atendimento</span>}</div>
      {items.length ? <ul className={styles.rows}>{items.map(item => {
        const name = item.lead?.user.name || "Atendimento";
        return <li key={item.id}><Link href={`/empresa/mensagens?openChat=${item.id}`} className={styles.row}>
          <span className={styles.avatar} data-tone={avatarTone(name)}>{initials(name)}</span>
          <span className={styles.rowText}><strong>{name} · <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: 13 }}>{item.property.name}</span></strong><span>{item.messages[0]?.content || "Conversa iniciada"}</span></span>
          <span className={styles.badge} data-tone={item.isClosed ? "slate" : "green"}>{item.isClosed ? "Encerrada" : "Em atendimento"}</span>
          <NavArrowRight width={18} height={18} aria-hidden="true" />
        </Link></li>;
      })}</ul> : <div className={styles.emptyState} style={{ border: 0 }}><ChatBubble aria-hidden="true" /><strong>Nenhuma conversa ainda</strong><span>Você ainda não participa de conversas corporativas.</span></div>}
    </section>
  </main>;
}
