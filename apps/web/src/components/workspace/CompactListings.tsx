"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MoreHoriz, EditPencil, Search, Building } from "iconoir-react";
import type { OwnedListing } from "@/lib/listings-api";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmitButton } from "@/components/dashboard/ConfirmSubmitButton";
import { DiscountModal } from "@/components/dashboard/DiscountModal";
import { RejectListingButton } from "@/components/admin/RejectListingButton";
import { deleteListingAction, publishListingAction, unpublishListingAction, duplicateListingAction, approveOrgListingAction, relistListingAction, rejectOrgListingAction } from "@/lib/actions/listings";
import { avatarTone, initials, LISTING_STATUS_TONES } from "./workspace-ui";
import styles from "./Workspace.module.css";
const statusLabels: Record<string, string> = { DRAFT: "Rascunho", PENDING: "Em análise", APPROVED: "Publicado", REJECTED: "Rejeitado", SOLD: "Vendido", RENTED: "Alugado" };
const operations: Record<string, string> = { SALE: "Venda", MONTHLY_RENT: "Aluguel", DAILY_RENT: "Temporada" };
export function CompactListings({ listings, role, userId, initialStatus = "" }: { listings: OwnedListing[]; role: string; userId: string; initialStatus?: string }) {
  const [query, setQuery] = useState("");
  const [operation, setOperation] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [agent, setAgent] = useState("");
  const [discount, setDiscount] = useState<OwnedListing | null>(null);
  const admin = ["OWNER", "ADMIN"].includes(role);
  const filtered = listings.filter(item => (!query || `${item.name} ${item.location}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))) && (!operation || item.operationType === operation) && (!status || item.status === status) && (!agent || item.agentId === agent));
  const agents = new Map(listings.filter(item => item.agent).map(item => [item.agent!.id, item.agent!.name]));
  return <>
    <div className={`${styles.filters} ${styles.toolbar}`}><div className={styles.searchField}><Search width={18} height={18} aria-hidden="true" /><input type="search" aria-label="Buscar imóvel" placeholder="Buscar por nome ou localização" value={query} onChange={event => setQuery(event.target.value)} /></div><select aria-label="Modalidade" value={operation} onChange={event => setOperation(event.target.value)}><option value="">Todas as modalidades</option>{Object.entries(operations).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select><select aria-label="Status" value={status} onChange={event => setStatus(event.target.value)}><option value="">Todos os status</option>{Object.entries(statusLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select><select aria-label="Responsável pelo imóvel" value={agent} onChange={event => setAgent(event.target.value)}><option value="">Todos os responsáveis</option>{[...agents].map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></div>
    <p className={styles.resultCount} role="status">{filtered.length} {filtered.length === 1 ? "imóvel encontrado" : "imóveis encontrados"}</p>
    {filtered.length ? <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Imóvel</th><th>Modalidade / preço</th><th>Status</th><th>Responsável</th><th>Visualizações</th><th>Contatos</th><th>Ações</th></tr></thead><tbody>{filtered.map(item => {
      const canEdit = admin || (role === "BROKER" && item.agentId === userId);
      const currency = item.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
      const suffix = item.operationType === "DAILY_RENT" ? " / noite" : item.operationType === "MONTHLY_RENT" ? " / mês" : "";
      return <tr key={item.id}><td><div className={styles.property}>{item.images[0] ? <Image unoptimized src={item.images[0].url} alt="" width={64} height={48} loading="lazy" /> : <span className={styles.thumb}><Building width={24} height={24} aria-hidden="true" /></span>}<div><strong>{item.name}</strong><p className={styles.muted} style={{ fontSize: 12 }}>{item.location}</p></div></div></td><td data-label="Modalidade"><span className={styles.priceType}>{operations[item.operationType || ""] || (item.category === "venda" ? "Venda" : "Aluguel")}</span><span className={styles.price}>{currency}{suffix}</span></td><td data-label="Status"><span className={styles.badge} data-tone={LISTING_STATUS_TONES[item.status] ?? "slate"}>{statusLabels[item.status] || item.status}</span></td><td data-label="Responsável">{item.agent ? <span className={styles.channel}><span className={styles.avatar} data-tone={avatarTone(item.agent.name)} style={{ width: 26, height: 26, fontSize: 10 }}>{initials(item.agent.name)}</span>{item.agent.name}</span> : <span className={styles.muted}>Não atribuído</span>}</td><td data-label="Visualizações"><span className={styles.num}>{item.viewCount}</span></td><td data-label="Contatos"><span className={styles.num}>{item._count.leads ?? 0}</span></td><td><div className={styles.actions}>
        {canEdit ? <Link href={`/anuncios/${item.id}/editar`} className={`${styles.btn} ${styles.btnSmall}`}><EditPencil width={16} height={16} aria-hidden="true" /> Editar</Link> : item.status === "APPROVED" ? <Link href={`/imovel/${item.id}`} className={`${styles.btn} ${styles.btnSmall}`}>Visualizar</Link> : <span className={styles.muted}>Somente leitura</span>}
        {canEdit && <details className={styles.context}><summary aria-label={`Mais ações para ${item.name}`}><MoreHoriz width={20} height={20} /></summary><div>
          <ActionForm action={duplicateListingAction}><input type="hidden" name="id" value={item.id} /><button type="submit">Duplicar</button></ActionForm>
          <button type="button" onClick={() => setDiscount(item)}>Aplicar desconto</button>
          {item.status === "DRAFT" && <ActionForm action={publishListingAction}><input type="hidden" name="id" value={item.id} /><button type="submit">Enviar para publicação</button></ActionForm>}
          {item.status === "APPROVED" && <ActionForm action={unpublishListingAction}><input type="hidden" name="id" value={item.id} /><ConfirmSubmitButton confirmMessage={`Despublicar ${item.name}?`}>Despublicar</ConfirmSubmitButton></ActionForm>}
          {item.status === "RENTED" && <ActionForm action={relistListingAction}><input type="hidden" name="id" value={item.id} /><button type="submit">Disponibilizar novamente</button></ActionForm>}
          {admin && item.status === "PENDING" && <><ActionForm action={approveOrgListingAction}><input type="hidden" name="id" value={item.id} /><button type="submit">Aprovar anúncio</button></ActionForm><ActionForm action={rejectOrgListingAction}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="reason" /><RejectListingButton listingName={item.name} className={styles.danger} /></ActionForm></>}
          {admin && <><Link href="/equipe">Redistribuir responsável</Link><ActionForm action={deleteListingAction}><input type="hidden" name="id" value={item.id} /><ConfirmSubmitButton className={styles.danger} confirmMessage={`Excluir ${item.name}? Esta ação não pode ser desfeita.`}>Excluir anúncio</ConfirmSubmitButton></ActionForm></>}
        </div></details>}
      </div></td></tr>;
    })}</tbody></table></div> : <div className={styles.emptyState}><Building aria-hidden="true" /><strong>{listings.length ? "Nenhum imóvel para os filtros selecionados" : "Nenhum imóvel neste escopo"}</strong><span>{listings.length ? "Ajuste a busca ou os filtros acima." : "Os anúncios da imobiliária aparecem aqui assim que forem criados."}</span></div>}
    {discount && <DiscountModal listing={discount} onClose={() => setDiscount(null)} />}
  </>;
}
