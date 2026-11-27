import Link from "next/link";
import type { Metadata } from "next";
import { ChatBubble, Phone, Mail } from "iconoir-react";
import { requireAuth } from "@/lib/session";
import { safeRedirectTarget } from "@/lib/safe-redirect";
import { getLeadDetail, getLeadAssignees, getTransferImpact, SOURCE_LABELS, OPERATION_LABELS } from "@/lib/leads-api";
import { TransferLeadForm } from "@/components/dashboard/TransferLeadForm";
import { LeadStatusSelect } from "@/components/dashboard/LeadStatusSelect";
import { ReopenLeadForm } from "@/components/dashboard/ReopenLeadForm";
import { AddInteractionForm } from "@/components/dashboard/AddInteractionForm";
import { ScheduleVisitForm } from "@/components/dashboard/ScheduleVisitForm";
import { VisitStatusSelect } from "@/components/dashboard/VisitStatusSelect";
import { AddTaskForm } from "@/components/dashboard/AddTaskForm";
import { TaskCompleteToggle } from "@/components/dashboard/TaskCompleteToggle";
import { ClaimLeadButton } from "@/components/dashboard/ClaimLeadButton";
import { SlaBadge } from "@/components/dashboard/SlaBadge";
import { STAGE_LABELS, fmtDate, fmtDateTime, fmtHours } from "@/components/workspace/workspace-ui";
import type { LeadTimelineEvent } from "@zhivago/shared";
import styles from "./page.module.css";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string; events?: string }> };

export const metadata: Metadata = { title: "Oportunidade" };

const MANAGE_ROLES = ["OWNER", "ADMIN", "MANAGER"];

const VISIT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  NO_SHOW: "Não compareceu",
};

const EVENT_FILTERS: { key: string; label: string; kinds: LeadTimelineEvent["kind"][] }[] = [
  { key: "all", label: "Tudo", kinds: [] },
  { key: "contact", label: "Contatos", kinds: ["INTERACTION"] },
  { key: "stage", label: "Etapas", kinds: ["STATUS"] },
  { key: "owner", label: "Responsáveis", kinds: ["ASSIGNMENT", "UNASSIGNMENT"] },
  { key: "work", label: "Tarefas e visitas", kinds: ["TASK", "TASK_DONE", "VISIT"] },
  { key: "entry", label: "Entradas", kinds: ["ENTRY"] },
];

export default async function LeadDetailPage({ params, searchParams }: Params) {
  const { id } = await params;
  const query = await searchParams;
  const back = safeRedirectTarget(query.back, "/imobiliaria");
  const { token } = await requireAuth(`/imobiliaria/leads/${id}`);

  const lead = await getLeadDetail(token, id);
  if (!lead) {
    return (
      <main className={styles.main}>
        <Link href={back} className={styles.backLink}>← Voltar</Link>
        <p className={styles.restricted}>Esta oportunidade não existe ou você não tem permissão para vê-la.</p>
      </main>
    );
  }

  const role = lead.viewer.role;
  const canManage = MANAGE_ROLES.includes(role);
  const currentAssignment = lead.assignmentHistory.find((a) => a.unassignedAt === null) ?? null;
  // ASSISTANT lê tudo sem editar; BROKER só mexe no que é seu — mesma regra do backend.
  const isMine = currentAssignment?.brokerId === lead.viewer.memberId;
  const canMutate = canManage || (role === "BROKER" && isMine);
  const closed = lead.status === "WON" || lead.status === "LOST";
  const [assignees, impact] = canManage
    ? await Promise.all([getLeadAssignees(token), currentAssignment ? getTransferImpact(token, lead.id) : Promise.resolve(null)])
    : [[], null];
  const me = assignees.find((a) => a.memberId === lead.viewer.memberId);
  const taskMembers = assignees.map((a) => ({ memberId: a.memberId, name: a.name }));

  const pendingTask = lead.tasks.find((t) => !t.completedAt) ?? null;
  const nextVisit = lead.visits.find((v) => new Date(v.scheduledAt) > new Date() && ["SCHEDULED", "CONFIRMED"].includes(v.status)) ?? null;
  const filter = EVENT_FILTERS.find((f) => f.key === query.events) ?? EVENT_FILTERS[0]!;
  const events = filter.kinds.length ? lead.timeline.filter((e) => filter.kinds.includes(e.kind)) : lead.timeline;
  const here = (events?: string) => `/imobiliaria/leads/${lead.id}?${new URLSearchParams({ ...(query.back ? { back } : {}), ...(events && events !== "all" ? { events } : {}) })}`;
  const responseHours = currentAssignment?.firstContactAt
    ? (new Date(currentAssignment.firstContactAt).getTime() - new Date(currentAssignment.assignedAt).getTime()) / 3_600_000
    : null;

  return (
    <main className={styles.main}>
      <Link href={back} className={styles.backLink}>← Voltar</Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{lead.user.name}</h1>
          <p className={styles.subtitle}>
            <a href={`mailto:${lead.user.email}`}><Mail width={14} height={14} aria-hidden="true" /> {lead.user.email}</a>
            {" · "}
            {lead.user.phone ? <a href={`tel:${lead.user.phone.replace(/[^+\d]/g, "")}`}><Phone width={14} height={14} aria-hidden="true" /> {lead.user.phone}</a> : "Sem telefone"}
          </p>
        </div>
        <div className={styles.headerActions}>
          <SlaBadge status={lead.slaStatus} hideOnTime={false} />
          {canMutate && !closed ? <LeadStatusSelect leadId={lead.id} currentStatus={lead.status} /> : <span className={styles.plain}>{STAGE_LABELS[lead.status] ?? lead.status}</span>}
        </div>
      </div>

      <dl className={styles.facts}>
        <div><dt>Imóvel</dt><dd><Link href={`/imovel/${lead.listing.id}`} className={styles.listingLink} style={{ margin: 0 }}>{lead.listing.name}</Link></dd></div>
        <div><dt>Modalidade</dt><dd>{OPERATION_LABELS[lead.listing.operationType] ?? lead.listing.operationType}{lead.listing.building ? ` · ${lead.listing.building.name}` : ""}</dd></div>
        <div><dt>Origem</dt><dd>{SOURCE_LABELS[lead.source] ?? lead.source} · entrada {fmtDate(lead.createdAt)}</dd></div>
        <div><dt>Responsável</dt><dd>{currentAssignment?.broker?.user?.name ?? "Sem responsável"}</dd></div>
        <div><dt>Como foi definido</dt><dd>{lead.routing.label}{lead.routing.assignedAt ? ` · ${fmtDateTime(lead.routing.assignedAt)}` : ""}</dd></div>
        <div><dt>1ª resposta</dt><dd>{responseHours !== null ? `${fmtHours(responseHours)} após a atribuição` : currentAssignment ? "Ainda não respondida" : "—"}</dd></div>
        <div><dt>Próxima ação</dt><dd>{nextVisit ? `Visita ${fmtDateTime(nextVisit.scheduledAt)}` : pendingTask ? `${pendingTask.title}${pendingTask.dueAt ? ` · ${fmtDateTime(pendingTask.dueAt)}` : ""}` : "Nenhuma"}</dd></div>
        {(lead.bookings.length > 0 || lead.negotiations.length > 0) && (
          <div><dt>Reserva / negociação</dt><dd>{[...lead.bookings.map((b) => `Reserva ${fmtDate(b.startDate)} (${b.status})`), ...lead.negotiations.map((n) => `Negociação ${n.status}`)].join(" · ")}</dd></div>
        )}
      </dl>

      <div className={styles.actionsRow}>
        {lead.conversation ? (
          <Link href={`/empresa/mensagens?openChat=${lead.conversation.id}`} className={styles.actionLink}><ChatBubble width={16} height={16} aria-hidden="true" />Abrir conversa{lead.conversation.isClosed ? " (encerrada)" : ""}</Link>
        ) : lead.hasConversation ? (
          <span className={styles.plain} title="A conversa é acessível ao responsável atual">Conversa com o responsável atual</span>
        ) : null}
        <Link href={`/empresa/contatos/${lead.user.id}?back=${encodeURIComponent(here())}`} className={styles.actionLink}>Ficha do contato</Link>
        {canManage && !currentAssignment && !closed && me?.eligible && <ClaimLeadButton leadId={lead.id} />}
      </div>

      {closed && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Desfecho</h2>
          <div className={styles.closedBox}>
            <strong>{lead.status === "WON" ? "Ganho" : "Perdido"}</strong>
            {lead.closedAt ? ` em ${fmtDateTime(lead.closedAt)}` : ""}
            {lead.closedByName ? ` por ${lead.closedByName}` : lead.closedAt ? " (automático)" : ""}
            {lead.status === "LOST" && <p className={styles.plain}>Motivo: {lead.lostReasonLabel ?? "Motivo não registrado"}{lead.lostNote ? ` — ${lead.lostNote}` : ""}</p>}
          </div>
          {canMutate && <ReopenLeadForm leadId={lead.id} />}
        </section>
      )}

      {canManage && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{currentAssignment ? "Transferir" : "Atribuir responsável"}</h2>
          <TransferLeadForm leadId={lead.id} currentBrokerMemberId={currentAssignment?.brokerId ?? null} assignees={assignees} impact={impact} />
        </section>
      )}

      {canMutate && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Registrar contato</h2>
          <AddInteractionForm leadId={lead.id} />
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tarefas / próxima ação</h2>
        {canMutate && <AddTaskForm leadId={lead.id} members={taskMembers} />}
        <div className={styles.timeline}>
          {lead.tasks.length === 0 ? (
            <p className={styles.empty}>Nenhuma tarefa criada ainda.</p>
          ) : (
            lead.tasks.map((task) => (
              <div key={task.id} className={styles.timelineItem}>
                <span className={styles.timelineType} style={task.completedAt ? { textDecoration: "line-through" } : undefined}>{task.title}</span>
                <span className={styles.timelineMeta}>
                  {task.dueAt ? fmtDateTime(task.dueAt) : "Sem prazo"} · {task.completedAt ? "Concluída" : "Pendente"} · criada por {task.member?.user?.name ?? "—"}
                  {task.assignee?.user?.name ? ` · para ${task.assignee.user.name}` : ""}
                </span>
                {canMutate && <TaskCompleteToggle taskId={task.id} leadId={lead.id} completed={!!task.completedAt} />}
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Visitas</h2>
        {canMutate && currentAssignment && <ScheduleVisitForm leadId={lead.id} />}
        {canMutate && !currentAssignment && <p className={styles.empty}>Atribua um responsável para agendar visitas.</p>}
        <div className={styles.timeline}>
          {lead.visits.length === 0 ? (
            <p className={styles.empty}>Nenhuma visita agendada ainda.</p>
          ) : (
            lead.visits.map((visit) => (
              <div key={visit.id} className={styles.timelineItem}>
                <span className={styles.timelineType}>{fmtDateTime(visit.scheduledAt)}</span>
                {visit.notes && <p className={styles.timelineContent}>{visit.notes}</p>}
                <span className={styles.timelineMeta}>Responsável: {visit.broker?.user?.name ?? "—"} · {VISIT_STATUS_LABELS[visit.status]}</span>
                {canMutate && <VisitStatusSelect visitId={visit.id} leadId={lead.id} currentStatus={visit.status} />}
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Linha do tempo</h2>
        <nav className={styles.filterTabs} aria-label="Filtrar eventos">
          {EVENT_FILTERS.map((f) => <Link key={f.key} href={here(f.key)} aria-current={filter.key === f.key ? "page" : undefined} scroll={false}>{f.label}</Link>)}
        </nav>
        <div className={styles.timeline}>
          {events.length === 0 ? (
            <p className={styles.empty}>Nenhum evento neste filtro.</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className={styles.timelineItem}>
                <span className={styles.timelineType}>{event.kind === "VISIT" ? event.title.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/, (iso) => fmtDateTime(iso)) : event.title}</span>
                {event.detail && <p className={styles.timelineContent}>{event.kind === "STATUS" ? event.detail.replace(/(NEW|CONTACTED|QUALIFIED|VISIT_SCHEDULED|PROPOSAL|NEGOTIATION|WON|LOST)/g, (code) => STAGE_LABELS[code] ?? code) : event.detail}</p>}
                <span className={styles.timelineMeta}>{event.actor ? `${event.actor} · ` : ""}{fmtDateTime(event.at)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
