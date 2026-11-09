import Link from "next/link";
import { Sparks, Group, Clock, Building, InfoCircle, NavArrowRight, ArrowRight, Calendar, Eye, ChatBubble, GraphUp } from "iconoir-react";
import { requireWorkspace, workspaceFetch } from "@/lib/workspace";
import type { WorkspaceOverview } from "@/lib/workspace-types";
import { avatarTone, initials } from "@/components/workspace/workspace-ui";
import styles from "@/components/workspace/Workspace.module.css";
export const metadata = { title: "Início da imobiliária" };

function DateBadge({ value, tone }: { value: string; tone: string }) {
  const date = new Date(value);
  return <span className={styles.dateBadge} data-tone={tone}><b>{date.toLocaleDateString("pt-BR", { day: "2-digit" })}</b><small>{date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</small></span>;
}

export default async function WorkspaceHome({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { token } = await requireWorkspace();
  const params = await searchParams;
  const days = ["7", "30", "90"].includes(params.days || "") ? params.days! : "30";
  const data = await workspaceFetch<WorkspaceOverview>(token, `/organizations/workspace?days=${days}`);
  const metrics = [
    { value: data.newLeads, label: "Novas oportunidades no período", icon: Sparks, tone: "accent" },
    { value: data.uniqueContacts, label: "Pessoas com novas oportunidades", icon: Group, tone: "blue" },
    { value: data.pendingCount, label: "Atendimentos pendentes agora", icon: Clock, tone: "amber" },
    { value: data.published, label: "Imóveis publicados agora", icon: Building, tone: "green" },
  ];
  const maxViews = Math.max(1, ...data.topListings.map((listing) => listing.viewCount));
  const maxContacts = Math.max(1, ...data.topContactListings.map((listing) => listing._count.leads));
  const trend = Object.entries(data.trend).sort(([a], [b]) => a.localeCompare(b));
  const maxTrend = Math.max(1, ...trend.map(([, count]) => count));
  const formatDay = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });

  return <main className={styles.page}>
    <div className={styles.header}>
      <div><h1>Visão geral</h1><p className={styles.muted}>{data.scope === "organization" ? "Operação de toda a imobiliária" : "Seus imóveis e oportunidades atribuídos"} · Dados reais de atendimento</p></div>
      <form className={styles.filters} style={{ margin: 0 }}><label htmlFor="period">Período</label><select id="period" name="days" defaultValue={days}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select><button>Aplicar</button></form>
    </div>

    <div className={styles.metrics}>
      {metrics.map(({ value, label, icon: Icon, tone }) => <div className={styles.metric} data-tone={tone} key={label}><span className={styles.metricIcon}><Icon width={20} height={20} aria-hidden="true" /></span><div><strong>{value}</strong><span>{label}</span></div></div>)}
    </div>

    <div className={styles.note}><InfoCircle width={18} height={18} aria-hidden="true" /><div>
      <p><strong>Oportunidade</strong> = um cliente interessado em um imóvel. <strong>Pendentes</strong> = oportunidades abertas novas ou sem responsável, em todo o histórico. <strong>Publicados</strong> = anúncios aprovados disponíveis.</p>
      <p>Primeiro atendimento registrado: <strong>{data.contactedRate === null ? "sem dados no período" : `${(data.contactedRate * 100).toFixed(1)}% das novas oportunidades`}</strong>. Esse indicador mede atendimento, não receita nem conversão de visualizações em contatos.</p>
    </div></div>

    <div className={styles.sections}>
      <section className={styles.panel}>
        <div className={styles.panelHead}><div><span className={styles.metricIcon} data-tone="amber"><Clock width={18} height={18} aria-hidden="true" /></span><h2>Aguardando atendimento</h2></div><span className={styles.count} data-tone="amber">{data.pending.length}</span></div>
        {data.pending.length ? <ul className={styles.rows}>{data.pending.map(lead => <li key={lead.id}><Link href={`/imobiliaria/leads/${lead.id}`} className={styles.row}><span className={styles.avatar} data-tone={avatarTone(lead.user.name)}>{initials(lead.user.name)}</span><span className={styles.rowText}><strong>{lead.user.name}</strong><span>{lead.listing.name}</span></span><NavArrowRight width={18} height={18} aria-hidden="true" /></Link></li>)}</ul> : <p className={styles.empty}>Nenhum atendimento pendente.</p>}
        <div className={styles.panelFoot}><Link href="/imobiliaria" className={styles.linkAction}>Abrir Kanban <ArrowRight width={16} height={16} aria-hidden="true" /></Link></div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}><div><span className={styles.metricIcon} data-tone="blue"><Calendar width={18} height={18} aria-hidden="true" /></span><h2>Próximas visitas</h2></div><span className={styles.count} data-tone="blue">{data.visits.length}</span></div>
        {data.visits.length ? <ul className={styles.rows}>{data.visits.map(visit => <li key={visit.id}><Link href={`/imobiliaria/leads/${visit.lead.id}`} className={styles.row}><DateBadge value={visit.scheduledAt} tone="blue" /><span className={styles.rowText}><strong>{visit.lead.user.name}</strong><span>{visit.lead.listing.name} · {new Date(visit.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></span><NavArrowRight width={18} height={18} aria-hidden="true" /></Link></li>)}</ul> : <p className={styles.empty}>Nenhuma visita agendada.</p>}
        {data.hasSeason && <>
          <div className={styles.panelHead} style={{ marginTop: 18 }}><div><span className={styles.metricIcon} data-tone="violet"><Calendar width={18} height={18} aria-hidden="true" /></span><h2>Próximas reservas</h2></div><span className={styles.count} data-tone="violet">{data.upcomingBookings.length}</span></div>
          {data.upcomingBookings.length ? <ul className={styles.rows}>{data.upcomingBookings.map(booking => <li key={booking.id}><Link href="/empresa/reservas" className={styles.row}><DateBadge value={booking.startDate} tone="violet" /><span className={styles.rowText}><strong>{booking.user.name}</strong><span>{booking.listing.name}</span></span><NavArrowRight width={18} height={18} aria-hidden="true" /></Link></li>)}</ul> : <p className={styles.empty}>Nenhuma próxima reserva.</p>}
          <div className={styles.panelFoot}><Link href="/empresa/reservas" className={styles.linkAction}>Consultar reservas de temporada <ArrowRight width={16} height={16} aria-hidden="true" /></Link></div>
        </>}
      </section>
    </div>

    <div className={styles.sections}>
      <section className={styles.panel}>
        <div className={styles.panelHead}><div><span className={styles.metricIcon} data-tone="accent"><Eye width={18} height={18} aria-hidden="true" /></span><div><h2>Imóveis com mais visualizações</h2><p>Visualizações e oportunidades acumuladas em todo o histórico.</p></div></div></div>
        {data.topListings.length ? <ul className={styles.rows}>{data.topListings.map((listing, index) => <li key={listing.id}><Link href="/empresa/imoveis" className={styles.row}><span className={styles.rank}>{index + 1}</span><span className={styles.rowText}><strong>{listing.name}</strong><span className={styles.bar}><i style={{ width: `${(listing.viewCount / maxViews) * 100}%` }} /></span></span><span className={styles.stat}><b>{listing.viewCount}</b>{listing.viewCount === 1 ? "visualização" : "visualizações"} · {listing._count.leads} {listing._count.leads === 1 ? "oportunidade" : "oportunidades"}</span></Link></li>)}</ul> : <p className={styles.empty}>Nenhum imóvel disponível neste escopo.</p>}
        <p className={styles.muted} style={{ marginTop: 10, fontSize: 12 }}>O sistema não registra o histórico diário de visualizações.</p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}><div><span className={styles.metricIcon} data-tone="blue"><ChatBubble width={18} height={18} aria-hidden="true" /></span><div><h2>Imóveis com mais contatos</h2><p>Clientes interessados por imóvel, em todo o histórico.</p></div></div></div>
        {data.topContactListings.length ? <ul className={styles.rows}>{data.topContactListings.map((listing, index) => <li key={listing.id}><Link href="/empresa/imoveis" className={styles.row}><span className={styles.rank}>{index + 1}</span><span className={styles.rowText}><strong>{listing.name}</strong><span className={styles.bar}><i style={{ width: `${(listing._count.leads / maxContacts) * 100}%`, background: "linear-gradient(90deg,#2563eb,#60a5fa)" }} /></span></span><span className={styles.stat}><b>{listing._count.leads}</b>{listing._count.leads === 1 ? "contato" : "contatos"}</span></Link></li>)}</ul> : <p className={styles.empty}>Nenhum imóvel neste escopo.</p>}
        <p className={styles.muted} style={{ marginTop: 10, fontSize: 12 }}>Um cliente com dois imóveis conta uma vez em cada imóvel.</p>
      </section>
    </div>

    <section className={styles.panel}>
      <div className={styles.panelHead}><div><span className={styles.metricIcon} data-tone="green"><GraphUp width={18} height={18} aria-hidden="true" /></span><h2>Evolução das novas oportunidades</h2></div></div>
      {trend.length ? <>
        <div className={styles.chart} role="list" aria-label="Novas oportunidades por dia">{trend.map(([date, count]) => <div className={styles.chartCol} key={date} role="listitem" aria-label={`${formatDay(date)}: ${count} ${count === 1 ? "oportunidade" : "oportunidades"}`}><b aria-hidden="true">{count}</b><i style={{ height: `calc((100% - 24px) * ${count / maxTrend})` }} /></div>)}</div>
        <div className={styles.chartLabels} aria-hidden="true">{trend.map(([date]) => <span key={date}>{formatDay(date)}</span>)}</div>
      </> : <p className={styles.empty}>Nenhuma nova oportunidade neste período.</p>}
    </section>
  </main>;
}
