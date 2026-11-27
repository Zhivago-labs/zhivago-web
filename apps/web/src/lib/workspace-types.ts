export interface WorkspaceOverview {
  days: number; since: string; scope: "organization" | "assigned";
  newLeads: number; uniqueContacts: number; pendingCount: number;
  contactedRate: number | null; published: number; hasSeason: boolean;
  topListings: { id: string; name: string; status: string; viewCount: number; _count: { leads: number } }[];
  topContactListings: WorkspaceOverview["topListings"];
  upcomingBookings: { id: string; startDate: string; status: string; user: { name: string }; listing: { name: string } }[];
  pending: { id: string; status: string; user: { name: string }; listing: { name: string } }[];
  visits: { id: string; scheduledAt: string; lead: { id: string; user: { name: string }; listing: { name: string } } }[];
  trend: Record<string, number>;
  canSwitchScope?: boolean;
  blocks?: {
    newNoResponse: { count: number; items: WorkspaceLeadCard[] };
    unassigned: { count: number; items: WorkspaceLeadCard[] };
    overdue: { count: number; items: WorkspaceLeadCard[] };
    tasks: { items: { id: string; title: string; dueAt: string | null; lead: { id: string; user: { name: string }; listing: { name: string } } }[] };
    visitsToday: { count: number; items: WorkspaceOverview["visits"] };
  };
}
export interface WorkspaceLeadCard { id: string; status: string; createdAt: string; user: { name: string }; listing: { name: string } }
export interface ContactOpportunity {
  id: string; status: string; source: string; createdAt: string; lastActivityAt: string;
  closedAt: string | null; lostReason: string | null; lostNote: string | null;
  queuedAt: string | null; queueReason: string | null;
  customer: { id: string; name: string; email: string; phone: string | null };
  listing: { id: string; name: string; operationType: string; building: { id: string; name: string } | null };
  broker: { memberId: string; name: string } | null;
  assignmentSource: string | null; assignedAt: string | null; firstContactAt: string | null;
  slaStatus: import("@zhivago/shared").SlaStatus;
  nextAction: { kind: "TASK" | "VISIT"; at: string | null; title: string } | null;
  conversationId: string | null;
}
export interface ContactPerson {
  id: string; name: string; email: string; phone: string | null;
  lastActivityAt: string; firstEntryAt: string;
  visibleOpportunities: number; matchedOpportunities: number;
  stages: Record<string, number>;
  opportunities: ContactOpportunity[];
}
interface ContactsBase { sort: string; page: number; limit: number; peopleTotal: number; opportunityTotal: number; total: number }
export type WorkspaceContacts = (ContactsBase & { view: "people"; items: ContactPerson[] }) | (ContactsBase & { view: "opportunities"; items: ContactOpportunity[] });
export interface WorkspaceContactDetail {
  contact: { id: string; name: string; email: string; phone: string | null; avatar: string | null; createdAt: string };
  opportunities: ContactOpportunity[];
  entries: { id: string; leadId: string; source: string; kind: string; createdAt: string; note: string | null }[];
  lastActivityAt: string | null;
  canMutate: boolean;
}
export interface UnassignedQueue {
  total: number; page: number; limit: number;
  items: { id: string; status: string; source: string; createdAt: string; queuedAt: string | null; queueReason: string | null; queueReasonLabel: string; ageHours: number;
    user: { id: string; name: string; email: string; phone: string | null };
    listing: { id: string; name: string; operationType: string; building: { id: string; name: string } | null } }[];
}
export interface WorkspaceMessage { id: string; isClosed: boolean; property: { name: string }; lead: { id: string; status: string; slaStatus: import("@zhivago/shared").SlaStatus; user: { name: string } } | null; messages: { content: string; createdAt: string }[] }
