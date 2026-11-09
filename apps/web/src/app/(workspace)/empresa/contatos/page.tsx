import Link from "next/link";
import { Search, Mail, Phone, ChatBubble, Group } from "iconoir-react";
import { requireWorkspace, workspaceFetch } from "@/lib/workspace";
import type { WorkspaceContacts } from "@/lib/workspace-types";
import { avatarTone, initials, STAGE_LABELS, STAGE_TONES } from "@/components/workspace/workspace-ui";
import styles from "@/components/workspace/Workspace.module.css";
export const metadata = { title: "Contatos da imobiliária" };
export default async function Contacts({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) {
  const { token } = await requireWorkspace("/empresa/contatos");
  const params = await searchParams;
  const query = new URLSearchParams({ search: params.search?.slice(0,120) || "", page: String(Math.max(1, Math.floor(Number(params.page) || 1))) });
  const data = await workspaceFetch<WorkspaceContacts>(token, `/organizations/contacts?${query}`);
  const pageHref = (page: number) => { const next = new URLSearchParams(query); next.set("page", String(page)); return `/empresa/contatos?${next}`; };
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  return <main className={styles.page}>
    <div className={styles.header}><div><h1>Contatos</h1><p className={styles.muted}>Pessoas e suas oportunidades visíveis na imobiliária. Cada cliente aparece uma vez, mesmo com interesse em vários imóveis.</p></div></div>
    <form className={`${styles.filters} ${styles.toolbar}`}><div className={styles.searchField}><Search width={18} height={18} aria-hidden="true" /><input type="search" name="search" aria-label="Buscar por nome ou e-mail" placeholder="Buscar por nome ou e-mail" defaultValue={params.search || ""} /></div><button type="submit">Buscar</button>{params.search && <Link href="/empresa/contatos" className={styles.secondary}>Limpar</Link>}</form>
    <p className={styles.resultCount} role="status">{data.total} {data.total === 1 ? "contato encontrado" : "contatos encontrados"}</p>
    {data.items.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Contato</th><th>Canais</th><th>Oportunidades</th></tr></thead><tbody>{data.items.map(contact => <tr key={contact.id}>
      <td><div className={styles.property}><span className={styles.avatar} data-tone={avatarTone(contact.name)}>{initials(contact.name)}</span><div><strong>{contact.name}</strong><p className={styles.muted} style={{ fontSize: 12 }}>{contact.leads.length} {contact.leads.length === 1 ? "oportunidade" : "oportunidades"}</p></div></div></td>
      <td data-label="Canais"><a className={styles.channel} href={`mailto:${contact.email}`}><Mail width={16} height={16} aria-hidden="true" />{contact.email}</a>{contact.phone && <a className={styles.channel} href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}><Phone width={16} height={16} aria-hidden="true" />{contact.phone}</a>}</td>
      <td data-label="Oportunidades"><ul className={styles.chips} style={{ listStyle: "none" }}>{contact.leads.map(lead => <li key={lead.id} className={styles.chip}><Link href={`/imobiliaria/leads/${lead.id}`}>{lead.listing.name}</Link><span className={styles.badge} data-tone={STAGE_TONES[lead.status] ?? "slate"}>{STAGE_LABELS[lead.status] || lead.status}</span>{lead.conversations.map(conversation => <Link key={conversation.id} href={`/empresa/mensagens?openChat=${conversation.id}`} className={styles.linkAction} style={{ marginLeft: "auto", fontSize: 12 }}><ChatBubble width={15} height={15} aria-hidden="true" />Abrir conversa</Link>)}</li>)}</ul></td>
    </tr>)}</tbody></table></div> : <div className={styles.emptyState}><Group aria-hidden="true" /><strong>{params.search ? "Nenhum contato para esta busca" : "Nenhum contato ainda"}</strong><span>{params.search ? "Tente outro nome ou e-mail." : "Os clientes que demonstrarem interesse nos seus imóveis aparecem aqui."}</span></div>}
    {totalPages > 1 && <nav className={styles.pagination} aria-label="Páginas de contatos">{data.page > 1 && <Link href={pageHref(data.page - 1)}>← Anterior</Link>}<span>Página {data.page} de {totalPages}</span>{data.page * data.limit < data.total && <Link href={pageHref(data.page + 1)}>Próxima →</Link>}</nav>}
  </main>;
}
