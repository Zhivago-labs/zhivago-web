import Link from "next/link";
import type { Metadata } from "next";
import { Sparks, Clock, WarningCircle, UserXmark, Search, ArrowRight, Building, User, Percentage, CheckCircle, XmarkCircle, Timer } from "iconoir-react";
import { requireAuth } from "@/lib/session";
import { getMyOrganization, getOrganizationBuildings, getOrganizationListings, getMyAssignedListings } from "@/lib/organizations-api";
import { getOrganizationLeads, getOrganizationMetrics } from "@/lib/leads-api";
import { LeadStatusSelect } from "@/components/dashboard/LeadStatusSelect";
import { SlaBadge } from "@/components/dashboard/SlaBadge";
import { LineChart } from "@/components/dashboard/LineChart";
import { avatarTone, initials, STAGE_TONES } from "@/components/workspace/workspace-ui";
import type { Lead, LeadStatus } from "@zhivago/shared";
import type { MyOrganization } from "@/lib/organizations-api";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Pipeline de Leads" };

const ORG_WIDE_VIEW_ROLES = ["OWNER", "ADMIN", "MANAGER", "ASSISTANT"];
const MANAGE_ROLES = ["OWNER", "ADMIN", "MANAGER"]; // ASSISTANT tem a mesma visão org-wide, mas nunca gerencia

const COLUMNS: { status: LeadStatus; label: string }[] = [
  { status: "NEW", label: "Novo" },
  { status: "CONTACTED", label: "Contatado" },
  { status: "QUALIFIED", label: "Qualificado" },
  { status: "VISIT_SCHEDULED", label: "Visita agendada" },
  { status: "PROPOSAL", label: "Proposta" },
  { status: "NEGOTIATION", label: "Negociação" },
  { status: "WON", label: "Ganho" },
  { status: "LOST", label: "Perdido" },
];

const STATUS_LABELS: Record<LeadStatus, string> = Object.fromEntries(
  COLUMNS.map((c) => [c.status, c.label])
) as Record<LeadStatus, string>;

function formatHours(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)} h`;
}

function formatNextAction(task: Lead["tasks"][number]): string {
  if (!task.dueAt) return task.title;
  const due = new Date(task.dueAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${task.title} · ${due}`;
}

type StatTile = { label: string; value: string | number; icon: typeof Sparks; tone: string };
function StatTiles({ items, label }: { items: StatTile[]; label?: string }) {
  return (
    <div className={styles.statsGrid} aria-label={label}>
      {items.map(({ label: itemLabel, value, icon: Icon, tone }) => (
        <div className={styles.statTile} data-tone={tone} key={itemLabel}>
          <span className={styles.statIcon}><Icon width={20} height={20} aria-hidden="true" /></span>
          <div><p className={styles.statValue}>{value}</p><p className={styles.statLabel}>{itemLabel}</p></div>
        </div>
      ))}
    </div>
  );
}

type Props = {
  searchParams: Promise<{ view?: string; brokerId?: string; buildingId?: string; listingId?: string; search?: string; status?: string; page?: string }>;
};

export default async function ImobiliariaPipelinePage({ searchParams }: Props) {
  const params = await searchParams;
  const { view: viewParam, brokerId, buildingId, listingId } = params;
  const search = params.search?.trim();
  const status = COLUMNS.some((column) => column.status === params.status) ? params.status : undefined;
  const pageNumber = Number(params.page);
  const page = Number.isSafeInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const { token } = await requireAuth("/imobiliaria");

  const membership = await getMyOrganization(token);
  if (!membership) {
    return (
      <main className={styles.main}>
        <p className={styles.restricted}>
          O pipeline de leads é exclusivo para quem pertence a uma organização.
        </p>
      </main>
    );
  }

  const hasOrgWideView = ORG_WIDE_VIEW_ROLES.includes(membership.role);
  const canManage = MANAGE_ROLES.includes(membership.role);
  const view = viewParam === "metricas" && hasOrgWideView ? "metricas" : "pipeline";
  const subtitle = view === "metricas"
    ? "Funil, SLA de resposta e desempenho por corretor."
    : hasOrgWideView
      ? "Todos os leads da organização, agrupados por etapa do funil."
      : "Seus leads atualmente atribuídos, agrupados por etapa do funil.";

  return (
    <main className={styles.main}>
      <div className={styles.pageHeader}>
        <div><h1 className={styles.title}>Kanban</h1><p className={styles.subtitle}>{subtitle}</p></div>
        {hasOrgWideView && (
          <nav className={styles.viewTabs} aria-label="Visualização">
            <Link href="/imobiliaria" className={`${styles.viewTab} ${view === "pipeline" ? styles.viewTabActive : ""}`} aria-current={view === "pipeline" ? "page" : undefined}>Funil</Link>
            <Link href="/imobiliaria?view=metricas" className={`${styles.viewTab} ${view === "metricas" ? styles.viewTabActive : ""}`} aria-current={view === "metricas" ? "page" : undefined}>Métricas</Link>
          </nav>
        )}
      </div>
      {view === "metricas" ? (
        <MetricsView token={token} />
      ) : (
        <PipelineView
          token={token}
          hasOrgWideView={hasOrgWideView}
          canManage={canManage}
          membership={membership}
          page={page}
          filters={{ brokerId, buildingId, listingId, search, status }}
        />
      )}
    </main>
  );
}

async function PipelineView({
  token,
  hasOrgWideView,
  canManage,
  filters,
  membership,
  page,
}: {
  token: string;
  hasOrgWideView: boolean;
  canManage: boolean;
  membership: MyOrganization;
  page: number;
  filters: { brokerId?: string; buildingId?: string; listingId?: string; search?: string; status?: string };
}) {
  // Paginação do resultado completo; os filtros são preservados entre páginas.
  const [leadsResult, buildings, listings] = await Promise.all([
    getOrganizationLeads(token, { ...filters, page, limit: 100 }),
    hasOrgWideView ? getOrganizationBuildings(token) : Promise.resolve([]),
    hasOrgWideView ? getOrganizationListings(token) : getMyAssignedListings(token),
  ]);
  const leads = leadsResult.items;
  const brokers = hasOrgWideView
    ? membership.organization.members.filter((m) => m.status === "ACTIVE" && m.role !== "ASSISTANT")
    : [];

  const totalPages = Math.max(1, Math.ceil(leadsResult.total / leadsResult.limit));
  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams({ view: "pipeline", page: String(nextPage) });
    for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
    return `/imobiliaria?${query}`;
  };
  const hasFilters = Boolean(filters.brokerId || filters.buildingId || filters.listingId || filters.search || filters.status);

  return (
    <>
      <StatTiles label="Resumo de todos os resultados filtrados" items={[
        { label: "Oportunidades no resultado", value: leadsResult.total, icon: Sparks, tone: "accent" },
        { label: "Em andamento", value: leadsResult.summary.active, icon: Clock, tone: "blue" },
        { label: "SLA vencido", value: leadsResult.summary.overdue, icon: WarningCircle, tone: "red" },
        { label: "Sem responsável", value: leadsResult.summary.unassigned, icon: UserXmark, tone: "amber" },
      ]} />

      <form action="/imobiliaria" className={styles.filterBar} key={JSON.stringify(filters)}>
        <input type="hidden" name="view" value="pipeline" />
        <div className={styles.searchField}>
          <Search width={18} height={18} aria-hidden="true" />
          <input aria-label="Buscar pelo nome do cliente" type="search" name="search" placeholder="Buscar cliente…" defaultValue={filters.search ?? ""} className={styles.filterInput} />
        </div>
        {hasOrgWideView && <>
          <select aria-label="Corretor responsável" name="brokerId" defaultValue={filters.brokerId ?? ""} className={styles.filterInput}>
            <option value="">Todos os corretores</option>
            {brokers.map((b) => <option key={b.id} value={b.id}>{b.user?.name ?? "Membro"}</option>)}
          </select>
          <select aria-label="Empreendimento" name="buildingId" defaultValue={filters.buildingId ?? ""} className={styles.filterInput}>
            <option value="">Todos os empreendimentos</option>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </>}
        <select name="listingId" aria-label="Imóvel" defaultValue={filters.listingId ?? ""} className={styles.filterInput}><option value="">Todos os imóveis</option>{listings.map(listing => <option key={listing.id} value={listing.id}>{listing.name}</option>)}</select>
        <select name="status" aria-label="Etapa do funil" defaultValue={filters.status ?? ""} className={styles.filterInput}>
          <option value="">Todas as etapas</option>
          {COLUMNS.map((column) => <option key={column.status} value={column.status}>{column.label}</option>)}
        </select>
        <button type="submit" className={`${styles.filterButton} ${styles.filterButtonPrimary}`}>Filtrar</button>
        {hasFilters && <Link href="/imobiliaria?view=pipeline" className={styles.filterButton}>Limpar</Link>}
      </form>

      <div className={styles.resultBar}>
        <p>{leads.length} de {leadsResult.total} oportunidades · Totais por etapa em todos os resultados filtrados</p>
        {(totalPages > 1 || page > 1) && <nav aria-label="Paginação dos leads" className={styles.pagination}>
          {page > 1 && <Link href={pageHref(Math.min(page - 1, totalPages))}>← Anterior</Link>}
          <span>Página {page} de {totalPages}</span>
          {page < totalPages && <Link href={pageHref(page + 1)}>Próxima →</Link>}
        </nav>}
      </div>
      {leadsResult.total === 0 && <p className={styles.emptyNote}>{leadsResult.allTotal === 0 ? "Nenhum lead recebido ainda." : "Nenhum resultado para os filtros selecionados."}</p>}
      <div className={styles.board} role="region" aria-label="Funil de oportunidades, role para ver todas as etapas" tabIndex={0}>
        {COLUMNS.map((column) => {
          const columnLeads = leads.filter((lead) => lead.status === column.status);
          return (
            <div key={column.status} className={styles.column} data-status={column.status} data-tone={STAGE_TONES[column.status]}>
              <div className={styles.columnHeader}>
                <span className={styles.columnTitle}><i aria-hidden="true" />{column.label}</span>
                <span className={styles.columnCount}>{leadsResult.summary.byStatus[column.status] ?? 0}</span>
              </div>

              <div className={styles.columnBody}>
                {columnLeads.length === 0 ? (
                  <p className={styles.columnEmpty}>Nenhum lead aqui.</p>
                ) : (
                  columnLeads.map((lead) => {
                    const currentAssignment = lead.assignments[0];
                    const brokerName = currentAssignment?.broker?.user?.name;
                    return (
                      <div key={lead.id} className={styles.card} data-urgent={lead.status !== "WON" && lead.status !== "LOST" && lead.slaStatus === "OVERDUE"}>
                        <div className={styles.cardTopRow}>
                          <span className={styles.cardPerson}>
                            <span className={styles.cardAvatar} data-tone={avatarTone(lead.user.name)}>{initials(lead.user.name)}</span>
                            <span className={styles.cardCustomer}>{lead.user.name}</span>
                          </span>
                          <SlaBadge status={lead.slaStatus} />
                        </div>
                        <span className={styles.cardListing}><Building width={14} height={14} aria-hidden="true" />{lead.listing.name}</span>
                        {hasOrgWideView && (
                          <span className={styles.cardBroker} data-unassigned={!brokerName}>
                            <User width={14} height={14} aria-hidden="true" />{brokerName ?? "Não atribuído"}
                          </span>
                        )}
                        {lead.tasks[0] && (
                          <span className={styles.cardNextAction}>{formatNextAction(lead.tasks[0])}</span>
                        )}
                        {canManage || !hasOrgWideView ? (
                          <div className={styles.cardSelect}><LeadStatusSelect leadId={lead.id} currentStatus={lead.status} /></div>
                        ) : (
                          <span className={styles.cardBroker}>{STATUS_LABELS[lead.status]}</span>
                        )}
                        <Link href={`/imobiliaria/leads/${lead.id}`} className={styles.cardLink} aria-label={`Ver detalhes de ${lead.user.name}`}>
                          Ver detalhes <ArrowRight width={14} height={14} aria-hidden="true" />
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

async function MetricsView({ token }: { token: string }) {
  const metrics = await getOrganizationMetrics(token);
  const maxFunnel = Math.max(1, ...metrics.funnelCounts.map((f) => f.count));

  return (
    <>
      <StatTiles items={[
        { label: "Leads", value: metrics.totalLeads, icon: Sparks, tone: "accent" },
        { label: "Conversão", value: `${(metrics.conversionRate * 100).toFixed(1)}%`, icon: Percentage, tone: "violet" },
        { label: "Tempo médio de resposta", value: formatHours(metrics.avgResponseHours), icon: Timer, tone: "blue" },
        { label: "Dentro do SLA", value: metrics.slaCompliancePct === null ? "—" : `${metrics.slaCompliancePct.toFixed(0)}%`, icon: Clock, tone: "amber" },
        { label: "Ganhos", value: metrics.wonCount, icon: CheckCircle, tone: "green" },
        { label: "Perdidos", value: metrics.lostCount, icon: XmarkCircle, tone: "slate" },
      ]} />

      <div className={styles.chartsGrid}>
        <LineChart title="Leads por mês" data={metrics.leadsPerMonth} color="#ff385c" format="number" />
      </div>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Funil por etapa</h2>
        <div className={styles.funnelRow}>
          {COLUMNS.map((column) => {
            const count = metrics.funnelCounts.find((f) => f.status === column.status)?.count ?? 0;
            return (
              <div key={column.status} className={styles.funnelTile} data-tone={STAGE_TONES[column.status]}>
                <span className={styles.funnelCount}>{count}</span>
                <span className={styles.funnelLabel}>{STATUS_LABELS[column.status]}</span>
                <span className={styles.funnelBar}><i style={{ width: `${(count / maxFunnel) * 100}%` }} /></span>
              </div>
            );
          })}
        </div>
      </section>

      <div className={styles.brokerTableWrap}>
        <table className={styles.brokerTable}>
          <thead>
            <tr>
              <th>Corretor</th>
              <th>Leads atribuídos</th>
              <th>Ganhos</th>
              <th>Tempo médio de resposta</th>
            </tr>
          </thead>
          <tbody>
            {metrics.byBroker.length === 0 && <tr><td colSpan={4}>Ainda não há dados de corretores para exibir.</td></tr>}
            {metrics.byBroker.map((broker) => (
              <tr key={broker.memberId}>
                <td><span className={styles.cardPerson}><span className={styles.cardAvatar} data-tone={avatarTone(broker.name)}>{initials(broker.name)}</span><strong>{broker.name}</strong></span></td>
                <td>{broker.assignedCount}</td>
                <td><span className={styles.wonPill}>{broker.wonCount}</span></td>
                <td>{formatHours(broker.avgResponseHours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
