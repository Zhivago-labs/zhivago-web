// Rótulos e cores compartilhados pelas telas da área da imobiliária.
export type Tone = "accent" | "blue" | "amber" | "green" | "violet" | "red" | "slate";

const AVATAR_TONES: Tone[] = ["accent", "blue", "violet", "green", "amber"];

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0] ?? "").join("").toUpperCase() || "?";
}

/** Cor estável por pessoa: o mesmo nome sempre recebe a mesma cor de avatar. */
export function avatarTone(name: string): Tone {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export const STAGE_LABELS: Record<string, string> = { NEW: "Novo", CONTACTED: "Contatado", QUALIFIED: "Qualificado", VISIT_SCHEDULED: "Visita agendada", PROPOSAL: "Proposta", NEGOTIATION: "Negociação", WON: "Ganho", LOST: "Perdido" };
export const STAGE_TONES: Record<string, Tone> = { NEW: "accent", CONTACTED: "blue", QUALIFIED: "blue", VISIT_SCHEDULED: "amber", PROPOSAL: "amber", NEGOTIATION: "violet", WON: "green", LOST: "slate" };

export const LISTING_STATUS_LABELS: Record<string, string> = { DRAFT: "Rascunho", PENDING: "Em análise", APPROVED: "Publicado", REJECTED: "Rejeitado", SOLD: "Vendido", RENTED: "Alugado" };
export const LISTING_STATUS_TONES: Record<string, Tone> = { DRAFT: "slate", PENDING: "amber", APPROVED: "green", REJECTED: "red", SOLD: "blue", RENTED: "violet" };

// Fuso único da imobiliária para leitura de datas (o servidor da web roda em UTC).
export const BUSINESS_TIME_ZONE = "America/Sao_Paulo";
export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { timeZone: BUSINESS_TIME_ZONE, day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}
export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: BUSINESS_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" });
}
/** "há 3 h", "há 2 dias" — idade relativa para filas e última atividade. */
export function fmtAge(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `há ${hours} h`;
  return `há ${Math.round(hours / 24)} dias`;
}
export function fmtHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} dias`;
}
export const pct = (value: number | null | undefined) => (value === null || value === undefined ? "—" : `${(value * 100).toFixed(0)}%`);
