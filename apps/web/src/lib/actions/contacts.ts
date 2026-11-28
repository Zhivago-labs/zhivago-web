"use server";

import { getApiUrl } from "@/lib/api";
import { getToken } from "@/lib/session";
import type { WorkspaceContactDetail } from "@/lib/workspace-types";

export type ContactPreviewResult =
  | { ok: true; data: WorkspaceContactDetail }
  | { ok: false; notFound: boolean; error: string };

/**
 * Prévia lateral de Contatos: a mesma ficha autorizada de `/organizations/contacts/:userId`
 * (escopo do papel aplicado no backend; conversa só para participantes).
 */
export async function loadContactPreview(userId: string): Promise<ContactPreviewResult> {
  const token = await getToken();
  if (!token) return { ok: false, notFound: false, error: "Sessão expirada. Entre novamente." };
  if (!/^[\w-]{1,64}$/.test(userId)) return { ok: false, notFound: true, error: "Contato inválido." };
  try {
    const res = await fetch(`${getApiUrl()}/organizations/contacts/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 404 || res.status === 403) return { ok: false, notFound: true, error: "Esta pessoa não tem oportunidades visíveis para você." };
    if (!res.ok) return { ok: false, notFound: false, error: `Não foi possível carregar o contato (${res.status}).` };
    return { ok: true, data: (await res.json()) as WorkspaceContactDetail };
  } catch {
    return { ok: false, notFound: false, error: "Não foi possível carregar o contato. Verifique a conexão." };
  }
}
