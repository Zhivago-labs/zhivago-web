import { getApiUrl } from "@/lib/api";
import type { ListingOperationType } from "@zhivago/shared";

export interface ChatParticipant {
  id: string;
  name: string;
  avatar: string | null;
}

export interface ChatMessage {
  id: string;
  content: string;
  type: string;
  metadata: string | null;
  senderId: string;
  conversationId: string;
  isRead: boolean;
  createdAt: string;
  sender: ChatParticipant;
}

export interface ConversationListItem {
  id: string;
  propertyId: string;
  isReported: boolean;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
  property: { id: string; name: string; price: number; image: string };
  participants: ChatParticipant[];
  messages: ChatMessage[]; // só a última mensagem (preview do inbox)
  _count: { messages: number };
}

export interface ChatCommand {
  trigger: string;
  aliases: readonly string[];
  label: string;
  description: string;
  // Presente quando o comando precisa de complemento ("/proposta 450000"): o menu preenche o
  // comando no campo em vez de enviar direto.
  argument?: string;
}

export interface ConversationDetail {
  id: string;
  propertyId: string;
  isReported: boolean;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
  // Se o viewer atual pode aprovar/recusar reserva ou proposta nesta conversa — calculado no
  // backend (ver canManageListingConversation em lib/leads.ts) porque não dá pra derivar isso só
  // de `property.ownerId`: imóvel de organização nunca tem `ownerId` preenchido, e quem responde
  // muda conforme o Lead é (re)atribuído no CRM.
  canManage: boolean;
  // Encerramento: "ADMIN" (moderação, só a administração reabre) ou "LISTING" (a imobiliária
  // encerrou; o cliente pode reabrir pelo modal do chat). Permissões calculadas no backend.
  closedBy?: "ADMIN" | "LISTING" | null;
  canClose?: boolean;
  canReopen?: boolean;
  // Bloqueio (vale nos dois sentidos): se há algum ativo e qual deles o viewer pode desfazer.
  canBlock?: boolean;
  block?: { active: boolean; removableId: string | null };
  // Comandos de "/" que fazem sentido agora nesta conversa (ver computeAvailableCommands em
  // chat.controller.ts) — alimenta o menu de autocomplete ao digitar "/" no chat.
  availableCommands: ChatCommand[];
  property: {
    id: string;
    name: string;
    price: number;
    image: string;
    ownerId: string | null;
    category: string;
    operationType: ListingOperationType;
    acceptsNegotiation: boolean;
    status: string;
  };
  participants: ChatParticipant[];
}

export async function getConversations(token: string): Promise<ConversationListItem[]> {
  const res = await fetch(`${getApiUrl()}/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Falha ao buscar conversas (${res.status})`);
  return res.json();
}

export async function getConversation(token: string, id: string): Promise<ConversationDetail | null> {
  const res = await fetch(`${getApiUrl()}/conversations/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error(`Falha ao buscar conversa (${res.status})`);
  return res.json();
}

export async function getMessages(token: string, id: string): Promise<ChatMessage[]> {
  const res = await fetch(`${getApiUrl()}/conversations/${id}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Falha ao buscar mensagens (${res.status})`);
  return res.json();
}

export interface ChatBlockItem {
  id: string;
  createdAt: string;
  // PERSONAL = feito por mim; ORGANIZATION = feito em nome da imobiliária (vale pra equipe toda).
  scope: "PERSONAL" | "ORGANIZATION";
  blockedBy: { id: string; name: string };
  target: { kind: "USER" | "ORGANIZATION"; id: string; name: string; image: string | null };
  canRemove: boolean;
}

export async function getChatBlocks(token: string): Promise<ChatBlockItem[]> {
  const res = await fetch(`${getApiUrl()}/blocks`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}
