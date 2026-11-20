import type { ConversationListItem } from "./chat-api";

export type InboxFilter = "all" | "personal" | "organization";
export const inboxLabels = { all: "Todas as conversas", organization: "Imobiliária", personal: "Pessoal", other: "Outras conversas" };

export function inboxItems(items: ConversationListItem[], filter: InboxFilter) {
  return filter === "all" ? items : items.filter(item => item.inboxScope === filter);
}
export function unreadMessages(items: ConversationListItem[], filter: InboxFilter) {
  return inboxItems(items, filter).reduce((count, item) => count + (item._count?.messages ?? 0), 0);
}
