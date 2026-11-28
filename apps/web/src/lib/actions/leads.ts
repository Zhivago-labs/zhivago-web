"use server";

import { revalidatePath } from "next/cache";
import { getApiUrl } from "@/lib/api";
import { getToken } from "@/lib/session";

function extractErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const error = (data as { error: unknown }).error;
    if (typeof error === "string") return error;
    if (Array.isArray(error) && error[0]?.message) return String(error[0].message);
  }
  return fallback;
}

export type LeadFormState = { error?: string; ok?: string } | undefined;

async function call(path: string, method: string, body: unknown, fallback: string): Promise<{ error: string } | { data: unknown }> {
  const token = await getToken();
  if (!token) return { error: "Sessão expirada. Entre novamente." };
  const res = await fetch(`${getApiUrl()}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) return { error: extractErrorMessage(data, fallback) };
  return { data };
}

function revalidateLead(leadId?: string) {
  revalidatePath("/imobiliaria");
  revalidatePath("/empresa");
  revalidatePath("/empresa/contatos", "layout");
  revalidatePath("/empresa/fila");
  if (leadId) revalidatePath(`/imobiliaria/leads/${leadId}`);
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

/** Atribuir (1ª vez) ou transferir — transferência exige motivo; pode levar tarefas e visitas. */
export async function assignLeadAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const leadId = text(formData, "leadId");
  const brokerMemberId = text(formData, "brokerMemberId");
  const reason = text(formData, "reason");
  if (!leadId || !brokerMemberId) return { error: "Selecione um responsável." };
  const result = await call(`/leads/${leadId}/assign`, "PATCH", {
    brokerMemberId,
    reason: reason || undefined,
    moveOpenWork: formData.get("moveOpenWork") === "on",
  }, "Não foi possível atribuir o lead.");
  if ("error" in result) return { error: result.error };
  revalidateLead(leadId);
  return { ok: "Responsável atualizado." };
}

export async function claimLeadAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const leadId = text(formData, "leadId");
  if (!leadId) return { error: "Oportunidade inválida." };
  const result = await call(`/leads/${leadId}/claim`, "POST", undefined, "Não foi possível assumir a oportunidade.");
  if ("error" in result) return { error: result.error };
  revalidateLead(leadId);
  return { ok: "Oportunidade assumida." };
}

export async function bulkAssignAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const leadIds = formData.getAll("leadIds").map(String).filter(Boolean);
  const brokerMemberId = text(formData, "brokerMemberId");
  if (!leadIds.length) return { error: "Selecione ao menos uma oportunidade." };
  if (!brokerMemberId) return { error: "Selecione o responsável." };
  if (formData.get("confirm") !== "on") return { error: "Confirme a atribuição em lote." };
  const result = await call("/leads/bulk-assign", "POST", { leadIds, brokerMemberId }, "Não foi possível atribuir em lote.");
  if ("error" in result) return { error: result.error };
  const data = result.data as { assigned: number; results: { ok: boolean; error?: string }[] };
  revalidateLead();
  const failed = data.results.filter((r) => !r.ok);
  return failed.length
    ? { error: `${data.assigned} atribuída(s); ${failed.length} com erro: ${failed[0]?.error ?? ""}` }
    : { ok: `${data.assigned} oportunidade(s) atribuída(s).` };
}

/** Mudança de etapa. LOST exige motivo; `expectedStatus` detecta edição concorrente. */
export async function updateLeadStatusAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const leadId = text(formData, "leadId");
  const status = text(formData, "status");
  const expectedStatus = text(formData, "expectedStatus");
  const lostReason = text(formData, "lostReason");
  const lostNote = text(formData, "lostNote");
  if (!leadId || !status) return { error: "Etapa inválida." };
  if (status === "LOST" && !lostReason) return { error: "Informe o motivo da perda." };
  const result = await call(`/leads/${leadId}/status`, "PATCH", {
    status,
    expectedStatus: expectedStatus || undefined,
    lostReason: lostReason || undefined,
    lostNote: lostNote || undefined,
  }, "Não foi possível atualizar a etapa.");
  if ("error" in result) return { error: result.error };
  revalidateLead(leadId);
  return { ok: "Etapa salva." };
}

export async function reopenLeadAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const leadId = text(formData, "leadId");
  const status = text(formData, "status") || "CONTACTED";
  const note = text(formData, "note");
  if (!leadId) return { error: "Oportunidade inválida." };
  const result = await call(`/leads/${leadId}/reopen`, "POST", { status, note: note || undefined }, "Não foi possível reabrir.");
  if ("error" in result) return { error: result.error };
  revalidateLead(leadId);
  return { ok: "Oportunidade reaberta." };
}

export async function addInteractionAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const leadId = text(formData, "leadId");
  const type = text(formData, "type");
  const content = text(formData, "content");
  if (!leadId || !type) return { error: "Preencha o tipo de contato." };
  const attempt = formData.get("attempt") === "on";
  const result = await call(`/leads/${leadId}/interactions`, "POST", {
    type,
    content: content || undefined,
    ...(type !== "NOTE" ? { outcome: attempt ? "ATTEMPT" : "CONTACT" } : {}),
  }, "Não foi possível registrar a interação.");
  if ("error" in result) return { error: result.error };
  revalidateLead(leadId);
  return { ok: "Registrado." };
}

export async function scheduleVisitAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const leadId = text(formData, "leadId");
  const scheduledAt = text(formData, "scheduledAt");
  const notes = text(formData, "notes");
  if (!leadId || !scheduledAt) return { error: "Escolha data e horário da visita." };
  const result = await call(`/leads/${leadId}/visits`, "POST", { scheduledAt: toIsoFromLocal(scheduledAt), notes: notes || undefined }, "Não foi possível agendar a visita.");
  if ("error" in result) return { error: result.error };
  revalidateLead(leadId);
}

export async function updateVisitStatusAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const visitId = text(formData, "visitId");
  const leadId = text(formData, "leadId");
  const status = text(formData, "status");
  if (!visitId || !status) return { error: "Status inválido." };
  const result = await call(`/visits/${visitId}/status`, "PATCH", { status }, "Não foi possível atualizar a visita.");
  if ("error" in result) return { error: result.error };
  revalidateLead(leadId || undefined);
}

export async function addTaskAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const leadId = text(formData, "leadId");
  const title = text(formData, "title");
  const dueAt = text(formData, "dueAt");
  const assigneeId = text(formData, "assigneeId");
  if (!leadId || !title) return { error: "Informe o título da tarefa." };
  const result = await call(`/leads/${leadId}/tasks`, "POST", {
    title,
    dueAt: dueAt ? toIsoFromLocal(dueAt) : undefined,
    assigneeId: assigneeId || undefined,
  }, "Não foi possível criar a tarefa.");
  if ("error" in result) return { error: result.error };
  revalidateLead(leadId);
  return { ok: "Tarefa criada." };
}

export async function toggleTaskCompletedAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const taskId = text(formData, "taskId");
  const leadId = text(formData, "leadId");
  const completed = formData.get("completed") === "true";
  if (!taskId) return { error: "Tarefa inválida." };
  const result = await call(`/tasks/${taskId}`, "PATCH", { completed }, "Não foi possível atualizar a tarefa.");
  if ("error" in result) return { error: result.error };
  revalidateLead(leadId || undefined);
}

/** Equipe registra uma entrada vinda de telefone, WhatsApp, plantão, indicação ou formulário. */
export async function registerLeadAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const listingId = text(formData, "listingId");
  const contact = text(formData, "contact");
  const source = text(formData, "source");
  const note = text(formData, "note");
  if (!listingId || !contact || !source) return { error: "Informe o imóvel, o e-mail ou telefone do cliente e a origem." };
  const isEmail = contact.includes("@");
  const result = await call("/leads", "POST", {
    listingId,
    source,
    ...(isEmail ? { email: contact } : { phone: contact }),
    note: note || undefined,
    contacted: formData.get("contacted") === "on",
    assignToMe: formData.get("assignToMe") === "on",
  }, "Não foi possível registrar o contato.");
  if ("error" in result) return { error: result.error };
  const data = result.data as { created: boolean; customer: { name: string } };
  revalidateLead();
  return { ok: data.created ? `Nova oportunidade criada para ${data.customer.name}.` : `Entrada registrada na oportunidade existente de ${data.customer.name}.` };
}

export async function updateLeadDistributionModeAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const mode = text(formData, "mode");
  if (mode !== "MANUAL" && mode !== "ROUND_ROBIN") return { error: "Modo inválido." };
  const result = await call("/organizations/lead-distribution-mode", "PATCH", { mode }, "Não foi possível atualizar o modo de distribuição.");
  if ("error" in result) return { error: result.error };
  revalidatePath("/equipe");
}

// Campos datetime-local chegam sem fuso; a imobiliária opera no horário de Brasília. Converte de
// forma explícita para não depender do fuso do servidor (a web roda em UTC no Netlify).
const BUSINESS_UTC_OFFSET = "-03:00";
function toIsoFromLocal(value: string): string {
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(value)) return new Date(value).toISOString();
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${withSeconds}${BUSINESS_UTC_OFFSET}`).toISOString();
}
