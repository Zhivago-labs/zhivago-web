import { requireWorkspace, workspaceFetch } from "@/lib/workspace";
import type { WorkspaceContacts } from "@/lib/workspace-types";
import { getOrganizationBuildings, getOrganizationListings, getMyAssignedListings } from "@/lib/organizations-api";
import { getLeadAssignees } from "@/lib/leads-api";
import { ContactsView } from "@/components/contacts/ContactsView";

export const metadata = { title: "Contatos da imobiliária" };

const BROAD = ["OWNER", "ADMIN", "MANAGER", "ASSISTANT"];
const MANAGE = ["OWNER", "ADMIN", "MANAGER"];
const STAGES = ["ALL", "NEW", "OPEN", "ACTIVE", "CLOSED", "WON", "LOST"];
const SORTS = ["activity", "name", "created", "nextAction", "waiting"];
const PASSTHROUGH = ["search", "status", "source", "operationType", "brokerId", "unassigned", "buildingId", "listingId", "lostReason"] as const;
type Params = Partial<Record<string, string>>;

// Datas do filtro chegam como AAAA-MM-DD (dia em Brasília) → ISO com fuso explícito.
const dayStart = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00-03:00`).toISOString() : undefined);
const dayEnd = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T23:59:59.999-03:00`).toISOString() : undefined);

/**
 * Contatos: base de pessoas (uma linha por pessoa) e Oportunidades (uma linha por pessoa × imóvel).
 * O recorte vive na URL — links antigos (`view`, `stage`, `sort`, filtros, `page`) continuam
 * válidos. A prévia lateral (`pessoa`, `oportunidade`) é tratada no cliente e não refaz a lista.
 */
export default async function Contacts({ searchParams }: { searchParams: Promise<Params> }) {
  const { token, membership, user } = await requireWorkspace("/empresa/contatos");
  const params = await searchParams;
  const broad = BROAD.includes(membership.role);
  const isManager = MANAGE.includes(membership.role);
  const kind = params.view === "opportunities" ? "opportunities" : "people";
  const stage = STAGES.includes(params.stage ?? "") ? params.stage! : "ALL";
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  const sort = SORTS.includes(params.sort ?? "") && (kind === "opportunities" || !["nextAction", "waiting"].includes(params.sort!)) ? params.sort! : "activity";

  const api = new URLSearchParams({ view: kind, page: String(page), stage, sort });
  for (const key of PASSTHROUGH) {
    const value = params[key]?.slice(0, 120);
    if (value) api.set(key, value);
  }
  if (dayStart(params.from)) api.set("from", dayStart(params.from)!);
  if (dayEnd(params.to)) api.set("to", dayEnd(params.to)!);

  const [data, assignees, buildings, listings] = await Promise.all([
    workspaceFetch<WorkspaceContacts>(token, `/organizations/contacts?${api}`).catch(() => null),
    broad ? getLeadAssignees(token).catch(() => []) : Promise.resolve([]),
    broad ? getOrganizationBuildings(token).catch(() => []) : Promise.resolve([]),
    (broad ? getOrganizationListings(token) : getMyAssignedListings(token)).catch(() => []),
  ]);
  const people = assignees.map((a) => ({ memberId: a.memberId, name: a.name }));

  return (
    <ContactsView
      data={data}
      kind={kind}
      userId={user.id}
      organizationId={membership.organization.id}
      isManager={isManager}
      broad={broad}
      canRegister={membership.role !== "ASSISTANT"}
      assignees={people}
      taskMembers={isManager ? people : []}
      buildings={buildings.map((b) => ({ id: b.id, name: b.name }))}
      listings={listings.map((l) => ({ id: l.id, name: l.name }))}
    />
  );
}
