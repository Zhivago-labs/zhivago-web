import Link from "next/link";
import type { Metadata } from "next";
import { Sparks, Clock, WarningCircle, UserXmark, Search, ArrowRight, Building, User, Percentage, Timer } from "@/components/icons";
import { requireAuth } from "@/lib/session";
import { getMyOrganization, getOrganizationBuildings, getOrganizationListings, getMyAssignedListings } from "@/lib/organizations-api";
import { getOrganizationLeads, getOrganizationMetricsForPeriod, getLeadAssignees, SOURCE_LABELS } from "@/lib/leads-api";
import { LeadStatusSelect } from "@/components/dashboard/LeadStatusSelect";
import { SlaBadge } from "@/components/dashboard/SlaBadge";
import { LineChart } from "@/components/dashboard/LineChart";
import { avatarTone, initials, STAGE_TONES, fmtHours, pct } from "@/components/workspace/workspace-ui";
import type { Lead, LeadStatus, MetricsCut } from "@zhivago/shared";
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

const formatHours = fmtHours;

function formatNextAction(task: Lead["tasks"][number]): string {
  if (!task.dueAt) return task.title;
  const due = new Date(task.dueAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
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
  searchParams: Promise<{ view?: string; brokerId?: string; buildingId?: string; listingId?: string; search?: string; status?: string; page?: string; unassigned?: string; overdue?: string; source?: string; hideClosed?: string; days?: string }>;
};

export default async function ImobiliariaPipelinePage({ searchParams }: Props) {
  const params = await searchParams;
  const { view: viewParam, brokerId, buildingId, listingId } = params;
  const unassigned = params.unassigned === "true" ? "true" : undefined;
  const overdue = params.overdue === "true" ? "true" : undefined;
  const source = params.source && params.source in SOURCE_LABELS ? params.source : undefined;
  const hideClosed = params.hideClosed === "1" ? "1" : undefined;
  const days = ["7", "30", "90", "180", "365"].includes(params.days ?? "") ? Number(params.days) : 30;
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
        <MetricsView token={token} days={days} />
      ) : (
        <PipelineView
          token={token}
          hasOrgWideView={hasOrgWideView}
          canManage={canManage}
          membership={membership}
          page={page}
          filters={{ brokerId, buildingId, listingId, search, status, unassigned, overdue, source, hideClosed }}
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
  filters: { brokerId?: string; buildingId?: string; listingId?: string; search?: string; status?: string; unassigned?: string; overdue?: string; source?: string; hideClosed?: string };
}) {
  // Paginação do resultado completo; os filtros são preservados entre páginas.
  const { hideClosed, ...apiFilters } = filters;
  const [leadsResult, buildings, listings, assignees] = await Promise.all([
    getOrganizationLeads(token, { ...apiFilters, ...(hideClosed && !filters.status ? { stage: "ACTIVE" } : {}), page, limit: 100 }),
    hasOrgWideView ? getOrganizationBuildings(token) : Promise.resolve([]),
    hasOrgWideView ? getOrganizationListings(token) : getMyAssignedListings(token),
    hasOrgWideView ? getLeadAssignees(token) : Promise.resolve([]),
  ]);
  const leads = leadsResult.items;
  void membership;
  const brokers = assignees.map((a) => ({ id: a.memberId, name: a.name }));
  const visibleColumns = hideClosed ? COLUMNS.filter((c) => c.status !== "WON" && c.status !== "LOST") : COLUMNS;
  const toggleHref = (key: string, value: string | undefined) => {
    const query = new URLSearchParams({ view: "pipeline" });
    for (const [k, v] of Object.entries({ ...filters, [key]: value })) if (v) query.set(k, v);
    return `/imobiliaria?${query}`;
  };

  const totalPages = Math.max(1, Math.ceil(leadsResult.total / leadsResult.limit));
  const pageHref = (nextPage: number) => {
    const query = new URLSearchParams({ view: "pipeline", page: String(nextPage) });
    for (const [key, value] of Object.entries(filters)) if (value) query.set(key, value);
    return `/imobiliaria?${query}`;
  };
  const hasFilters = Boolean(filters.brokerId || filters.buildingId || filters.listingId || filters.search || filters.status || filters.unassigned || filters.overdue || filters.source);

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
            {brokers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
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
        <select name="source" aria-label="Origem" defaultValue={filters.source ?? ""} className={styles.filterInput}>
          <option value="">Todas as origens</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {filters.unassigned && <input type="hidden" name="unassigned" value="true" />}
        {filters.overdue && <input type="hidden" name="overdue" value="true" />}
        {filters.hideClosed && <input type="hidden" name="hideClosed" value="1" />}
        <button type="submit" className={`${styles.filterButton} ${styles.filterButtonPrimary}`}>Filtrar</button>
        {hasFilters && <Link href="/imobiliaria?view=pipeline" className={styles.filterButton}>Limpar</Link>}
      </form>

      <nav className={styles.viewTabs} aria-label="Atalhos de triagem" style={{ marginBottom: 12 }}>
        {hasOrgWideView && <Link href={toggleHref("unassigned", filters.unassigned ? undefined : "true")} className={`${styles.viewTab} ${filters.unassigned ? styles.viewTabActive : ""}`} aria-pressed={!!filters.unassigned}>Sem responsável</Link>}
        <Link href={toggleHref("overdue", filters.overdue ? undefined : "true")} className={`${styles.viewTab} ${filters.overdue ? styles.viewTabActive : ""}`} aria-pressed={!!filters.overdue}>SLA vencido</Link>
        <Link href={toggleHref("hideClosed", filters.hideClosed ? undefined : "1")} className={`${styles.viewTab} ${filters.hideClosed ? styles.viewTabActive : ""}`} aria-pressed={!!filters.hideClosed}>{filters.hideClosed ? "Mostrar ganhos e perdidos" : "Ocultar ganhos e perdidos"}</Link>
      </nav>

      <div className={styles.resultBar}>
        <p>{leads.length} de {leadsResult.total} oportunidades nesta página · Os totais de cada etapa consideram todos os resultados filtrados</p>
        {(totalPages > 1 || page > 1) && <nav aria-label="Paginação dos leads" className={styles.pagination}>
          {page > 1 && <Link href={pageHref(Math.min(page - 1, totalPages))}>← Anterior</Link>}
          <span>Página {page} de {totalPages}</span>
          {page < totalPages && <Link href={pageHref(page + 1)}>Próxima →</Link>}
        </nav>}
      </div>
      {leadsResult.total === 0 && <p className={styles.emptyNote}>{leadsResult.allTotal === 0 ? "Nenhum lead recebido ainda." : "Nenhum resultado para os filtros selecionados."}</p>}
      <div className={styles.board} role="region" aria-label="Funil de oportunidades, role para ver todas as etapas" tabIndex={0}>
        {visibleColumns.map((column) => {
          const columnLeads = leads.filter((lead) => lead.status === column.status);
          return (
            <div key={column.status} className={styles.column} data-status={column.status} data-tone={STAGE_TONES[column.status]}>
              <div className={styles.columnHeader}>
                <span className={styles.columnTitle}><i aria-hidden="true" />{column.label}</span>
                <span className={styles.columnCount}>{leadsResult.summary.byStatus[column.status] ?? 0}</span>
              </div>
              {columnLeads.length > 0 && columnLeads.length < (leadsResult.summary.byStatus[column.status] ?? 0) && (
                <p className={styles.columnEmpty}>Exibindo {columnLeads.length} de {leadsResult.summary.byStatus[column.status]} nesta etapa</p>
              )}

              <div className={styles.columnBody}>
                {columnLeads.length === 0 ? (
                  <p className={styles.columnEmpty}>{(leadsResult.summary.byStatus[column.status] ?? 0) > 0 ? `${leadsResult.summary.byStatus[column.status]} nesta etapa em outras páginas` : "Nenhum lead aqui."}</p>
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

function CutTable({ title, rows }: { title: string; rows: MetricsCut[] }) {
  if (!rows.length) return null;
  return (
    <div className={styles.brokerTableWrap}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <table className={styles.brokerTable}>
        <thead><tr><th>Recorte</th><th>Entradas</th><th>Ganhos</th><th>Perdidos</th><th>Ganho nos encerrados</th><th>Mediana da 1ª resposta</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.label}</td>
              <td>{row.entries}</td>
              <td>{row.won}</td>
              <td>{row.lost}</td>
              <td>{pct(row.winRateClosed)}</td>
              <td>{formatHours(row.medianResponseHours)}{row.respondedCount ? ` (${row.respondedCount})` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function MetricsView({ token, days }: { token: string; days: number }) {
  const metrics = await getOrganizationMetricsForPeriod(token, days);
  const formerBrokers = metrics.formerBrokers ?? [];
  const maxFunnel = Math.max(1, ...metrics.funnelCounts.map((f) => f.count));
  const period = metrics.period;
  const snapshot = metrics.snapshot;
  const sla = metrics.slaHours ?? 4;

  return (
    <>
      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Carteira agora</h2>
        <p>Fotografia do momento, independente do período.</p>
        {snapshot && (
          <StatTiles items={[
            { label: "Em aberto", value: snapshot.open, icon: Sparks, tone: "accent" },
            { label: "Sem responsável (fila)", value: snapshot.unassigned, icon: UserXmark, tone: "amber" },
            { label: "Aguardando 1ª resposta", value: snapshot.awaitingResponse, icon: Clock, tone: "blue" },
            { label: `Sem resposta há mais de ${sla} h`, value: snapshot.overdue, icon: WarningCircle, tone: "red" },
          ]} />
        )}
      </section>

      <form action="/imobiliaria" className={styles.filterBar}>
        <input type="hidden" name="view" value="metricas" />
        <label htmlFor="metrics-days">Período dos resultados</label>
        <select id="metrics-days" name="days" defaultValue={String(days)} className={styles.filterInput}>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="180">Últimos 180 dias</option>
          <option value="365">Últimos 12 meses</option>
        </select>
        <button type="submit" className={`${styles.filterButton} ${styles.filterButtonPrimary}`}>Aplicar</button>
      </form>

      {period && (
        <>
          <StatTiles items={[
            { label: "Entradas no período", value: period.entries, icon: Sparks, tone: "accent" },
            { label: `Ganho nos encerrados (${period.won} de ${period.won + period.lost})`, value: pct(period.winRateClosed), icon: Percentage, tone: "violet" },
            { label: `Mediana da 1ª resposta (${period.response.responded} respondidas)`, value: formatHours(period.response.medianHours), icon: Timer, tone: "blue" },
            { label: "Percentil 90 da 1ª resposta", value: formatHours(period.response.p90Hours), icon: Timer, tone: "blue" },
            { label: `Respondidas em até ${sla} h (${period.response.onTime} de ${period.response.due})`, value: pct(period.response.onTimeRate), icon: Clock, tone: "amber" },
            { label: `Mediana até atribuir (${period.timeToAssignment.assigned} atribuídas)`, value: formatHours(period.timeToAssignment.medianHours), icon: User, tone: "slate" },
          ]} />
          <p className={styles.emptyNote}>
            Entradas = oportunidades criadas no período. Ganho nos encerrados = ganhos ÷ (ganhos + perdidos) encerrados no período.
            O prazo de resposta conta a partir da atribuição; o denominador inclui só atribuições já respondidas ou com prazo vencido.
          </p>

          <section className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Motivos de perda no período</h2>
            {period.lostReasons.length === 0 ? <p>Nenhuma perda registrada no período.</p> : (
              <table className={styles.brokerTable}>
                <thead><tr><th>Motivo</th><th>Oportunidades</th></tr></thead>
                <tbody>{period.lostReasons.map((r) => <tr key={r.reason}><td>{r.label}</td><td>{r.count}</td></tr>)}</tbody>
              </table>
            )}
          </section>

          <CutTable title="Por origem" rows={period.bySource} />
          <CutTable title="Por modalidade" rows={period.byOperationType} />
          <CutTable title="Por responsável" rows={period.byResponsible} />
          <CutTable title="Por empreendimento" rows={period.byBuilding} />
        </>
      )}

      <div className={styles.chartsGrid}>
        <LineChart title="Novos leads · últimos 6 meses" data={metrics.leadsPerMonth} color="#ff385c" format="number" />
      </div>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Funil atual · todas as oportunidades da imobiliária</h2>
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
        <p>
          Histórico completo: {metrics.totalLeads} oportunidades, {metrics.wonCount} ganhas, {metrics.lostCount} perdidas ·
          ganhos ÷ total = {(metrics.conversionRate * 100).toFixed(1)}% (inclui as que ainda estão em aberto).
        </p>
      </section>

      <div className={styles.brokerTableWrap}>
        <h2 className={styles.sectionTitle}>Equipe ativa · carteira atual</h2>
        <p>Em aberto e aguardando resposta são a fotografia de agora. Ganhos consideram a atribuição atual. Tempos de resposta usam todo o histórico de atribuições.</p>
        <table className={styles.brokerTable}>
          <thead>
            <tr><th>Responsável</th><th>Em aberto</th><th>Aguardando resposta</th><th>Ganhos</th><th>Mediana da 1ª resposta</th><th>Recebendo</th></tr>
          </thead>
          <tbody>
            {metrics.byBroker.length === 0 && <tr><td colSpan={6}>Ainda não há dados de corretores para exibir.</td></tr>}
            {metrics.byBroker.map((broker) => (
              <tr key={broker.memberId}>
                <td><span className={styles.cardPerson}><span className={styles.cardAvatar} data-tone={avatarTone(broker.name)}>{initials(broker.name)}</span><strong>{broker.name}</strong></span></td>
                <td>{broker.openCount ?? broker.assignedCount}</td>
                <td>{broker.awaitingResponse ?? "—"}</td>
                <td><span className={styles.wonPill}>{broker.wonCount}</span></td>
                <td>{formatHours(broker.medianResponseHours ?? broker.avgResponseHours)}</td>
                <td>{broker.receiveLeads === false ? "Pausado" : "Sim"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {formerBrokers.length > 0 && (
          <details>
            <summary>Ex-membros com atribuições · todo o histórico ({formerBrokers.length})</summary>
            <table className={styles.brokerTable}>
              <thead><tr><th>Ex-membro</th><th>Atribuições recebidas</th><th>Tempo médio de resposta</th></tr></thead>
              <tbody>{formerBrokers.map((broker) => (
                <tr key={broker.memberId}><td>{broker.name}</td><td>{broker.assignmentCount}</td><td>{formatHours(broker.avgResponseHours)}</td></tr>
              ))}</tbody>
            </table>
          </details>
        )}
      </div>
    </>
  );
}
