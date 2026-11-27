// Tipos e constantes compartilhados entre apps/mobile, apps/web e apps/server.
// Mantido em sincronia manual com server/prisma/schema.prisma — não é gerado automaticamente.

export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type AccountType = 'INDIVIDUAL' | 'AGENCY';

export type ListingType = 'casa' | 'apartamento';
export type ListingCategory = 'aluguel' | 'venda';
export type BillingCycle = 'noite' | 'mês';
export type ListingStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED' | 'SOLD' | 'RENTED';
// Operação comercial explícita (seção 3 da spec de refatoração) — fonte principal a partir da
// qual o domínio deve trabalhar. category/billingCycle continuam por compatibilidade.
export type ListingOperationType = 'SALE' | 'MONTHLY_RENT' | 'DAILY_RENT';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REJECTED';

export type MessageType =
  | 'TEXT'
  | 'BOOKING_REQUEST'
  | 'BOOKING_APPROVED'
  | 'BOOKING_REJECTED'
  | 'OFFER_REQUEST'
  | 'OFFER_APPROVED'
  | 'OFFER_REJECTED'
  | 'NEGOTIATION_ROUND';

export type NotificationType = 'INFO' | 'MESSAGE' | 'BOOKING' | 'SYSTEM';

export type OfferStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'COUNTERED'
  | 'WITHDRAWN'
  | 'EXPIRED'
  | 'CANCELLED';

// Negociação de valor no chat (apps/server/src/lib/negotiations.ts).
export type NegotiationStatus = 'OPEN' | 'AGREED' | 'CLOSED' | 'EXPIRED';
export type NegotiationSide = 'CUSTOMER' | 'LISTING';

export interface PurchasedProperty {
  id: string;
  conversationId: string | null;
  confirmedAt: string;
  value: number;
  paymentMethod: string | null;
  listing: {
    id: string;
    name: string;
    location: string;
    image: string | null;
    type: string;
    bedrooms: number;
    bathrooms: number;
    parking: number;
  };
}

export interface NegotiationRound {
  id: string;
  value: number;
  unit: 'TOTAL' | 'MONTHLY';
  paymentMethod: string | null;
  status: OfferStatus;
  expiresAt: string | null;
  previousOfferId: string | null;
  proposedById: string;
  proposedByName: string;
  side: NegotiationSide;
  createdAt: string;
}

export interface Negotiation {
  id: string;
  conversationId: string | null;
  listingId: string;
  customerId: string;
  bookingId: string | null;
  operationType: ListingOperationType;
  status: NegotiationStatus;
  referencePrice: number;
  agreedValue: number | null;
  createdAt: string;
  rounds: NegotiationRound[];
}

// B2B (Organization/OrganizationMember) — evoluído de Company/CompanyMember (Fase B) em
// 2026-08-30, ver docs/crm-b2b-organizacoes-leads.md.
export type OrganizationMemberRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'BROKER' | 'ASSISTANT';
export type OrganizationMemberStatus = 'ACTIVE' | 'INACTIVE';
export type OrganizationType = 'AGENCY' | 'INDIVIDUAL';
export type LeadDistributionMode = 'MANUAL' | 'ROUND_ROBIN';

export interface OrganizationMemberUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface OrganizationMember {
  id: string;
  role: OrganizationMemberRole;
  status: OrganizationMemberStatus;
  receiveLeads: boolean;
  userId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  user?: OrganizationMemberUser;
}

export interface Organization {
  hasSeason?: boolean;
  legalName: string | null;
  address: string | null;
  businessHours: string | null;
  whatsapp: string | null;
  id: string;
  name: string;
  type: OrganizationType;
  document: string;
  email: string | null;
  phone: string | null;
  logo: string | null;
  description: string | null;
  verified: boolean;
  leadDistributionMode: LeadDistributionMode;
  createdAt: string;
  updatedAt: string;
  members: OrganizationMember[];
}

// Empreendimento (seção 8 da spec de refatoração do cadastro) — agrupa Listings de uma mesma
// organização sob um responsável exclusivo por Leads (leadOwner), com um backup opcional.
export interface OrganizationBuilding {
  id: string;
  name: string;
  address: string | null;
  organizationId: string;
  leadOwnerMemberId: string | null;
  backupMemberId: string | null;
  createdAt: string;
  updatedAt: string;
  leadOwner: OrganizationMember | null;
  backupMember: OrganizationMember | null;
  _count: { listings: number };
}

export interface OrganizationInvite {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationMemberRole;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  organization?: { id: string; name: string; logo: string | null };
  // Só presente em `GET /organizations/invites/me` (o próprio convidado) — a listagem de
  // gestão (`GET /organizations/invites`, OWNER/ADMIN) não expõe o token de ninguém.
  token?: string;
}

export interface ListingOwner {
  id: string;
  name: string;
  avatar: string | null;
  email?: string;
  phone?: string | null;
  accountType?: AccountType;
  companyName?: string | null;
  logoUrl?: string | null;
  creci?: string | null;
  verified?: boolean;
  /** Página pública do imóvel: desde quando anuncia e quantos anúncios ativos tem. */
  createdAt?: string;
  _count?: { listings: number };
}

export interface ListingImage {
  id: string;
  url: string;
  order: number;
}

// CRM B2B — Fase 2 (ver docs/crm-b2b-organizacoes-leads.md): Lead nasce quando um usuário
// demonstra interesse (hoje: abre conversa) num imóvel de organização.
export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'VISIT_SCHEDULED'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

export interface LeadAssignment {
  id: string;
  leadId: string;
  brokerId: string;
  assignedBy: string | null;
  assignedAt: string;
  firstContactAt: string | null;
  firstContactChannel?: string | null;
  unassignedAt: string | null;
  reason: string | null;
  source?: string | null;
  broker?: OrganizationMember;
}

// SLA é só cálculo sob demanda a partir de assignedAt/firstContactAt (1ª resposta EFETIVA: mensagem
// humana ao cliente ou contato externo com sucesso — nota e mudança de etapa não contam).
export type SlaStatus = 'UNASSIGNED' | 'PENDING' | 'AT_RISK' | 'OVERDUE' | 'RESPONDED_ON_TIME' | 'RESPONDED_LATE' | 'CLOSED';

// Tarefa/próxima ação (seção 112/117 da spec) — puramente uma checklist com prazo, sem
// lembrete/automação proativa.
export interface LeadTask {
  id: string;
  leadId: string;
  memberId: string;
  assigneeId?: string | null;
  title: string;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  member?: OrganizationMember;
  assignee?: OrganizationMember | null;
}

export interface Lead {
  id: string;
  status: LeadStatus;
  source: string;
  userId: string;
  listingId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  lostReason?: string | null;
  lostNote?: string | null;
  closedAt?: string | null;
  reopenedAt?: string | null;
  queuedAt?: string | null;
  queueReason?: string | null;
  lastActivityAt?: string;
  user: OrganizationMemberUser;
  listing: { id: string; name: string; operationType?: string; images: { url: string }[] };
  // Só a atribuição aberta (unassignedAt null) — histórico completo fica no backend, não exposto aqui.
  assignments: LeadAssignment[];
  // Só a tarefa incompleta mais próxima do prazo ("próxima ação") — histórico completo só no detalhe.
  tasks: LeadTask[];
  slaStatus: SlaStatus;
}

// `GET /leads` (org-wide) agora pagina e filtra no servidor (seção 118/119 da spec).
export interface PaginatedLeads {
  allTotal: number;
  summary: { active: number; overdue: number; unassigned: number; byStatus: Record<string, number>; pageByStatus?: Record<string, number> };
  items: Lead[];
  total: number;
  page: number;
  limit: number;
}

// CRM B2B — Fase 3: log de contato (LeadInteraction) e agendamento estruturado (Visit).
export type LeadInteractionType = 'PHONE_CALL' | 'WHATSAPP' | 'EMAIL' | 'NOTE' | 'VISIT' | 'STATUS_CHANGE' | 'REOPEN';
export type VisitStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface LeadInteraction {
  id: string;
  leadId: string;
  memberId: string;
  type: LeadInteractionType;
  outcome?: 'CONTACT' | 'ATTEMPT' | null;
  content: string | null;
  createdAt: string;
  member?: OrganizationMember;
}

export interface Visit {
  id: string;
  leadId: string;
  brokerId: string;
  scheduledAt: string;
  status: VisitStatus;
  notes: string | null;
  createdAt: string;
  broker?: OrganizationMember;
}

// Página de detalhe do lead (`GET /leads/:id`) — histórico completo, diferente da listagem (Kanban)
// que só traz a atribuição aberta.
export interface LeadTimelineEvent {
  id: string;
  kind: 'ENTRY' | 'ASSIGNMENT' | 'UNASSIGNMENT' | 'INTERACTION' | 'STATUS' | 'VISIT' | 'TASK' | 'TASK_DONE';
  at: string;
  actor: string | null;
  title: string;
  detail: string | null;
}

export interface LeadEntry {
  id: string;
  leadId: string;
  source: string;
  kind: 'ENTRY' | 'REENTRY' | 'INTENT';
  previousStatus: string | null;
  note: string | null;
  createdAt: string;
}

export interface LeadDetail extends Omit<Lead, 'assignments' | 'tasks' | 'user' | 'listing'> {
  user: OrganizationMemberUser & { phone?: string | null };
  listing: { id: string; name: string; operationType: string; building: { id: string; name: string } | null; images: { url: string }[] };
  assignmentHistory: LeadAssignment[];
  interactions: LeadInteraction[];
  visits: Visit[];
  tasks: LeadTask[];
  entries: LeadEntry[];
  timeline: LeadTimelineEvent[];
  bookings: { id: string; status: string; startDate: string; endDate: string }[];
  negotiations: { id: string; status: string; operationType: string; agreedValue: number | null }[];
  routing: { source: string | null; label: string; assignedAt: string | null };
  lostReasonLabel: string | null;
  closedByName: string | null;
  conversation: { id: string; isClosed: boolean } | null;
  hasConversation: boolean;
  viewer: { memberId: string; role: string };
}

export interface LeadAssignee {
  memberId: string;
  userId: string;
  name: string;
  avatar: string | null;
  role: string;
  receiveLeads: boolean;
  eligible: boolean;
  ineligibleReason: string | null;
  openLeads: number;
}

// Log de auditoria da organização (seção 125 da spec) — responsabilidade de empreendimento e
// moderação de imóvel; transferência/atribuição de Lead já é auditada pelo próprio histórico de
// `LeadAssignment` (assignedBy/reason/source), não duplicado aqui.
export type OrgAuditAction =
  | 'BUILDING_LEAD_OWNER_CHANGED'
  | 'BUILDING_BACKUP_CHANGED'
  | 'LISTING_ORG_APPROVED'
  | 'LISTING_ORG_REJECTED'
  | 'MEMBER_REMOVED';

export interface OrganizationAuditLogEntry {
  id: string;
  organizationId: string;
  actorMemberId: string;
  action: OrgAuditAction;
  entityType: 'BUILDING' | 'LISTING' | 'MEMBER';
  entityId: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: OrganizationMember;
}

export interface PaginatedAuditLog {
  items: OrganizationAuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

// CRM B2B — Fase 4: métricas agregadas da organização (`GET /organizations/metrics`).
export interface OrganizationBrokerMetrics {
  memberId: string;
  name: string;
  receiveLeads?: boolean;
  assignedCount: number;
  openCount?: number;
  awaitingResponse?: number;
  wonCount: number;
  avgResponseHours: number | null;
  medianResponseHours?: number | null;
}

export interface MetricsCut {
  key: string;
  label: string;
  entries: number;
  won: number;
  lost: number;
  winRateClosed: number | null;
  medianResponseHours: number | null;
  respondedCount: number;
}

export interface OrganizationMetrics {
  totalLeads: number;
  wonCount: number;
  lostCount: number;
  conversionRate: number;
  avgResponseHours: number | null;
  slaCompliancePct: number | null;
  funnelCounts: { status: LeadStatus; count: number }[];
  leadsPerMonth: { label: string; value: number }[];
  byBroker: OrganizationBrokerMetrics[];
  formerBrokers: { memberId: string; name: string; assignmentCount: number; avgResponseHours: number | null }[];
  slaHours?: number;
  snapshot?: { open: number; unassigned: number; awaitingResponse: number; overdue: number; byStatus: Record<string, number> };
  period?: {
    days: number;
    since: string;
    entries: number;
    won: number;
    lost: number;
    winRateClosed: number | null;
    response: { assignments: number; responded: number; medianHours: number | null; p90Hours: number | null; onTime: number; due: number; onTimeRate: number | null };
    timeToAssignment: { assigned: number; medianHours: number | null; p90Hours: number | null };
    lostReasons: { reason: string; label: string; count: number }[];
    bySource: MetricsCut[];
    byOperationType: MetricsCut[];
    byBuilding: MetricsCut[];
    byResponsible: MetricsCut[];
  };
}

export interface Listing {
  isDemo?: boolean;
  id: string;
  name: string;
  description: string | null;
  price: number;
  originalPrice?: number | null;
  type: ListingType;
  category: ListingCategory;
  billingCycle: BillingCycle | null;
  operationType: ListingOperationType;
  images: ListingImage[];
  location: string;
  // Localização estruturada (seção 62 da spec de refatoração do cadastro).
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  bedrooms: number;
  suites?: number;
  bathrooms: number;
  parking: number;
  privateArea?: number | null;
  totalArea?: number | null;
  amenities?: string | null;
  /** JSON com "outros diferenciais" em texto livre (ex.: "Vista para o mar"). */
  features?: string | null;
  /** "Sobre a região": comércio, transporte, escolas etc. */
  neighborhood?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  customMaxGuests?: number | null;
  minimumNights?: number | null;
  cleaningFee?: number | null;
  houseRules?: string | null;
  safetyItems?: string | null;
  cancellationPolicy?: string | null;
  // Condições de VENDA/ALUGUEL MENSAL (seções 66/67 da spec de refatoração do cadastro).
  condoFee?: number | null;
  iptuAnnual?: number | null;
  acceptsFinancing?: boolean | null;
  acceptsExchange?: boolean | null;
  iptuMonthly?: number | null;
  availableFrom?: string | null;
  minimumLeaseMonths?: number | null;
  guaranteeTypes?: string | null;
  isFurnished?: boolean | null;
  allowPets?: boolean | null;
  acceptsNegotiation?: boolean;
  // Piso sigiloso — a API só devolve para o próprio anunciante.
  minNegotiablePrice?: number | null;
  status: ListingStatus;
  viewCount: number;
  ownerId: string | null;
  owner: ListingOwner | null;
  // B2B (Organization) — paralelo a ownerId, nunca ambos preenchidos.
  organizationId?: string | null;
  agentId?: string | null;
  createdById?: string | null;
  buildingId?: string | null;
  organization?: { id: string; name: string; logo: string | null; verified: boolean; createdAt?: string; _count?: { listings: number } } | null;
  agent?: { id: string; name: string; avatar: string | null } | null;
  createdAt: string;
  updatedAt: string;
}
