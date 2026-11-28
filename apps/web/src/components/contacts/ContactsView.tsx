"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { ChatBubble, ExternalLink, Filter, Group, Kanban, RefreshCw, Search, SlidersHorizontal, Xmark, UserXmark } from "@/components/icons";
import type { ContactOpportunity, ContactPerson, WorkspaceContacts } from "@/lib/workspace-types";
import { LOST_REASON_LABELS, OPERATION_LABELS, SOURCE_LABELS } from "@/lib/leads-api";
import { avatarTone, initials, STAGE_LABELS, STAGE_TONES, fmtAge, fmtDate, fmtDateTime } from "@/components/workspace/workspace-ui";
import { SlaBadge } from "@/components/dashboard/SlaBadge";
import { RegisterLeadForm } from "@/components/dashboard/RegisterLeadForm";
import { useChatSocket } from "@/components/chat/ChatSocketProvider";
import { ContactPreview, CopyValue } from "./ContactPreview";
import {
  activeView, ADVANCED_KEYS, clearFiltersHref, columnsFor, columnsStorageKey, defaultColumns, hasFilters, kanbanHref, listOnly,
  sanitizeColumns, switchTableHref, viewHref, viewsFor, withChanges, type TableKind,
} from "./contacts-state";
import styles from "./Contacts.module.css";

type Option = { id: string; name: string };
type Props = {
  data: WorkspaceContacts | null;
  kind: TableKind;
  userId: string;
  organizationId: string;
  isManager: boolean;
  broad: boolean;
  canRegister: boolean;
  assignees: { memberId: string; name: string }[];
  taskMembers: { memberId: string; name: string }[];
  buildings: Option[];
  listings: Option[];
};

const SORTS: { value: string; label: string; opportunitiesOnly?: boolean }[] = [
  { value: "activity", label: "Última atividade" },
  { value: "name", label: "Nome" },
  { value: "created", label: "Data de entrada" },
  { value: "nextAction", label: "Próxima ação", opportunitiesOnly: true },
  { value: "waiting", label: "Espera pela 1ª resposta", opportunitiesOnly: true },
];
const STAGE_FILTER_LABELS: Record<string, string> = { NEW: "Novas", OPEN: "Em andamento", ACTIVE: "Abertas", CLOSED: "Encerradas", WON: "Ganhas", LOST: "Perdidas" };

// ─── Preferência de colunas (armazenamento local, por usuário + imobiliária + tabela) ─────────

const columnListeners = new Set<() => void>();
function subscribeColumns(listener: () => void) {
  columnListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { columnListeners.delete(listener); window.removeEventListener("storage", listener); };
}
function readStored(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function useColumnPrefs(kind: TableKind, userId: string, organizationId: string) {
  const key = columnsStorageKey(userId, organizationId, kind);
  const raw = useSyncExternalStore(subscribeColumns, () => readStored(key), () => null);
  const visible = useMemo(() => {
    if (raw === null) return defaultColumns(kind);
    try { return sanitizeColumns(kind, JSON.parse(raw)); } catch { return defaultColumns(kind); }
  }, [raw, kind]);
  const save = useCallback((next: string[] | null) => {
    try {
      if (next === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify(next));
    } catch { /* armazenamento indisponível: a escolha vale só nesta sessão */ }
    columnListeners.forEach((l) => l());
  }, [key]);
  return { visible, save };
}

// ─── Popovers (Mais filtros, Editar colunas) ────────────────────────────────────────────────

function usePopover() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) close(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);
  return { open, setOpen, close, rootRef, buttonRef };
}

function AdvancedFilters({ params, kind, broad, buildings, listings, onApply }: { params: URLSearchParams; kind: TableKind; broad: boolean; buildings: Option[]; listings: Option[]; onApply: (changes: Record<string, string | undefined>) => void }) {
  const { open, setOpen, close, rootRef, buttonRef } = usePopover();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const activeCount = ADVANCED_KEYS.filter((k) => params.get(k) && !(k === "unassigned" && params.get("stage") === "ACTIVE")).length;
  const openPopover = () => {
    // O rascunho começa do estado aplicado; fechar sem "Aplicar" descarta.
    setDraft(Object.fromEntries(ADVANCED_KEYS.map((k) => [k, params.get(k) ?? ""])));
    setOpen(true);
  };
  const set = (key: string, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const lostRelevant = ["LOST", "CLOSED"].includes(params.get("stage") ?? "") || params.get("status") === "LOST" || !!draft.lostReason;
  return (
    <div className={styles.popoverRoot} ref={rootRef}>
      <button ref={buttonRef} type="button" className={styles.toolButton} aria-expanded={open} aria-haspopup="dialog" onClick={() => (open ? close() : openPopover())} data-active={activeCount > 0 || undefined}>
        <Filter width={16} height={16} aria-hidden="true" />Mais filtros{activeCount > 0 && <span className={styles.countPill}>{activeCount}</span>}
      </button>
      {open && (
        <div className={styles.popover} role="dialog" aria-label="Filtros avançados" onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } }}>
          <form onSubmit={(e) => { e.preventDefault(); onApply(Object.fromEntries(ADVANCED_KEYS.map((k) => [k, draft[k] || undefined]))); close(); }}>
            <div className={styles.popoverGrid}>
              <label>Origem
                <select value={draft.source ?? ""} onChange={(e) => set("source", e.target.value)} autoFocus>
                  <option value="">Qualquer origem</option>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              {listings.length > 0 && (
                <label>Imóvel
                  <select value={draft.listingId ?? ""} onChange={(e) => set("listingId", e.target.value)}>
                    <option value="">Qualquer imóvel</option>
                    {listings.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </label>
              )}
              <label>Modalidade
                <select value={draft.operationType ?? ""} onChange={(e) => set("operationType", e.target.value)}>
                  <option value="">Qualquer modalidade</option>
                  {Object.entries(OPERATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              {broad && buildings.length > 0 && (
                <label>Empreendimento
                  <select value={draft.buildingId ?? ""} onChange={(e) => set("buildingId", e.target.value)}>
                    <option value="">Qualquer empreendimento</option>
                    {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </label>
              )}
              {lostRelevant && (
                <label>Motivo da perda
                  <select value={draft.lostReason ?? ""} onChange={(e) => set("lostReason", e.target.value)}>
                    <option value="">Qualquer motivo</option>
                    {Object.entries(LOST_REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
              )}
              <label>Entrada a partir de
                <input type="date" value={draft.from ?? ""} onChange={(e) => set("from", e.target.value)} />
              </label>
              <label>Entrada até
                <input type="date" value={draft.to ?? ""} onChange={(e) => set("to", e.target.value)} />
              </label>
              {broad && kind === "opportunities" && params.get("stage") !== "ACTIVE" && (
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={draft.unassigned === "true"} onChange={(e) => set("unassigned", e.target.checked ? "true" : "")} />
                  Somente sem responsável
                </label>
              )}
            </div>
            <div className={styles.popoverFoot}>
              <button type="button" className={styles.secondaryBtn} onClick={() => close()}>Cancelar</button>
              <button type="submit" className={styles.primaryBtn}>Aplicar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ColumnEditor({ kind, visible, onChange }: { kind: TableKind; visible: string[]; onChange: (next: string[] | null) => void }) {
  const { open, setOpen, close, rootRef, buttonRef } = usePopover();
  const defs = columnsFor(kind);
  return (
    <div className={styles.popoverRoot} ref={rootRef}>
      <button ref={buttonRef} type="button" className={styles.toolButton} aria-expanded={open} aria-haspopup="dialog" onClick={() => (open ? close() : setOpen(true))}>
        <SlidersHorizontal width={16} height={16} aria-hidden="true" />Editar colunas
      </button>
      {open && (
        <div className={`${styles.popover} ${styles.popoverRight}`} role="dialog" aria-label="Editar colunas" onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } }}>
          <fieldset className={styles.columnList}>
            <legend className={styles.srOnly}>Colunas visíveis</legend>
            {defs.map((col, index) => (
              <label key={col.id} className={styles.checkLabel}>
                <input
                  type="checkbox"
                  autoFocus={index === 1}
                  checked={col.locked || visible.includes(col.id)}
                  disabled={col.locked}
                  onChange={(e) => onChange(e.target.checked ? defs.filter((d) => d.id === col.id || visible.includes(d.id)).map((d) => d.id) : visible.filter((id) => id !== col.id))}
                />
                {col.label}{col.locked && <span className={styles.muted}> (sempre visível)</span>}
              </label>
            ))}
          </fieldset>
          <div className={styles.popoverFoot}>
            <button type="button" className={styles.secondaryBtn} onClick={() => onChange(null)}>Restaurar padrão</button>
            <button type="button" className={styles.primaryBtn} onClick={() => close()}>Concluir</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Busca com pausa ────────────────────────────────────────────────────────────────────────

function SearchBox({ value, onSearch }: { value: string; onSearch: (value: string) => void }) {
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  const [sent, setSent] = useState(value);
  // URL mudou por fora (limpar filtros, voltar do navegador): acompanha. Eco da própria busca não
  // sobrescreve o que a pessoa continuou digitando.
  if (value !== synced) {
    setSynced(value);
    if (value !== sent) { setSent(value); setText(value); }
  }
  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === sent.trim()) return;
    const timer = setTimeout(() => { setSent(trimmed); onSearch(trimmed); }, 350);
    return () => clearTimeout(timer);
  }, [text, sent, onSearch]);
  return (
    <div className={styles.search}>
      <Search width={16} height={16} aria-hidden="true" />
      <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Buscar nome, telefone, e-mail ou imóvel" aria-label="Buscar por nome, telefone, e-mail ou imóvel" maxLength={120} />
    </div>
  );
}

// ─── Células ────────────────────────────────────────────────────────────────────────────────

function PhoneCell({ phone }: { phone: string | null }) {
  if (!phone) return <span className={styles.muted}>—</span>;
  return <span className={styles.contactValue}><a href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</a><CopyValue value={phone} label="telefone" /></span>;
}
function EmailCell({ email }: { email: string }) {
  return <span className={styles.contactValue}><a href={`mailto:${email}`} title={email}>{email}</a><CopyValue value={email} label="e-mail" /></span>;
}
function Activity({ at }: { at: string | null }) {
  return <time dateTime={at ?? undefined} title={fmtDateTime(at)}>{fmtAge(at)}</time>;
}

// ─── Tela ───────────────────────────────────────────────────────────────────────────────────

export function ContactsView({ data, kind, userId, organizationId, isManager, broad, canRegister, assignees, taskMembers, buildings, listings }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { openSidebar } = useChatSocket();
  const { visible, save } = useColumnPrefs(kind, userId, organizationId);
  const openerRef = useRef<HTMLElement | null>(null);

  const params = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);
  const go = useCallback((query: string) => {
    startTransition(() => router.push(`${pathname}${query}`, { scroll: false }));
  }, [router, pathname]);
  const apply = useCallback((changes: Record<string, string | undefined>) => go(withChanges(new URLSearchParams(window.location.search), changes)), [go]);
  const onSearch = useCallback((value: string) => apply({ search: value || undefined }), [apply]);

  // Prévia: estado na URL (link direto abre a mesma pessoa), alterado sem nova requisição da lista.
  const personId = params.get("pessoa");
  const leadId = params.get("oportunidade");
  const focusListings = params.get("secao") === "imoveis";
  const setPanel = useCallback((changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(changes)) { if (v) next.set(k, v); else next.delete(k); }
    const q = next.toString();
    window.history.replaceState(null, "", `${pathname}${q ? `?${q}` : ""}`);
  }, [pathname]);
  const openPerson = (id: string, opts: { leadId?: string; listings?: boolean } = {}, opener?: HTMLElement | null) => {
    openerRef.current = opener ?? (document.activeElement as HTMLElement | null);
    setPanel({ pessoa: id, oportunidade: opts.leadId, secao: opts.listings ? "imoveis" : undefined });
  };
  const closePanel = useCallback(() => {
    const id = new URLSearchParams(window.location.search).get("pessoa");
    setPanel({ pessoa: undefined, oportunidade: undefined, secao: undefined });
    const opener = openerRef.current;
    const target = opener && opener.isConnected ? opener : document.querySelector<HTMLElement>(`[data-person="${id}"] [data-open-person]`);
    // Sem rolar: a lista precisa ficar exatamente onde estava.
    requestAnimationFrame(() => target?.focus({ preventScroll: true }));
  }, [setPanel]);
  const refreshList = useCallback(() => startTransition(() => router.refresh()), [router]);

  const view = activeView(kind, params, isManager);
  const views = viewsFor(kind, isManager);
  const filtered = hasFilters(params);
  const backHref = `${pathname}${listOnly(params)}`;
  const brokerName = (id: string) => assignees.find((a) => a.memberId === id)?.name ?? "Responsável";
  const optionName = (list: Option[], id: string) => list.find((o) => o.id === id)?.name ?? id;

  // Filtros ativos removíveis (inclui o que veio de links antigos e não corresponde a uma aba).
  const chips: { key: string; label: string; changes: Record<string, string | undefined> }[] = [];
  const add = (key: string, label: string, changes: Record<string, string | undefined> = { [key]: undefined }) => chips.push({ key, label, changes });
  const p = (k: string) => params.get(k);
  if (p("search")) add("search", `Busca: “${p("search")}”`);
  if (!view && p("stage") && p("stage") !== "ALL") add("stage", `Situação: ${STAGE_FILTER_LABELS[p("stage")!] ?? p("stage")}`);
  if (p("status")) add("status", `Etapa: ${STAGE_LABELS[p("status")!] ?? p("status")}`);
  if (p("brokerId")) add("brokerId", `Responsável: ${brokerName(p("brokerId")!)}`);
  if (p("listingId")) add("listingId", `Imóvel: ${optionName(listings, p("listingId")!)}`);
  if (p("unassigned") === "true" && view?.key !== "unassigned") add("unassigned", "Sem responsável");
  if (p("source")) add("source", `Origem: ${SOURCE_LABELS[p("source")!] ?? p("source")}`);
  if (p("operationType")) add("operationType", `Modalidade: ${OPERATION_LABELS[p("operationType")!] ?? p("operationType")}`);
  if (p("buildingId")) add("buildingId", `Empreendimento: ${optionName(buildings, p("buildingId")!)}`);
  if (p("lostReason")) add("lostReason", `Motivo: ${LOST_REASON_LABELS[p("lostReason")!] ?? p("lostReason")}`);
  if (p("from")) add("from", `Entrada desde ${fmtDate(`${p("from")}T12:00:00Z`)}`);
  if (p("to")) add("to", `Entrada até ${fmtDate(`${p("to")}T12:00:00Z`)}`);

  const cols = columnsFor(kind).filter((c) => visible.includes(c.id));
  const has = (id: string) => visible.includes(id);
  const noun = kind === "people" ? (n: number) => (n === 1 ? "contato" : "contatos") : (n: number) => (n === 1 ? "oportunidade" : "oportunidades");

  const renderTable = () => {
    if (!data) return null;
    if (data.items.length === 0) {
      if (data.baseTotal === 0) {
        return (
          <div className={styles.empty}>
            <Group aria-hidden="true" />
            <strong>Nenhum contato ainda</strong>
            <span>Os contatos chegam quando alguém conversa, faz uma proposta, pede uma reserva ou clica no WhatsApp de um imóvel da imobiliária{canRegister ? ", ou quando a equipe registra um interesse recebido por outro canal" : ""}.</span>
            {canRegister && <RegisterLeadForm listings={listings} canChooseSelf={broad} buttonClassName={styles.primaryBtn} />}
          </div>
        );
      }
      if (data.page > 1 && data.total > 0) {
        return (
          <div className={styles.empty}>
            <strong>Esta página não tem resultados</strong>
            <button type="button" className={styles.secondaryBtn} onClick={() => apply({ page: undefined })}>Ir para a primeira página</button>
          </div>
        );
      }
      return (
        <div className={styles.empty}>
          <Search aria-hidden="true" />
          <strong>Nenhum resultado</strong>
          <span>Nenhum{kind === "people" ? " contato" : "a oportunidade"} corresponde à busca e aos filtros desta visão.</span>
          {filtered && <button type="button" className={styles.secondaryBtn} onClick={() => go(clearFiltersHref(new URLSearchParams(window.location.search)))}>Limpar busca e filtros</button>}
        </div>
      );
    }

    return (
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {cols.map((c) => <th key={c.id} scope="col" data-col={c.id}>{c.label}</th>)}
              {kind === "opportunities" && <th scope="col" data-col="actions"><span className={styles.srOnly}>Ações</span></th>}
            </tr>
          </thead>
          <tbody>
            {data.view === "people"
              ? data.items.map((person: ContactPerson) => (
                <tr key={person.id} data-person={person.id} aria-selected={personId === person.id || undefined}>
                  <td data-col="name">
                    <button type="button" className={styles.nameButton} data-open-person onClick={(e) => openPerson(person.id, {}, e.currentTarget)}>
                      <span className={styles.avatarSm} data-tone={avatarTone(person.name)} aria-hidden="true">{initials(person.name)}</span>
                      <span className={styles.nameText}>{person.name}</span>
                    </button>
                  </td>
                  {has("phone") && <td data-col="phone"><PhoneCell phone={person.phone} /></td>}
                  {has("email") && <td data-col="email"><EmailCell email={person.email} /></td>}
                  {has("listings") && (
                    <td data-col="listings">
                      <span className={styles.listingCell}>
                        <span className={styles.truncate} title={person.primaryListing?.name}>{person.primaryListing?.name ?? "—"}</span>
                        {person.otherOpportunities > 0 && (
                          <button type="button" className={styles.morePill} onClick={(e) => openPerson(person.id, { listings: true }, e.currentTarget)} aria-label={`Ver todos os ${person.otherOpportunities + 1} imóveis de ${person.name}`}>
                            +{person.otherOpportunities}
                          </button>
                        )}
                      </span>
                    </td>
                  )}
                  {has("open") && <td data-col="open" className={styles.num}>{person.openOpportunities}</td>}
                  {has("activity") && <td data-col="activity" className={styles.num}><Activity at={person.lastActivityAt} /></td>}
                  {has("stages") && (
                    <td data-col="stages">
                      <span className={styles.badges}>
                        {Object.entries(person.stages).map(([s, n]) => <span key={s} className={styles.badge} data-tone={STAGE_TONES[s] ?? "slate"}>{n > 1 ? `${n} ` : ""}{STAGE_LABELS[s] ?? s}</span>)}
                      </span>
                    </td>
                  )}
                  {has("firstEntry") && <td data-col="firstEntry" className={styles.num}>{fmtDate(person.firstEntryAt)}</td>}
                </tr>
              ))
              : data.items.map((opp: ContactOpportunity) => (
                <tr key={opp.id} data-person={opp.customer.id} aria-selected={(personId === opp.customer.id && (!leadId || leadId === opp.id)) || undefined}>
                  <td data-col="customer">
                    <button type="button" className={styles.nameButton} data-open-person onClick={(e) => openPerson(opp.customer.id, { leadId: opp.id }, e.currentTarget)}>
                      <span className={styles.avatarSm} data-tone={avatarTone(opp.customer.name)} aria-hidden="true">{initials(opp.customer.name)}</span>
                      <span className={styles.nameText}>{opp.customer.name}</span>
                    </button>
                  </td>
                  {has("listing") && (
                    <td data-col="listing">
                      <span className={styles.truncate} title={opp.listing.name}>{opp.listing.name}</span>
                      <span className={styles.sub}>{OPERATION_LABELS[opp.listing.operationType] ?? opp.listing.operationType}{opp.listing.building ? ` · ${opp.listing.building.name}` : ""}</span>
                    </td>
                  )}
                  {has("stage") && (
                    <td data-col="stage">
                      <span className={styles.badges}>
                        <span className={styles.badge} data-tone={STAGE_TONES[opp.status] ?? "slate"}>{STAGE_LABELS[opp.status] ?? opp.status}</span>
                        <SlaBadge status={opp.slaStatus} />
                      </span>
                      {opp.status === "LOST" && <span className={styles.sub}>{opp.lostReason ? LOST_REASON_LABELS[opp.lostReason] ?? opp.lostReason : "Motivo não registrado"}</span>}
                    </td>
                  )}
                  {has("broker") && <td data-col="broker">{opp.broker?.name ?? <em className={styles.muted}>Sem responsável</em>}</td>}
                  {has("nextAction") && (
                    <td data-col="nextAction">
                      {opp.nextAction ? <><span className={styles.truncate}>{opp.nextAction.title}</span><span className={styles.sub}>{opp.nextAction.at ? fmtDateTime(opp.nextAction.at) : "Sem prazo"}</span></> : <span className={styles.muted}>—</span>}
                    </td>
                  )}
                  {has("activity") && <td data-col="activity" className={styles.num}><Activity at={opp.lastActivityAt} /></td>}
                  {has("phone") && <td data-col="phone"><PhoneCell phone={opp.customer.phone} /></td>}
                  {has("email") && <td data-col="email"><EmailCell email={opp.customer.email} /></td>}
                  {has("source") && <td data-col="source">{SOURCE_LABELS[opp.source] ?? opp.source}</td>}
                  {has("created") && <td data-col="created" className={styles.num}>{fmtDate(opp.createdAt)}</td>}
                  <td data-col="actions">
                    <span className={styles.rowActions}>
                      {opp.conversationId && (
                        <button type="button" className={styles.iconButton} onClick={() => openSidebar(opp.conversationId!, "organization")} aria-label={`Abrir conversa com ${opp.customer.name} sobre ${opp.listing.name}`} title="Abrir conversa">
                          <ChatBubble width={16} height={16} aria-hidden="true" />
                        </button>
                      )}
                      <Link className={styles.iconButton} href={`/imobiliaria/leads/${opp.id}?back=${encodeURIComponent(backHref)}`} aria-label={`Abrir ficha completa: ${opp.customer.name} · ${opp.listing.name}`} title="Abrir ficha completa">
                        <ExternalLink width={16} height={16} aria-hidden="true" />
                      </Link>
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const firstRow = data ? (data.page - 1) * data.limit + 1 : 0;
  const lastRow = data ? Math.min(data.total, data.page * data.limit) : 0;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Contatos</h1>
        <div className={styles.headerActions}>
          {canRegister && <RegisterLeadForm listings={listings} canChooseSelf={broad} buttonClassName={styles.primaryBtn} />}
        </div>
      </header>

      <div className={styles.tableSwitch} role="tablist" aria-label="Tipo de registro">
        {(["people", "opportunities"] as const).map((k) => (
          <Link
            key={k}
            role="tab"
            aria-selected={kind === k}
            href={`${pathname}${switchTableHref(params, k)}`}
            scroll={false}
            onClick={(e) => { e.preventDefault(); if (kind !== k) go(switchTableHref(new URLSearchParams(window.location.search), k)); }}
          >
            {k === "people" ? "Contatos" : "Oportunidades"}
            {data && <span className={styles.switchCount}>{k === "people" ? data.peopleTotal : data.opportunityTotal}</span>}
          </Link>
        ))}
      </div>

      <section className={styles.surface} aria-busy={isPending}>
        {isPending && <div className={styles.progress} role="progressbar" aria-label="Atualizando a lista" />}
        <nav className={styles.views} aria-label={kind === "people" ? "Visões de contatos" : "Visões de oportunidades"}>
          {views.map((v) => (
            <Link
              key={v.key}
              href={`${pathname}${viewHref(params, v)}`}
              scroll={false}
              aria-current={view?.key === v.key ? "page" : undefined}
              onClick={(e) => { e.preventDefault(); go(viewHref(new URLSearchParams(window.location.search), v)); }}
            >
              {v.key === "unassigned" && <UserXmark width={15} height={15} aria-hidden="true" />}{v.label}
            </Link>
          ))}
          {kind === "opportunities" && (
            <span className={styles.viewsAside}>
              {isManager && view?.key === "unassigned" && <Link href="/empresa/fila" className={styles.linkBtn}>Atribuir em lote na fila</Link>}
              <Link href={kanbanHref(params)} className={styles.linkBtn}><Kanban width={15} height={15} aria-hidden="true" />Abrir no Kanban</Link>
            </span>
          )}
        </nav>

        <div className={styles.toolbar}>
          <SearchBox value={params.get("search") ?? ""} onSearch={onSearch} />
          {broad && (
            <select className={styles.quick} aria-label="Responsável" value={params.get("brokerId") ?? ""} onChange={(e) => apply({ brokerId: e.target.value || undefined })} data-active={!!params.get("brokerId") || undefined}>
              <option value="">Responsável: todos</option>
              {assignees.map((a) => <option key={a.memberId} value={a.memberId}>{a.name}</option>)}
            </select>
          )}
          <select className={styles.quick} aria-label="Etapa" value={params.get("status") ?? ""} onChange={(e) => apply({ status: e.target.value || undefined })} data-active={!!params.get("status") || undefined}>
            <option value="">Etapa: todas</option>
            {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <AdvancedFilters key={params.toString()} params={params} kind={kind} broad={broad} buildings={buildings} listings={listings} onApply={apply} />
          <span className={styles.toolbarEnd}>
            <label className={styles.sortLabel}>
              <span>Ordenar</span>
              <select className={styles.quick} value={params.get("sort") ?? "activity"} onChange={(e) => apply({ sort: e.target.value === "activity" ? undefined : e.target.value })}>
                {SORTS.filter((s) => !s.opportunitiesOnly || kind === "opportunities").map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <ColumnEditor kind={kind} visible={visible} onChange={save} />
          </span>
        </div>

        {chips.length > 0 && (
          <div className={styles.chips} aria-label="Filtros ativos">
            {chips.map((chip) => (
              <button key={chip.key} type="button" className={styles.chip} onClick={() => apply(chip.changes)} aria-label={`Remover filtro ${chip.label}`}>
                {chip.label}<Xmark width={14} height={14} aria-hidden="true" />
              </button>
            ))}
            {chips.length > 1 && <button type="button" className={styles.linkBtn} onClick={() => go(clearFiltersHref(new URLSearchParams(window.location.search)))}>Limpar tudo</button>}
          </div>
        )}

        {!data ? (
          <div className={styles.empty} role="alert">
            <strong>Não foi possível carregar {kind === "people" ? "os contatos" : "as oportunidades"}</strong>
            <span>Verifique a conexão e tente de novo.</span>
            <button type="button" className={styles.secondaryBtn} onClick={refreshList}><RefreshCw width={15} height={15} aria-hidden="true" />Tentar novamente</button>
          </div>
        ) : (
          <div className={styles.tableArea} data-pending={isPending || undefined}>{renderTable()}</div>
        )}

        {data && data.total > 0 && (
          <footer className={styles.footer}>
            <p role="status">{firstRow}–{lastRow} de {data.total} {noun(data.total)}{kind === "people" ? ` · ${data.opportunityTotal} ${data.opportunityTotal === 1 ? "oportunidade" : "oportunidades"}` : ` · ${data.peopleTotal} ${data.peopleTotal === 1 ? "pessoa" : "pessoas"}`}</p>
            {totalPages > 1 && (
              <nav className={styles.pager} aria-label="Paginação">
                <button type="button" disabled={data.page <= 1} onClick={() => apply({ page: data.page > 2 ? String(data.page - 1) : undefined })}>← Anterior</button>
                <span>Página {data.page} de {totalPages}</span>
                <button type="button" disabled={data.page >= totalPages} onClick={() => apply({ page: String(data.page + 1) })}>Próxima →</button>
              </nav>
            )}
          </footer>
        )}
      </section>

      {personId && (
        <ContactPreview
          key={personId}
          userId={personId}
          selectedLeadId={leadId}
          focusListings={focusListings}
          backHref={`${backHref}${backHref.includes("?") ? "&" : "?"}pessoa=${encodeURIComponent(personId)}`}
          taskMembers={taskMembers}
          onSelectLead={(id) => setPanel({ oportunidade: id, secao: undefined })}
          onClose={closePanel}
          onMutated={refreshList}
        />
      )}
    </main>
  );
}
