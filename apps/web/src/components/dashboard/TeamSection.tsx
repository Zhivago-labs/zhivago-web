import Link from "next/link";
import { Users, Home, UserCheck, Mail, ArrowRight, Shuffle, Building2 } from "lucide-react";
import { CreateOrganizationForm } from "./CreateOrganizationForm";
import { InviteMemberForm } from "./InviteMemberForm";
import { CancelInviteButton } from "./CancelInviteButton";
import { ReassignAgentSelect } from "./ReassignAgentSelect";
import { RemoveMemberButton } from "./RemoveMemberButton";
import { LeadDistributionModeToggle } from "./LeadDistributionModeToggle";
import { ReceiveLeadsToggle } from "./ReceiveLeadsToggle";
import type { MyOrganization, OrganizationListing } from "@/lib/organizations-api";
import type { OwnedListing } from "@/lib/listings-api";
import type { OrganizationInvite } from "@zhivago/shared";
import styles from "./TeamSection.module.css";

export const ROLE_LABELS: Record<string, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  BROKER: "Corretor",
  ASSISTANT: "Assistente",
};

const STATUS_LABELS: Record<string, string> = { DRAFT: "Rascunho", PENDING: "Em análise", APPROVED: "Publicado", REJECTED: "Rejeitado", SOLD: "Vendido", RENTED: "Alugado" };
const RECEIVES_LEADS_ROLES = ["BROKER", "MANAGER"];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0] ?? "").join("").toUpperCase() || "?";
}

function ListingRow({ listing, children }: { listing: OwnedListing; children?: React.ReactNode }) {
  const cover = listing.images[0]?.url;
  return (
    <li className={styles.listingRow}>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className={styles.listingThumb} loading="lazy" />
      ) : (
        <span className={styles.listingThumb}><Home size={20} aria-hidden="true" /></span>
      )}
      <div className={styles.listingInfo}>
        <strong>{listing.name}</strong>
        <span>{listing.location}</span>
      </div>
      <span className={styles.statusBadge} data-status={listing.status}>{STATUS_LABELS[listing.status] ?? listing.status}</span>
      {children}
    </li>
  );
}

export function TeamSection({
  isAgency,
  membership,
  canManageTeam,
  currentUserId,
  organizationListings,
  assignedListings,
  pendingInvites,
}: {
  isAgency: boolean;
  membership: MyOrganization | null;
  canManageTeam: boolean;
  currentUserId: string;
  organizationListings: OrganizationListing[];
  assignedListings: OwnedListing[];
  pendingInvites: OrganizationInvite[];
}) {
  if (!membership) {
    if (!isAgency) return null;

    return (
      <section className={styles.section}>
        <CreateOrganizationForm />
      </section>
    );
  }

  const { role, organization } = membership;
  const hasOrgWideView = role === "OWNER" || role === "MANAGER" || role === "ADMIN" || role === "ASSISTANT";
  const canManageDistribution = role === "OWNER" || role === "ADMIN";
  const members = [...organization.members].sort((a, b) => (a.role === "OWNER" ? -1 : b.role === "OWNER" ? 1 : 0));
  const listings = hasOrgWideView ? organizationListings : assignedListings;

  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon} data-tone="accent"><Users size={18} aria-hidden="true" /></span>
          <div className={styles.sectionText}>
            <h2 className={styles.sectionTitle}>Membros da equipe <span className={styles.count}>{members.length}</span></h2>
            <p className={styles.sectionSubtitle}>Corretores e gestores com acesso aos imóveis e clientes da imobiliária.</p>
          </div>
        </div>

        <ul className={styles.memberList}>
          {members.map((member) => {
            const name = member.user?.name ?? "Membro";
            const isMe = member.userId === currentUserId;
            return (
              <li key={member.id} className={styles.memberRow}>
                {member.user?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.user.avatar} alt="" className={styles.memberAvatar} />
                ) : (
                  <span className={styles.memberAvatar} data-role={member.role}>{initials(name)}</span>
                )}
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{name}{isMe && <small className={styles.youTag}>você</small>}</span>
                  <span className={styles.memberEmail}>{member.user?.email}</span>
                </div>
                <span className={styles.roleBadge} data-role={member.role}>{ROLE_LABELS[member.role] ?? member.role}</span>
                <div className={styles.memberControls}>
                  {RECEIVES_LEADS_ROLES.includes(member.role) && (canManageTeam || isMe) && (
                    <span className={styles.leadsToggle}><ReceiveLeadsToggle userId={member.userId} receiveLeads={member.receiveLeads} /></span>
                  )}
                  {canManageTeam && member.role !== "OWNER" && !isMe && (
                    <RemoveMemberButton userId={member.userId} name={name} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {canManageTeam && (
          <>
            {pendingInvites.length > 0 && (
              <div className={styles.pendingInvitesBox}>
                <p className={styles.pendingInvitesTitle}>
                  <Mail size={15} aria-hidden="true" />
                  Convites por e-mail aguardando resposta <span className={styles.count} data-tone="amber">{pendingInvites.length}</span>
                </p>
                <ul className={styles.pendingInvitesList}>
                  {pendingInvites.map((invite) => (
                    <li key={invite.id} className={styles.pendingInviteRow}>
                      <span className={styles.pendingInviteEmail}>{invite.email}</span>
                      <span className={styles.roleBadge} data-role={invite.role}>{ROLE_LABELS[invite.role] ?? invite.role}</span>
                      <CancelInviteButton id={invite.id} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <InviteMemberForm />
          </>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon} data-tone="blue">{hasOrgWideView ? <Building2 size={18} aria-hidden="true" /> : <UserCheck size={18} aria-hidden="true" />}</span>
          <div className={styles.sectionText}>
            <h2 className={styles.sectionTitle}>{hasOrgWideView ? "Responsáveis pelos imóveis" : "Meus imóveis atribuídos"} <span className={styles.count}>{listings.length}</span></h2>
            <p className={styles.sectionSubtitle}>
              {hasOrgWideView
                ? canManageTeam ? "Escolha o corretor responsável pela gestão e atendimento de cada imóvel." : "Corretor responsável pela gestão e atendimento de cada imóvel."
                : "Imóveis da imobiliária pelos quais você é o corretor responsável."}
            </p>
          </div>
          <Link href="/empresa/imoveis" className={styles.headerLink}>Ver em Imóveis <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>

        {listings.length === 0 ? (
          <div className={styles.emptyStateBox}>
            <Home size={22} aria-hidden="true" />
            <p className={styles.empty}>{hasOrgWideView ? "Nenhum imóvel cadastrado na imobiliária ainda." : "Nenhum imóvel atribuído a você no momento."}</p>
          </div>
        ) : (
          <ul className={styles.listingList}>
            {hasOrgWideView
              ? organizationListings.map((listing) => (
                  <ListingRow key={listing.id} listing={listing}>
                    {canManageTeam ? (
                      <ReassignAgentSelect listingId={listing.id} currentAgentId={listing.agent?.id ?? null} members={organization.members} />
                    ) : (
                      <span className={styles.listingAgent}>{listing.agent?.name ?? "Sem responsável"}</span>
                    )}
                  </ListingRow>
                ))
              : assignedListings.map((listing) => (
                  <ListingRow key={listing.id} listing={listing}>
                    <Link href={`/anuncios/${listing.id}/editar`} className={styles.rowLink}>Editar</Link>
                  </ListingRow>
                ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon} data-tone="violet"><Shuffle size={18} aria-hidden="true" /></span>
          <div className={styles.sectionText}>
            <h2 className={styles.sectionTitle}>Distribuição de leads</h2>
            <p className={styles.sectionSubtitle}>
              Manual: um gestor escolhe quem atende cada cliente. Round robin: os novos clientes são divididos em rodízio entre quem recebe leads.
            </p>
          </div>
        </div>
        <div className={styles.distributionRow}>
          {canManageDistribution ? (
            <LeadDistributionModeToggle mode={organization.leadDistributionMode} />
          ) : (
            <span className={styles.muted}>Modo atual: <strong>{organization.leadDistributionMode === "ROUND_ROBIN" ? "Round robin" : "Manual"}</strong></span>
          )}
          <Link href="/imobiliaria" className={styles.primaryLink}>Abrir Kanban <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  );
}
