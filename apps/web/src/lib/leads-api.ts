import { getApiUrl } from "@/lib/api";
import type { Lead, LeadAssignee, LeadDetail, OrganizationMetrics, PaginatedLeads } from "@zhivago/shared";

// Filtros e paginação server-side (seção 118/119 da spec) — antes trazia a organização inteira e
// filtrava em memória. O Kanban continua mostrando o funil inteiro de uma vez (não pagina por
// coluna), então usa um `limit` generoso por padrão; os filtros é que reduzem o conjunto.
export interface OrganizationLeadsFilters {
  status?: string;
  stage?: string;
  brokerId?: string;
  buildingId?: string;
  listingId?: string;
  source?: string;
  operationType?: string;
  unassigned?: string;
  overdue?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function getOrganizationLeads(token: string, filters: OrganizationLeadsFilters = {}): Promise<PaginatedLeads> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${getApiUrl()}/leads/workspace${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Falha ao buscar leads da organização (${res.status})`);
  return res.json();
}

export async function getMyLeads(token: string): Promise<Lead[]> {
  const res = await fetch(`${getApiUrl()}/leads/mine`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Falha ao buscar meus leads (${res.status})`);
  return res.json();
}

export async function getLeadDetail(token: string, id: string): Promise<LeadDetail | null> {
  const res = await fetch(`${getApiUrl()}/leads/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Falha ao buscar detalhe do lead (${res.status})`);
  return res.json();
}

export async function getOrganizationMetrics(token: string): Promise<OrganizationMetrics> {
  const res = await fetch(`${getApiUrl()}/organizations/metrics`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Falha ao buscar métricas da organização (${res.status})`);
  return res.json();
}

export async function getLeadAssignees(token: string): Promise<LeadAssignee[]> {
  const res = await fetch(`${getApiUrl()}/leads/assignees`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export interface TransferImpact { currentBrokerId: string | null; pendingTasks: number; futureVisits: number; conversations: number }

export async function getTransferImpact(token: string, leadId: string): Promise<TransferImpact | null> {
  const res = await fetch(`${getApiUrl()}/leads/${leadId}/transfer-preview`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function getOrganizationMetricsForPeriod(token: string, days: number): Promise<OrganizationMetrics> {
  const res = await fetch(`${getApiUrl()}/organizations/metrics?days=${days}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao buscar métricas da organização (${res.status})`);
  return res.json();
}

// Rótulos compartilhados do CRM (origem, motivo de perda, modalidade, SLA).
export const SOURCE_LABELS: Record<string, string> = {
  CHAT: "Chat", BOOKING: "Reserva", OFFER: "Proposta", WHATSAPP: "WhatsApp", PHONE: "Telefone",
  WALK_IN: "Plantão / visita", REFERRAL: "Indicação", FORM: "Formulário", OTHER: "Outro",
};
export const LOST_REASON_LABELS: Record<string, string> = {
  PRICE: "Preço ou condições", FOUND_OTHER: "Escolheu outro imóvel", LOCATION: "Localização",
  FINANCING: "Crédito ou financiamento", UNAVAILABLE: "Imóvel ou datas indisponíveis",
  NO_RESPONSE: "Cliente parou de responder", GAVE_UP: "Desistiu da busca",
  DUPLICATE: "Contato duplicado ou inválido", OTHER: "Outro motivo",
};
export const OPERATION_LABELS: Record<string, string> = { SALE: "Venda", MONTHLY_RENT: "Aluguel", DAILY_RENT: "Temporada" };
