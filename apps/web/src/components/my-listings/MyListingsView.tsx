"use client";

import { useActionState, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Eye,
  MessageCircle,
  Pencil,
  Tag,
  Copy,
  Trash2,
  Send,
  EyeOff,
  RotateCcw,
  ExternalLink,
  MoreHorizontal,
  Search,
  X,
  LayoutGrid,
  List,
  Plus,
  Upload,
  CircleAlert,
  CircleCheck,
  Clock,
  FileText,
  Home,
  Camera,
  BarChart3,
  LoaderCircle,
  TriangleAlert,
  Lightbulb,
  MapPin,
} from "lucide-react";
import type { OwnedListing } from "@/lib/listings-api";
import {
  deleteListingAction,
  duplicateListingAction,
  publishListingAction,
  relistListingAction,
  unpublishListingAction,
} from "@/lib/actions/listings";
import { thumbnailImgProps } from "@/lib/images";
import { DiscountModal } from "@/components/dashboard/DiscountModal";
import styles from "./MyListingsView.module.css";

/* ───────────────────────── Regras de exibição ───────────────────────── */

type Tone = "green" | "amber" | "slate" | "red" | "indigo" | "sky";
const STATUS: Record<string, { label: string; hint: string; tone: Tone }> = {
  APPROVED: { label: "Ativo", hint: "Visível na busca", tone: "green" },
  PENDING: { label: "Em análise", hint: "Aguardando aprovação", tone: "amber" },
  DRAFT: { label: "Rascunho", hint: "Não aparece na busca", tone: "slate" },
  REJECTED: { label: "Rejeitado", hint: "Precisa de ajustes", tone: "red" },
  SOLD: { label: "Vendido", hint: "Negócio fechado", tone: "indigo" },
  RENTED: { label: "Alugado", hint: "Ocupado por inquilino", tone: "sky" },
  REMOVED: { label: "Removido", hint: "Retirado pela moderação", tone: "slate" },
};
const statusOf = (status: string) => STATUS[status] ?? { label: status, hint: "", tone: "slate" as Tone };

const FILTERS = [
  { id: "all", label: "Todos", match: () => true },
  { id: "active", label: "Ativos", match: (s: string) => s === "APPROVED" },
  { id: "pending", label: "Em análise", match: (s: string) => s === "PENDING" },
  { id: "draft", label: "Rascunhos", match: (s: string) => s === "DRAFT" },
  { id: "rejected", label: "Rejeitados", match: (s: string) => s === "REJECTED" },
  { id: "closed", label: "Encerrados", match: (s: string) => ["SOLD", "RENTED", "REMOVED"].includes(s) },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

const SORTS = [
  { id: "recent", label: "Mais recentes" },
  { id: "views", label: "Mais visualizados" },
  { id: "contacts", label: "Mais contatos" },
  { id: "priceDesc", label: "Maior preço" },
  { id: "priceAsc", label: "Menor preço" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

const DAY = 86_400_000;
const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const plural = (n: number, one: string, many: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;
const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function modalityOf(listing: OwnedListing): { label: string; period: string } {
  const op = listing.operationType ?? (listing.category === "venda" ? "SALE" : listing.billingCycle === "mês" ? "MONTHLY_RENT" : "DAILY_RENT");
  if (op === "SALE") return { label: "Venda", period: "" };
  if (op === "MONTHLY_RENT") return { label: "Aluguel", period: "/mês" };
  return { label: "Temporada", period: "/noite" };
}

function placeOf(listing: OwnedListing): string {
  const parts = [listing.bairro, listing.cidade && listing.uf ? `${listing.cidade} - ${listing.uf}` : listing.cidade].filter(Boolean);
  if (parts.length) return parts.join(", ");
  const segments = listing.location.split(" - ").map((p) => p.trim()).filter(Boolean);
  return segments.length > 1 ? segments.slice(1).join(" - ") : listing.location;
}

function ago(iso: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return months < 12 ? `há ${plural(months, "mês", "meses")}` : `há ${plural(Math.floor(months / 12), "ano", "anos")}`;
}

/* ───────────────────────── Preferência de visualização (grade/lista) ───────────────────────── */

const VIEW_KEY = "zhivago.meusAnuncios.view";
const viewListeners = new Set<() => void>();
const readView = (): "grid" | "list" => {
  try { return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid"; } catch { return "grid"; }
};
const writeView = (view: "grid" | "list") => {
  try { localStorage.setItem(VIEW_KEY, view); } catch { /* navegador sem armazenamento: vale só nesta visita */ }
  viewListeners.forEach((listener) => listener());
};
const subscribeView = (listener: () => void) => { viewListeners.add(listener); return () => viewListeners.delete(listener); };

/* ───────────────────────── Avisos (toasts) ───────────────────────── */

type Toast = { id: number; kind: "success" | "error"; text: string };
type Notify = (kind: Toast["kind"], text: string) => void;

/* ───────────────────────── Botão de ação com Server Action ───────────────────────── */

type ServerAction = (prev: { error: string } | undefined, data: FormData) => Promise<{ error: string } | undefined>;

function ActionButton({ action, listingId, className, children, pendingLabel, successText, notify, confirm, role }: {
  action: ServerAction;
  listingId: string;
  className: string;
  children: ReactNode;
  pendingLabel: string;
  successText?: string;
  notify: Notify;
  confirm?: { title: string; body: ReactNode; confirmLabel: string };
  role?: "menuitem";
}) {
  // O aviso sai assim que o servidor responde — mesmo que o anúncio suma da lista (ex.: excluído)
  // e este botão seja desmontado antes de a tela atualizar.
  const [, formAction, pending] = useActionState<{ error: string } | undefined, FormData>(async (prev, data) => {
    const result = await action(prev, data);
    if (result?.error) notify("error", result.error);
    else if (successText) notify("success", successText);
    return result;
  }, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [asking, setAsking] = useState(false);

  return (
    <form ref={formRef} action={formAction} className={styles.inlineForm} role={role ? "none" : undefined}>
      <input type="hidden" name="id" value={listingId} />
      <button
        type={confirm ? "button" : "submit"}
        role={role}
        className={className}
        disabled={pending}
        onClick={confirm ? () => setAsking(true) : undefined}
      >
        {pending ? <><LoaderCircle size={15} className={styles.spin} aria-hidden="true" />{pendingLabel}</> : children}
      </button>
      {asking && confirm && (
        <ConfirmDialog
          title={confirm.title}
          confirmLabel={confirm.confirmLabel}
          onCancel={() => setAsking(false)}
          onConfirm={() => { setAsking(false); formRef.current?.requestSubmit(); }}
        >
          {confirm.body}
        </ConfirmDialog>
      )}
    </form>
  );
}

function ConfirmDialog({ title, children, confirmLabel, onCancel, onConfirm }: {
  title: string; children: ReactNode; confirmLabel: string; onCancel: () => void; onConfirm: () => void;
}) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [onCancel]);

  return createPortal(
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <span className={styles.dialogIcon} aria-hidden="true"><Trash2 size={20} /></span>
        <h2 id={titleId} className={styles.dialogTitle}>{title}</h2>
        <div className={styles.dialogBody}>{children}</div>
        <div className={styles.dialogActions}>
          <button ref={cancelRef} type="button" className={styles.btnSecondary} onClick={onCancel}>Cancelar</button>
          <button type="button" className={styles.btnDanger} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ───────────────────────── Menu "Mais ações" ───────────────────────── */

function MoreMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); wrapRef.current?.querySelector<HTMLButtonElement>("button")?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => wrapRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus());
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(wrapRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not(:disabled)") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    items[(index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };

  return (
    <div ref={wrapRef} className={styles.menuWrap}>
      <button
        type="button"
        className={styles.iconBtn}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={18} />
      </button>
      {/* Fica montado mesmo fechado: as ações em andamento (formulários) não podem ser desmontadas. */}
      <div id={menuId} role="menu" aria-label={label} hidden={!open} className={styles.menu} onKeyDown={onMenuKey} onClick={(e) => { if ((e.target as HTMLElement).closest("[role=menuitem]")) setOpen(false); }}>
        {children}
      </div>
    </div>
  );
}

/* ───────────────────────── Ações de um anúncio ───────────────────────── */

function ListingActions({ listing, notify, onDiscount, compact }: { listing: OwnedListing; notify: Notify; onDiscount: () => void; compact?: boolean }) {
  const isPublic = ["APPROVED", "SOLD", "RENTED"].includes(listing.status);
  const editHref = `/anuncios/${listing.id}/editar`;

  const primary =
    listing.status === "DRAFT" ? (
      <ActionButton action={publishListingAction} listingId={listing.id} className={styles.btnPrimary} pendingLabel="Publicando…" successText={`“${listing.name}” foi enviado para publicação.`} notify={notify}>
        <Send size={15} aria-hidden="true" />Publicar
      </ActionButton>
    ) : listing.status === "REJECTED" ? (
      <Link href={editHref} className={styles.btnPrimary}><Pencil size={15} aria-hidden="true" />Corrigir e reenviar</Link>
    ) : listing.status === "RENTED" ? (
      <ActionButton action={relistListingAction} listingId={listing.id} className={styles.btnPrimary} pendingLabel="Atualizando…" successText={`“${listing.name}” voltou a ficar disponível.`} notify={notify}>
        <RotateCcw size={15} aria-hidden="true" />Disponibilizar
      </ActionButton>
    ) : null;

  return (
    <div className={styles.actions}>
      {primary}
      {!compact || !primary ? (
        <Link href={editHref} className={styles.btnSecondary}><Pencil size={15} aria-hidden="true" />Editar</Link>
      ) : null}
      <MoreMenu label={`Mais ações para ${listing.name}`}>
        {isPublic && (
          <Link role="menuitem" href={`/imovel/${listing.id}`} target="_blank" className={styles.menuItem}>
            <ExternalLink size={16} aria-hidden="true" />Ver como cliente
          </Link>
        )}
        {compact && primary && (
          <Link role="menuitem" href={editHref} className={styles.menuItem}><Pencil size={16} aria-hidden="true" />Editar</Link>
        )}
        <button type="button" role="menuitem" className={styles.menuItem} onClick={onDiscount}>
          <Tag size={16} aria-hidden="true" />Aplicar desconto
        </button>
        {listing.status === "APPROVED" && (
          <ActionButton action={unpublishListingAction} listingId={listing.id} role="menuitem" className={styles.menuItem} pendingLabel="Despublicando…" successText={`“${listing.name}” saiu da busca e virou rascunho.`} notify={notify}>
            <EyeOff size={16} aria-hidden="true" />Despublicar
          </ActionButton>
        )}
        <ActionButton action={duplicateListingAction} listingId={listing.id} role="menuitem" className={styles.menuItem} pendingLabel="Duplicando…" notify={notify}>
          <Copy size={16} aria-hidden="true" />Duplicar
        </ActionButton>
        <span className={styles.menuDivider} role="separator" />
        <ActionButton
          action={deleteListingAction}
          listingId={listing.id}
          role="menuitem"
          className={`${styles.menuItem} ${styles.menuDanger}`}
          pendingLabel="Excluindo…"
          successText={`“${listing.name}” foi excluído.`}
          notify={notify}
          confirm={{
            title: "Excluir anúncio?",
            confirmLabel: "Excluir anúncio",
            body: <p>“<strong>{listing.name}</strong>” será removido junto com fotos e estatísticas. Esta ação não pode ser desfeita.</p>,
          }}
        >
          <Trash2 size={16} aria-hidden="true" />Excluir
        </ActionButton>
      </MoreMenu>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const info = statusOf(status);
  return (
    <span className={`${styles.status} ${styles[`tone_${info.tone}`]}`} title={info.hint}>
      <span className={styles.statusDot} aria-hidden="true" />{info.label}
    </span>
  );
}

function PriceLine({ listing }: { listing: OwnedListing }) {
  const { period } = modalityOf(listing);
  const original = Number(listing.originalPrice);
  const discount = original > listing.price ? Math.round(((original - listing.price) / original) * 100) : 0;
  return (
    <p className={styles.price}>
      {brl(listing.price)}{period && <small> {period}</small>}
      {discount > 0 && <><s className={styles.oldPrice}>{brl(original)}</s><span className={styles.discount}>-{discount}%</span></>}
    </p>
  );
}

/** Dica de desempenho: muitas visitas sem contato costuma indicar preço, fotos ou descrição a revisar. */
const needsTuning = (l: OwnedListing) => l.status === "APPROVED" && l.viewCount >= 30 && l._count.conversations === 0;

/* ───────────────────────── Cartão (grade) e linha (lista) ───────────────────────── */

function ListingCard({ listing, notify, onDiscount }: { listing: OwnedListing; notify: Notify; onDiscount: () => void }) {
  const { label } = modalityOf(listing);
  return (
    <article className={styles.card}>
      <Link href={`/anuncios/${listing.id}/editar`} className={styles.cover} aria-label={`Editar ${listing.name}`}>
        {listing.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img {...thumbnailImgProps(listing.images[0].url)} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className={styles.noPhoto}><Camera size={22} aria-hidden="true" />Sem fotos</span>
        )}
        <span className={styles.modality}>{label}</span>
        {listing.images.length > 1 && <span className={styles.photoCount}><Camera size={12} aria-hidden="true" />{listing.images.length}</span>}
      </Link>
      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <StatusPill status={listing.status} />
          <span className={styles.age} suppressHydrationWarning>Criado {ago(listing.createdAt)}</span>
        </div>
        <PriceLine listing={listing} />
        <h3 className={styles.title}><Link href={`/anuncios/${listing.id}/editar`}>{listing.name}</Link></h3>
        <p className={styles.place}><MapPin size={14} aria-hidden="true" />{placeOf(listing)}</p>

        {listing.status === "REJECTED" && (
          <p className={styles.rejectNote}><CircleAlert size={15} aria-hidden="true" /><span><strong>Motivo:</strong> {listing.rejectReason?.trim() || "a moderação não informou o motivo. Revise fotos, título e descrição."}</span></p>
        )}
        {needsTuning(listing) && (
          <p className={styles.tuneNote}><Lightbulb size={15} aria-hidden="true" /><span>Muitas visitas e nenhum contato: revise preço, fotos ou descrição.</span></p>
        )}

        <dl className={styles.metrics}>
          <div><dt><Eye size={15} aria-hidden="true" />Visualizações</dt><dd>{listing.viewCount.toLocaleString("pt-BR")}</dd></div>
          <div><dt><MessageCircle size={15} aria-hidden="true" />Contatos</dt><dd>{listing._count.conversations.toLocaleString("pt-BR")}</dd></div>
        </dl>
        <ListingActions listing={listing} notify={notify} onDiscount={onDiscount} compact />
      </div>
    </article>
  );
}

function ListingRow({ listing, notify, onDiscount }: { listing: OwnedListing; notify: Notify; onDiscount: () => void }) {
  const { label } = modalityOf(listing);
  return (
    <div className={styles.row} role="row">
      <div className={styles.rowMain} role="cell">
        <Link href={`/anuncios/${listing.id}/editar`} className={styles.rowThumb} tabIndex={-1} aria-hidden="true">
          {listing.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img {...thumbnailImgProps(listing.images[0].url)} alt="" loading="lazy" decoding="async" />
          ) : <Camera size={18} />}
        </Link>
        <div className={styles.rowText}>
          <Link href={`/anuncios/${listing.id}/editar`} className={styles.rowTitle}>{listing.name}</Link>
          <span className={styles.rowSub}>{label} · {placeOf(listing)}</span>
          {listing.status === "REJECTED" && <span className={styles.rowReject}><CircleAlert size={13} aria-hidden="true" />{listing.rejectReason?.trim() || "Motivo não informado"}</span>}
        </div>
      </div>
      <div role="cell" className={styles.rowStatus}><StatusPill status={listing.status} /></div>
      <div role="cell" className={styles.rowPrice}><PriceLine listing={listing} /></div>
      <div role="cell" className={styles.rowNum}><span className={styles.rowLabel}>Visualizações</span>{listing.viewCount.toLocaleString("pt-BR")}</div>
      <div role="cell" className={styles.rowNum}><span className={styles.rowLabel}>Contatos</span>{listing._count.conversations.toLocaleString("pt-BR")}</div>
      <div role="cell" className={styles.rowActions}><ListingActions listing={listing} notify={notify} onDiscount={onDiscount} compact /></div>
    </div>
  );
}

/* ───────────────────────── Tela ───────────────────────── */

export function MyListingsView({ listings, isAgency }: { listings: OwnedListing[]; isAgency: boolean }) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortId>("recent");
  const view = useSyncExternalStore(subscribeView, readView, () => "grid" as const);
  const [discountFor, setDiscountFor] = useState<OwnedListing | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);
  const notify = useMemo<Notify>(() => (kind, text) => {
    const id = ++toastSeq.current;
    setToasts((list) => [...list, { id, kind, text }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), kind === "error" ? 8000 : 5000);
  }, []);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, listings.filter((l) => f.match(l.status)).length])) as Record<FilterId, number>, [listings]);
  const totals = useMemo(() => {
    const views = listings.reduce((sum, l) => sum + l.viewCount, 0);
    const contacts = listings.reduce((sum, l) => sum + l._count.conversations, 0);
    return { views, contacts, rate: views > 0 ? (contacts / views) * 100 : null };
  }, [listings]);

  const rejected = listings.filter((l) => l.status === "REJECTED");
  const drafts = listings.filter((l) => l.status === "DRAFT");
  const attention = [...rejected, ...drafts];

  const visible = useMemo(() => {
    const match = FILTERS.find((f) => f.id === filter)!.match;
    const q = normalize(query.trim());
    const list = listings.filter((l) => match(l.status) && (!q || normalize(`${l.name} ${l.location} ${l.bairro ?? ""} ${l.cidade ?? ""}`).includes(q)));
    const by: Record<SortId, (a: OwnedListing, b: OwnedListing) => number> = {
      recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
      views: (a, b) => b.viewCount - a.viewCount,
      contacts: (a, b) => b._count.conversations - a._count.conversations,
      priceDesc: (a, b) => b.price - a.price,
      priceAsc: (a, b) => a.price - b.price,
    };
    return [...list].sort(by[sort]);
  }, [listings, filter, query, sort]);

  const clearFilters = () => { setFilter("all"); setQuery(""); };
  const filterLabel = FILTERS.find((f) => f.id === filter)!.label.toLowerCase();

  return (
    <div className={styles.page}>
      {/* ── CABEÇALHO ── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.h1}>Meus anúncios</h1>
          <p className={styles.lead}>Acompanhe o desempenho e mantenha seus imóveis em dia.</p>
        </div>
        <div className={styles.headerActions}>
          {isAgency && (
            <Link href="/anuncios/importar" className={styles.btnSecondary}><Upload size={16} aria-hidden="true" />Importar em lote</Link>
          )}
          <Link href="/anuncios/novo" className={styles.btnPrimary}><Plus size={16} aria-hidden="true" />Anunciar imóvel</Link>
        </div>
      </header>

      {listings.length === 0 ? (
        /* ── NENHUM ANÚNCIO AINDA ── */
        <section className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true"><Home size={28} /></span>
          <h2 className={styles.emptyTitle}>Você ainda não tem anúncios</h2>
          <p className={styles.emptyText}>Publique seu primeiro imóvel em poucos minutos. Ele aparece aqui para você acompanhar visitas e contatos.</p>
          <ol className={styles.steps}>
            <li><span>1</span><div><strong>Conte sobre o imóvel</strong><p>Tipo, endereço, cômodos e preço.</p></div></li>
            <li><span>2</span><div><strong>Capriche nas fotos</strong><p>Fotos claras atraem mais interessados.</p></div></li>
            <li><span>3</span><div><strong>Acompanhe por aqui</strong><p>Visualizações, contatos e ajustes rápidos.</p></div></li>
          </ol>
          <Link href="/anuncios/novo" className={styles.btnPrimary}><Plus size={16} aria-hidden="true" />Anunciar meu primeiro imóvel</Link>
        </section>
      ) : (
        <>
          {/* ── RESUMO ── */}
          <section className={styles.kpis} aria-label="Resumo dos seus anúncios">
            <button type="button" className={styles.kpi} onClick={() => setFilter("active")} aria-pressed={filter === "active"}>
              <span className={`${styles.kpiIcon} ${styles.tone_green}`}><CircleCheck size={18} aria-hidden="true" /></span>
              <span className={styles.kpiValue}>{counts.active}</span>
              <span className={styles.kpiLabel}>{counts.active === 1 ? "Anúncio ativo" : "Anúncios ativos"}</span>
            </button>
            <div className={styles.kpi}>
              <span className={`${styles.kpiIcon} ${styles.tone_sky}`}><Eye size={18} aria-hidden="true" /></span>
              <span className={styles.kpiValue}>{totals.views.toLocaleString("pt-BR")}</span>
              <span className={styles.kpiLabel}>Visualizações</span>
            </div>
            <div className={styles.kpi}>
              <span className={`${styles.kpiIcon} ${styles.tone_indigo}`}><MessageCircle size={18} aria-hidden="true" /></span>
              <span className={styles.kpiValue}>{totals.contacts.toLocaleString("pt-BR")}</span>
              <span className={styles.kpiLabel}>Contatos recebidos</span>
            </div>
            <div className={styles.kpi}>
              <span className={`${styles.kpiIcon} ${styles.tone_amber}`}><BarChart3 size={18} aria-hidden="true" /></span>
              <span className={styles.kpiValue}>{totals.rate === null ? "—" : `${totals.rate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}</span>
              <span className={styles.kpiLabel}>Visitas que viraram contato</span>
            </div>
          </section>

          {/* ── PRECISA DE ATENÇÃO ── */}
          {attention.length > 0 && (
            <section className={styles.attention} aria-labelledby="attention-title">
              <div className={styles.attentionHead}>
                <TriangleAlert size={18} aria-hidden="true" />
                <h2 id="attention-title">Precisa de atenção <span className={styles.badgeCount}>{attention.length}</span></h2>
              </div>
              <ul className={styles.attentionList}>
                {attention.slice(0, 4).map((l) => (
                  <li key={l.id}>
                    <span className={`${styles.attentionIcon} ${l.status === "REJECTED" ? styles.tone_red : styles.tone_slate}`} aria-hidden="true">
                      {l.status === "REJECTED" ? <CircleAlert size={16} /> : <FileText size={16} />}
                    </span>
                    <div className={styles.attentionText}>
                      <strong>{l.name}</strong>
                      <span>{l.status === "REJECTED" ? `Rejeitado: ${l.rejectReason?.trim() || "motivo não informado"}` : "Rascunho: ainda não aparece na busca."}</span>
                    </div>
                    {l.status === "REJECTED" ? (
                      <Link href={`/anuncios/${l.id}/editar`} className={`${styles.btnSecondary} ${styles.btnSmall}`}>Corrigir</Link>
                    ) : (
                      <ActionButton action={publishListingAction} listingId={l.id} className={`${styles.btnSecondary} ${styles.btnSmall}`} pendingLabel="Publicando…" successText={`“${l.name}” foi enviado para publicação.`} notify={notify}>
                        <Send size={14} aria-hidden="true" />Publicar
                      </ActionButton>
                    )}
                  </li>
                ))}
              </ul>
              {attention.length > 4 && (
                <button type="button" className={styles.linkBtn} onClick={() => setFilter(rejected.length ? "rejected" : "draft")}>Ver todos ({attention.length})</button>
              )}
            </section>
          )}

          {counts.pending > 0 && (
            <p className={styles.infoNote}><Clock size={16} aria-hidden="true" />{counts.pending === 1 ? "1 anúncio está" : `${counts.pending} anúncios estão`} em análise. Você será avisado quando {counts.pending === 1 ? "ele for publicado" : "forem publicados"}.</p>
          )}

          {/* ── FILTROS E FERRAMENTAS ── */}
          <div className={styles.toolbar}>
            <div className={styles.tabs} role="tablist" aria-label="Filtrar por situação">
              {FILTERS.filter((f) => f.id === "all" || f.id === "active" || counts[f.id] > 0).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.id}
                  className={`${styles.tab} ${filter === f.id ? styles.tabActive : ""}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}<span className={styles.tabCount}>{counts[f.id]}</span>
                </button>
              ))}
            </div>

            <div className={styles.tools}>
              <label className={styles.search}>
                <Search size={16} aria-hidden="true" />
                <input type="search" placeholder="Buscar por título, bairro ou cidade" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar nos seus anúncios" />
                {query && <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca"><X size={14} /></button>}
              </label>
              <label className={styles.sort}>
                <span className={styles.srOnly}>Ordenar por</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortId)}>
                  {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <div className={styles.viewToggle} role="group" aria-label="Modo de exibição">
                <button type="button" aria-pressed={view === "grid"} aria-label="Ver em grade" title="Grade" onClick={() => writeView("grid")}><LayoutGrid size={16} /></button>
                <button type="button" aria-pressed={view === "list"} aria-label="Ver em lista" title="Lista" onClick={() => writeView("list")}><List size={16} /></button>
              </div>
            </div>
          </div>

          <p className={styles.resultCount} aria-live="polite">
            {visible.length === listings.length ? plural(visible.length, "anúncio", "anúncios") : `${plural(visible.length, "anúncio", "anúncios")} de ${listings.length}`}
          </p>

          {visible.length === 0 ? (
            <section className={styles.noResults}>
              <Search size={24} aria-hidden="true" />
              <h2>Nenhum anúncio encontrado</h2>
              <p>{query ? <>Nada corresponde a “{query}”{filter !== "all" ? <> em {filterLabel}</> : null}.</> : <>Você não tem anúncios em {filterLabel}.</>}</p>
              <button type="button" className={styles.btnSecondary} onClick={clearFilters}>Limpar filtros</button>
            </section>
          ) : view === "grid" ? (
            <div className={styles.grid}>
              {visible.map((l) => <ListingCard key={l.id} listing={l} notify={notify} onDiscount={() => setDiscountFor(l)} />)}
            </div>
          ) : (
            <div className={styles.table} role="table" aria-label="Seus anúncios">
              <div className={styles.tableHead} role="row">
                <span role="columnheader">Imóvel</span>
                <span role="columnheader">Situação</span>
                <span role="columnheader">Preço</span>
                <span role="columnheader">Visualizações</span>
                <span role="columnheader">Contatos</span>
                <span role="columnheader"><span className={styles.srOnly}>Ações</span></span>
              </div>
              {visible.map((l) => <ListingRow key={l.id} listing={l} notify={notify} onDiscount={() => setDiscountFor(l)} />)}
            </div>
          )}
        </>
      )}

      {discountFor && <DiscountModal listing={discountFor} onClose={() => setDiscountFor(null)} />}

      <div className={styles.toasts} aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${t.kind === "error" ? styles.toastError : ""}`} role={t.kind === "error" ? "alert" : "status"}>
            {t.kind === "error" ? <CircleAlert size={18} aria-hidden="true" /> : <CircleCheck size={18} aria-hidden="true" />}
            <span>{t.text}</span>
            <button type="button" onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))} aria-label="Fechar aviso"><X size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
