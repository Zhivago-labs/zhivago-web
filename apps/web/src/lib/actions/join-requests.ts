"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getApiUrl } from "@/lib/api";
import { getToken } from "@/lib/session";

export type JoinFormState = { error: string } | undefined;

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string") {
    return (data as { error: string }).error;
  }
  return fallback;
}

/** Envia o código. Também usado no primeiro acesso (/boas-vindas): o servidor conclui o cadastro. */
export async function requestToJoin(code: string): Promise<JoinFormState> {
  const token = await getToken();
  if (!token) redirect("/login?next=%2Fentrar-imobiliaria");
  if (!code.trim()) return { error: "Digite o código de convite da imobiliária." };
  try {
    const res = await fetch(`${getApiUrl()}/organizations/join-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code }),
    });
    if (res.status === 429) return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
    if (!res.ok) return { error: errorMessage(await res.json().catch(() => null), "Não foi possível enviar o código.") };
  } catch {
    return { error: "Não foi possível conectar ao servidor. Tente novamente." };
  }
  return undefined;
}

export async function joinWithCodeAction(_prev: JoinFormState, formData: FormData): Promise<JoinFormState> {
  const result = await requestToJoin(String(formData.get("code") ?? ""));
  if (result) return result;
  revalidatePath("/entrar-imobiliaria");
  redirect("/entrar-imobiliaria");
}

export async function cancelJoinRequestAction(): Promise<void> {
  const token = await getToken();
  if (!token) redirect("/login");
  await fetch(`${getApiUrl()}/organizations/join-requests/me`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  revalidatePath("/entrar-imobiliaria");
}

async function manage(path: string): Promise<JoinFormState> {
  const token = await getToken();
  if (!token) return { error: "Sessão expirada. Faça login novamente." };
  try {
    const res = await fetch(`${getApiUrl()}${path}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { error: errorMessage(await res.json().catch(() => null), "Não foi possível concluir a ação.") };
  } catch {
    return { error: "Não foi possível conectar ao servidor. Tente novamente." };
  }
  revalidatePath("/equipe");
  return undefined;
}

export async function approveJoinRequestAction(_prev: JoinFormState, formData: FormData): Promise<JoinFormState> {
  return manage(`/organizations/join-requests/${encodeURIComponent(String(formData.get("id")))}/approve`);
}

export async function rejectJoinRequestAction(_prev: JoinFormState, formData: FormData): Promise<JoinFormState> {
  return manage(`/organizations/join-requests/${encodeURIComponent(String(formData.get("id")))}/reject`);
}

export async function regenerateJoinCodeAction(): Promise<JoinFormState> {
  return manage("/organizations/join-code/regenerate");
}
