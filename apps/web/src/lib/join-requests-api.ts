import { getApiUrl } from "@/lib/api";

// Código de convite da imobiliária + pedidos para entrar (o dono aprova). Ver hotelapp
// apps/server/src/controllers/join-requests.controller.ts.

export interface JoinRequestStatus {
  id: string;
  status: "PENDING" | "REJECTED";
  createdAt: string;
  organization: { id: string; name: string; logo: string | null };
}

export interface PendingJoinRequest {
  id: string;
  createdAt: string;
  user: { id: string; name: string; email: string; avatar: string | null };
}

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` }, cache: "no-store" as const });

/** Código atual da imobiliária (OWNER/ADMIN). null quando não pode ver (ex.: não é imobiliária). */
export async function getJoinCode(token: string): Promise<string | null> {
  const res = await fetch(`${getApiUrl()}/organizations/join-code`, auth(token));
  if (res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Falha ao buscar código de convite (${res.status})`);
  return (await res.json()).code;
}

export async function getPendingJoinRequests(token: string): Promise<PendingJoinRequest[]> {
  const res = await fetch(`${getApiUrl()}/organizations/join-requests`, auth(token));
  if (res.status === 403 || res.status === 404) return [];
  if (!res.ok) throw new Error(`Falha ao buscar pedidos para entrar (${res.status})`);
  return res.json();
}

export async function getMyJoinRequest(token: string): Promise<JoinRequestStatus | null> {
  const res = await fetch(`${getApiUrl()}/organizations/join-requests/me`, auth(token));
  if (!res.ok) throw new Error(`Falha ao buscar seu pedido (${res.status})`);
  return (await res.json()) ?? null;
}
