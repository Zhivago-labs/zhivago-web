import Link from "next/link";
import { Search, Mail, Phone, ChatBubble, Group, Filter } from "@/components/icons";
import { requireWorkspace, workspaceFetch } from "@/lib/workspace";
import type { ContactOpportunity, WorkspaceContacts } from "@/lib/workspace-types";
import { getOrganizationBuildings, getOrganizationListings, getMyAssignedListings } from "@/lib/organizations-api";
import { getLeadAssignees, SOURCE_LABELS, LOST_REASON_LABELS, OPERATION_LABELS } from "@/lib/leads-api";
import { avatarTone, initials, STAGE_LABELS, STAGE_TONES, fmtAge, fmtDate, fmtDateTime } from "@/components/workspace/workspace-ui";
import { SlaBadge } from "@/components/dashboard/SlaBadge";
import { RegisterLeadForm } from "@/components/dashboard/RegisterLeadForm";
import styles from "@/components/workspace/Workspace.module.css";

export const metadata = { title: "Contatos da imobiliária" };

const BROAD = ["OWNER", "ADMIN", "MANAGER", "ASSISTANT"];
const STAGE_TABS = [
  { key: "ALL", label: "Todos" },
  { key: "NEW", label: "Novos" },
  { key: "OPEN", label: "Em andamento" },
  { key: "WON", label: "Ganhos" },
  { key: "LOST", label: "Perdidos" },
] as const;
const FILTER_KEYS = ["search", "stage", "status", "source", "operationType", "brokerId", "unassigned", "buildingId", "lostReason", "from", "to", "sort", "view", "page"] as const;
type Params = Partial<Record<(typeof FILTER_KEYS)[number], string>>;

// Datas do filtro chegam como AAAA-MM-DD (dia em Brasília) → ISO com fuso explícito.
const dayStart = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00-03:00`).toISOString() : undefined);
const dayEnd = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T23:59:59.999-03:00`).toISOString() : undefined);

function OpportunityLine({ opp, back }: { opp: ContactOpportunity; back: string }) {
  return (
    <li className={styles.chip}>
      <Link href={`/imobiliaria/leads/${opp.id}?back=${encodeURIComponent(back)}`}>{opp.listing.name}</Link>
      <span className={styles.badge} data-tone={STAGE_TONES[opp.status] ?? "slate"}>{STAGE_LABELS[opp.status] ?? opp.status}</span>
      <span className={styles.muted} style={{ fontSize: 12 }}>
        {opp.broker?.name ?? "Sem responsável"} · {SOURCE_LABELS[opp.source] ?? opp.source}
        {opp.status === "LOST" && ` · ${opp.lostReason ? LOST_REASON_LABELS[opp.lostReason] ?? opp.lostReason : "Motivo não registrado"}`}
        {opp.nextAction && ` · próxima: ${opp.nextAction.title}${opp.nextAction.at ? ` (${fmtDateTime(opp.nextAction.at)})` : ""}`}
      </span>
      <SlaBadge status={opp.slaStatus} />
      {opp.conversationId && (
        <Link href={`/empresa/mensagens?openChat=${opp.conversationId}`} className={styles.linkAction} style={{ marginLeft: "auto", fontSize: 12 }}>
          <ChatBubble width={15} height={15} aria-hidden="true" />Abrir conversa
        </Link>
      )}
    </li>
  );
}

function Channels({ email, phone }: { email: string; phone: string | null }) {
  return (
    <>
      <a className={styles.channel} href={`mailto:${email}`}><Mail width={16} height={16} aria-hidden="true" />{email}</a>
      {phone
        ? <a className={styles.channel} href={`tel:${phone.replace(/[^+\d]/g, "")}`}><Phone width={16} height={16} aria-hidden="true" />{phone}</a>
        : <span className={styles.channel} style={{ color: "var(--muted)" }}><Phone width={16} height={16} aria-hidden="true" />Sem telefone</span>}
    </>
  );
}

export default async function Contacts({ searchParams }: { searchParams: Promise<Params> }) {
  const { token, membership } = await requireWorkspace("/empresa/contatos");
  const params = await searchParams;
  const broad = BROAD.includes(membership.role);
  const view = params.view === "opportunities" ? "opportunities" : "people";
  const stage = STAGE_TABS.some((t) => t.key === params.stage) ? params.stage! : "ALL";
  const page = Math.max(1, Math.floor(Number(params.page) || 1));

  // Estado da tela vive na URL: voltar da ficha preserva visão, filtros e página.
  const state = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = params[key]?.slice(0, 120);
    if (value) state.set(key, value);
  }
  const api = new URLSearchParams({ view, page: String(page), stage });
  for (const key of ["search", "status", "source", "operationType", "brokerId", "unassigned", "buildingId", "lostReason", "sort"] as const) {
    if (params[key]) api.set(key, params[key]!.slice(0, 120));
  }
  if (dayStart(params.from)) api.set("from", dayStart(params.from)!);
  if (dayEnd(params.to)) api.set("to", dayEnd(params.to)!);

  const [data, assignees, buildings, listings] = await Promise.all([
    workspaceFetch<WorkspaceContacts>(token, `/organizations/contacts?${api}`).catch(() => null),
    broad ? getLeadAssignees(token) : Promise.resolve([]),
    broad ? getOrganizationBuildings(token).catch(() => []) : Promise.resolve([]),
    (broad ? getOrganizationListings(token) : getMyAssignedListings(token)).catch(() => []),
  ]);

  const href = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(state);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in changes)) next.delete("page");
    const q = next.toString();
    return `/empresa/contatos${q ? `?${q}` : ""}`;
  };
  const back = `/empresa/contatos${state.toString() ? `?${state}` : ""}`;
  const advanced = ["status", "source", "operationType", "brokerId", "unassigned", "buildingId", "lostReason", "from", "to"].some((k) => params[k as keyof Params]);
  const canRegister = membership.role !== "ASSISTANT";

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Contatos</h1>
          <p className={styles.muted}>
            {broad ? "Todas as pessoas e oportunidades da imobiliária" : "As pessoas e oportunidades da sua carteira atual"} — novas, em andamento, ganhas e perdidas.
          </p>
        </div>
        {canRegister && <RegisterLeadForm listings={listings.map((l) => ({ id: l.id, name: l.name }))} canChooseSelf={broad} />}
      </div>

      <nav className={styles.tabs} aria-label="Visão">
        <Link href={href({ view: undefined })} aria-current={view === "people" ? "page" : undefined}>Pessoas{data && <span>{data.peopleTotal}</span>}</Link>
        <Link href={href({ view: "opportunities" })} aria-current={view === "opportunities" ? "page" : undefined}>Oportunidades{data && <span>{data.opportunityTotal}</span>}</Link>
      </nav>

      <form className={`${styles.filters} ${styles.toolbar}`} action="/empresa/contatos">
        {view === "opportunities" && <input type="hidden" name="view" value="opportunities" />}
        {stage !== "ALL" && <input type="hidden" name="stage" value={stage} />}
        <div className={styles.searchField}>
          <Search width={18} height={18} aria-hidden="true" />
          <input type="search" name="search" aria-label="Buscar por nome, e-mail, telefone ou imóvel" placeholder="Nome, e-mail, telefone ou imóvel" defaultValue={params.search ?? ""} />
        </div>
        <select name="sort" aria-label="Ordenar por" defaultValue={params.sort ?? "activity"}>
          <option value="activity">Atividade mais recente</option>
          <option value="name">Nome</option>
          <option value="created">Data de entrada</option>
          {view === "opportunities" && <option value="nextAction">Próxima ação</option>}
          {view === "opportunities" && <option value="waiting">Tempo sem resposta</option>}
        </select>
        <details open={advanced} style={{ flexBasis: "100%" }}>
          <summary className={styles.secondary} style={{ display: "inline-flex", width: "fit-content" }}><Filter width={16} height={16} aria-hidden="true" />Filtros{advanced ? " (ativos)" : ""}</summary>
          <div className={styles.filters} style={{ marginTop: 10 }}>
            <select name="status" aria-label="Etapa" defaultValue={params.status ?? ""}>
              <option value="">Qualquer etapa</option>
              {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select name="source" aria-label="Origem" defaultValue={params.source ?? ""}>
              <option value="">Qualquer origem</option>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select name="operationType" aria-label="Modalidade" defaultValue={params.operationType ?? ""}>
              <option value="">Qualquer modalidade</option>
              {Object.entries(OPERATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {broad && (
              <select name="brokerId" aria-label="Responsável" defaultValue={params.brokerId ?? ""}>
                <option value="">Qualquer responsável</option>
                {assignees.map((a) => <option key={a.memberId} value={a.memberId}>{a.name}</option>)}
              </select>
            )}
            {broad && (
              <select name="unassigned" aria-label="Sem responsável" defaultValue={params.unassigned ?? ""}>
                <option value="">Com ou sem responsável</option>
                <option value="true">Só sem responsável</option>
              </select>
            )}
            {broad && buildings.length > 0 && (
              <select name="buildingId" aria-label="Empreendimento" defaultValue={params.buildingId ?? ""}>
                <option value="">Qualquer empreendimento</option>
                {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            {(stage === "LOST" || params.status === "LOST") && (
              <select name="lostReason" aria-label="Motivo da perda" defaultValue={params.lostReason ?? ""}>
                <option value="">Qualquer motivo</option>
                {Object.entries(LOST_REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            )}
            <label htmlFor="from">Entrada de</label>
            <input id="from" type="date" name="from" defaultValue={params.from ?? ""} />
            <label htmlFor="to">até</label>
            <input id="to" type="date" name="to" defaultValue={params.to ?? ""} />
          </div>
        </details>
        <button type="submit">Aplicar</button>
        {state.toString() && <Link href={view === "opportunities" ? "/empresa/contatos?view=opportunities" : "/empresa/contatos"} className={styles.secondary}>Limpar</Link>}
      </form>

      <nav className={styles.tabs} aria-label="Situação">
        {STAGE_TABS.map((t) => (
          <Link key={t.key} href={href({ stage: t.key === "ALL" ? undefined : t.key })} aria-current={stage === t.key ? "page" : undefined}>{t.label}</Link>
        ))}
      </nav>

      {!data ? (
        <div className={styles.emptyState} role="alert">
          <Group aria-hidden="true" />
          <strong>Não foi possível carregar os contatos</strong>
          <span>Verifique a conexão e tente de novo.</span>
          <Link href={back} className={styles.secondary}>Tentar novamente</Link>
        </div>
      ) : (
        <>
          <p className={styles.resultCount} role="status">
            {data.peopleTotal} {data.peopleTotal === 1 ? "pessoa" : "pessoas"} · {data.opportunityTotal} {data.opportunityTotal === 1 ? "oportunidade" : "oportunidades"} nos filtros
          </p>
          {data.items.length === 0 ? (
            <div className={styles.emptyState}>
              <Group aria-hidden="true" />
              <strong>{state.toString() ? "Nenhum resultado para estes filtros" : "Nenhum contato ainda"}</strong>
              <span>{state.toString() ? "Ajuste a busca ou limpe os filtros." : "Os clientes que demonstrarem interesse nos seus imóveis aparecem aqui."}</span>
            </div>
          ) : data.view === "people" ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Pessoa</th><th>Canais</th><th>Oportunidades e etapas</th><th>Última atividade</th><th>Ações</th></tr></thead>
                <tbody>
                  {data.items.map((person) => (
                    <tr key={person.id}>
                      <td>
                        <div className={styles.property}>
                          <span className={styles.avatar} data-tone={avatarTone(person.name)}>{initials(person.name)}</span>
                          <div><strong>{person.name}</strong><p className={styles.muted} style={{ fontSize: 12 }}>Desde {fmtDate(person.firstEntryAt)}</p></div>
                        </div>
                      </td>
                      <td data-label="Canais"><Channels email={person.email} phone={person.phone} /></td>
                      <td data-label="Oportunidades">
                        <details>
                          <summary style={{ cursor: "pointer" }}>
                            {person.visibleOpportunities} · {Object.entries(person.stages).map(([s, n]) => `${n > 1 ? `${n} ` : ""}${STAGE_LABELS[s] ?? s}`).join(", ")}
                            {person.matchedOpportunities < person.visibleOpportunities && <span className={styles.muted}> ({person.matchedOpportunities} no filtro)</span>}
                          </summary>
                          <ul className={styles.chips} style={{ listStyle: "none", marginTop: 8 }}>
                            {person.opportunities.map((opp) => <OpportunityLine key={opp.id} opp={opp} back={back} />)}
                          </ul>
                        </details>
                      </td>
                      <td data-label="Última atividade">{fmtDateTime(person.lastActivityAt)}<p className={styles.muted} style={{ fontSize: 12 }}>{fmtAge(person.lastActivityAt)}</p></td>
                      <td data-label="Ações"><Link className={styles.linkAction} href={`/empresa/contatos/${person.id}?back=${encodeURIComponent(back)}`}>Ver ficha</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Cliente e imóvel</th><th>Etapa</th><th>Responsável e origem</th><th>Entrada · última atividade</th><th>Próxima ação</th><th>Ações</th></tr></thead>
                <tbody>
                  {data.items.map((opp) => (
                    <tr key={opp.id}>
                      <td>
                        <strong>{opp.customer.name}</strong>
                        <p className={styles.muted} style={{ fontSize: 12 }}>{opp.listing.name} · {OPERATION_LABELS[opp.listing.operationType] ?? opp.listing.operationType}{opp.listing.building ? ` · ${opp.listing.building.name}` : ""}</p>
                      </td>
                      <td data-label="Etapa">
                        <span className={styles.badge} data-tone={STAGE_TONES[opp.status] ?? "slate"}>{STAGE_LABELS[opp.status] ?? opp.status}</span>
                        {opp.status === "LOST" && <p className={styles.muted} style={{ fontSize: 12 }}>{opp.lostReason ? LOST_REASON_LABELS[opp.lostReason] ?? opp.lostReason : "Motivo não registrado"}</p>}
                        <div><SlaBadge status={opp.slaStatus} /></div>
                      </td>
                      <td data-label="Responsável">{opp.broker?.name ?? <em>Sem responsável</em>}<p className={styles.muted} style={{ fontSize: 12 }}>{SOURCE_LABELS[opp.source] ?? opp.source}</p></td>
                      <td data-label="Datas">{fmtDate(opp.createdAt)}<p className={styles.muted} style={{ fontSize: 12 }}>{fmtAge(opp.lastActivityAt)}</p></td>
                      <td data-label="Próxima ação">{opp.nextAction ? <>{opp.nextAction.title}<p className={styles.muted} style={{ fontSize: 12 }}>{opp.nextAction.at ? fmtDateTime(opp.nextAction.at) : "Sem prazo"}</p></> : <span className={styles.muted}>—</span>}</td>
                      <td data-label="Ações">
                        <Link className={styles.linkAction} href={`/imobiliaria/leads/${opp.id}?back=${encodeURIComponent(back)}`}>Abrir oportunidade</Link>
                        {opp.conversationId && <><br /><Link className={styles.linkAction} href={`/empresa/mensagens?openChat=${opp.conversationId}`}>Abrir conversa</Link></>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.total > data.limit && (
            <nav className={styles.pagination} aria-label="Páginas de contatos">
              {data.page > 1 && <Link href={href({ page: String(data.page - 1) })}>← Anterior</Link>}
              <span>Página {data.page} de {Math.max(1, Math.ceil(data.total / data.limit))}</span>
              {data.page * data.limit < data.total && <Link href={href({ page: String(data.page + 1) })}>Próxima →</Link>}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
