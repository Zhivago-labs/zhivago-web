// Estado da tela de Contatos: tudo vive na URL (links compartilháveis, voltar da ficha preserva o
// recorte). Funções puras — testadas em contacts-state.test.ts.

export type TableKind = "people" | "opportunities";

/** Parâmetros que definem o recorte da lista (mudam os dados). */
export const LIST_KEYS = ["view", "search", "stage", "status", "source", "operationType", "brokerId", "unassigned", "buildingId", "listingId", "lostReason", "from", "to", "sort", "page"] as const;
/** Parâmetros só da prévia lateral (não mudam a lista). */
export const PANEL_KEYS = ["pessoa", "oportunidade", "secao"] as const;
/** Filtros avançados: editados em rascunho e aplicados só com "Aplicar". */
export const ADVANCED_KEYS = ["source", "listingId", "operationType", "buildingId", "lostReason", "from", "to", "unassigned"] as const;
/** Filtros e busca (o que "Limpar busca e filtros" remove). */
export const FILTER_KEYS = ["search", "status", "source", "operationType", "brokerId", "unassigned", "buildingId", "listingId", "lostReason", "from", "to"] as const;

type Changes = Record<string, string | undefined | null>;

/**
 * Nova query string a partir da atual. Qualquer mudança de recorte volta à 1ª página, a menos que
 * a própria mudança defina `page`.
 */
export function withChanges(current: URLSearchParams | string, changes: Changes): string {
  const next = new URLSearchParams(typeof current === "string" ? current : current.toString());
  for (const [key, value] of Object.entries(changes)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  if (!("page" in changes)) next.delete("page");
  const q = next.toString();
  return q ? `?${q}` : "";
}

/** Query sem os parâmetros da prévia — usada como destino de "voltar" e para o Kanban. */
export function listOnly(current: URLSearchParams | string): string {
  const next = new URLSearchParams(typeof current === "string" ? current : current.toString());
  for (const key of PANEL_KEYS) next.delete(key);
  const q = next.toString();
  return q ? `?${q}` : "";
}

export type ViewDef = { key: string; label: string; stage?: string; unassigned?: "true"; managersOnly?: boolean };

export const PEOPLE_VIEWS: ViewDef[] = [
  { key: "all", label: "Todos os contatos" },
  { key: "open", label: "Com oportunidades abertas", stage: "ACTIVE" },
  { key: "closed", label: "Com oportunidades encerradas", stage: "CLOSED" },
];

export const OPPORTUNITY_VIEWS: ViewDef[] = [
  { key: "all", label: "Todas" },
  { key: "open", label: "Abertas", stage: "ACTIVE" },
  { key: "unassigned", label: "Sem responsável", stage: "ACTIVE", unassigned: "true", managersOnly: true },
  { key: "new", label: "Novas", stage: "NEW" },
  { key: "progress", label: "Em andamento", stage: "OPEN" },
  { key: "won", label: "Ganhas", stage: "WON" },
  { key: "lost", label: "Perdidas", stage: "LOST" },
];

export function viewsFor(kind: TableKind, isManager: boolean): ViewDef[] {
  return (kind === "people" ? PEOPLE_VIEWS : OPPORTUNITY_VIEWS).filter((v) => !v.managersOnly || isManager);
}

/** Qual aba predefinida corresponde ao recorte atual (null = recorte vindo de link antigo). */
export function activeView(kind: TableKind, params: URLSearchParams, isManager: boolean): ViewDef | null {
  const stage = params.get("stage") || undefined;
  const unassigned = params.get("unassigned") === "true" ? "true" : undefined;
  return viewsFor(kind, isManager).find((v) => (v.stage ?? "ALL") === (stage ?? "ALL") && v.unassigned === unassigned) ?? null;
}

export function viewHref(current: URLSearchParams, view: ViewDef): string {
  return withChanges(current, { stage: view.stage, unassigned: view.unassigned });
}

/** Alterna Contatos ⇄ Oportunidades preservando busca e filtros válidos nas duas. */
export function switchTableHref(current: URLSearchParams, kind: TableKind): string {
  const sort = current.get("sort");
  const changes: Changes = { view: kind === "opportunities" ? "opportunities" : undefined, pessoa: undefined, oportunidade: undefined, secao: undefined };
  if (kind === "people") {
    if (sort === "nextAction" || sort === "waiting") changes.sort = undefined;
    // Visões que só existem em Oportunidades não fazem sentido para pessoas.
    if (current.get("unassigned") === "true") changes.unassigned = undefined;
    if (["NEW", "OPEN", "WON", "LOST"].includes(current.get("stage") ?? "")) changes.stage = undefined;
  }
  return withChanges(current, changes);
}

export function hasFilters(params: URLSearchParams): boolean {
  return FILTER_KEYS.some((key) => params.get(key));
}

export function clearFiltersHref(current: URLSearchParams): string {
  return withChanges(current, Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])));
}

/** Mapeia o recorte de Oportunidades para os filtros do Kanban, com caminho de volta. */
export function kanbanHref(current: URLSearchParams): string {
  const query = new URLSearchParams({ view: "pipeline" });
  for (const key of ["search", "brokerId", "buildingId", "listingId", "status", "source"] as const) {
    const value = current.get(key);
    if (value) query.set(key, value);
  }
  if (current.get("unassigned") === "true") query.set("unassigned", "true");
  if (current.get("stage") === "ACTIVE") query.set("hideClosed", "1");
  query.set("back", `/empresa/contatos${listOnly(current)}`);
  return `/imobiliaria?${query}`;
}

// ─── Colunas ───────────────────────────────────────────────────────────────────────────────────

export type ColumnDef = { id: string; label: string; defaultVisible: boolean; locked?: boolean };

export const PEOPLE_COLUMNS: ColumnDef[] = [
  { id: "name", label: "Nome", defaultVisible: true, locked: true },
  { id: "phone", label: "Telefone", defaultVisible: true },
  { id: "email", label: "E-mail", defaultVisible: true },
  { id: "listings", label: "Imóveis de interesse", defaultVisible: true },
  { id: "open", label: "Oportunidades abertas", defaultVisible: true },
  { id: "activity", label: "Última atividade", defaultVisible: true },
  { id: "stages", label: "Etapas", defaultVisible: false },
  { id: "firstEntry", label: "Primeira entrada", defaultVisible: false },
];

export const OPPORTUNITY_COLUMNS: ColumnDef[] = [
  { id: "customer", label: "Cliente", defaultVisible: true, locked: true },
  { id: "listing", label: "Imóvel", defaultVisible: true },
  { id: "stage", label: "Etapa", defaultVisible: true },
  { id: "broker", label: "Responsável", defaultVisible: true },
  { id: "nextAction", label: "Próxima ação", defaultVisible: true },
  { id: "activity", label: "Última atividade", defaultVisible: true },
  { id: "phone", label: "Telefone", defaultVisible: false },
  { id: "email", label: "E-mail", defaultVisible: false },
  { id: "source", label: "Origem", defaultVisible: false },
  { id: "created", label: "Entrada", defaultVisible: false },
];

export const columnsFor = (kind: TableKind) => (kind === "people" ? PEOPLE_COLUMNS : OPPORTUNITY_COLUMNS);
export const defaultColumns = (kind: TableKind) => columnsFor(kind).filter((c) => c.defaultVisible).map((c) => c.id);

/** Preferência por usuário, imobiliária e tipo de tabela (armazenamento local do navegador). */
export function columnsStorageKey(userId: string, organizationId: string, kind: TableKind): string {
  return `zhivago:crm-colunas:v1:${organizationId}:${userId}:${kind}`;
}

/** Lê a preferência salva com tolerância: ids desconhecidos somem, coluna travada sempre volta. */
export function sanitizeColumns(kind: TableKind, stored: unknown): string[] {
  if (!Array.isArray(stored)) return defaultColumns(kind);
  const defs = columnsFor(kind);
  const wanted = new Set(stored.filter((id): id is string => typeof id === "string"));
  return defs.filter((c) => c.locked || wanted.has(c.id)).map((c) => c.id);
}
