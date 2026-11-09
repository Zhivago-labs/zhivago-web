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
