import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, BadgeCheck, Clock, FileText, Users, UserCheck, KeyRound, Mail, Home } from "lucide-react";
import workspace from "@/components/workspace/Workspace.module.css";
import teamHeader from "./TeamHeader.module.css";
import { requireAuth } from "@/lib/session";
import {
  getMyOrganization,
  getOrganizationListings,
  getMyAssignedListings,
  getMyPendingInvites,
  getOrganizationInvites,
  getOrganizationBuildings,
  getOrganizationAuditLog,
} from "@/lib/organizations-api";
import { TeamSection } from "@/components/dashboard/TeamSection";
import { PendingInviteCard } from "@/components/dashboard/PendingInviteCard";
import { BuildingsSection } from "@/components/dashboard/BuildingsSection";
import { AuditLogSection } from "@/components/dashboard/AuditLogSection";
import { JoinCodeSection } from "@/components/dashboard/JoinCodeSection";
import { getJoinCode, getPendingJoinRequests } from "@/lib/join-requests-api";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Equipe" };

const MANAGE_ROLES = ["OWNER", "ADMIN"];
const ORG_WIDE_VIEW_ROLES = ["OWNER", "ADMIN", "MANAGER", "ASSISTANT"];

export default async function EquipePage() {
  const { token, user } = await requireAuth("/equipe");
  const isAgency = user.accountType === "AGENCY";

  const [membership, myInvites] = await Promise.all([
    getMyOrganization(token),
    getMyPendingInvites(token),
  ]);

  if (!membership) {
    return (
      <main className={styles.main}>
        <Link href={user.role === "ADMIN" ? "/imoveis" : "/dashboard"} className={styles.backLink}>
          <ArrowLeft size={15} />
          {user.role === "ADMIN" ? "Voltar aos imóveis" : "Voltar ao dashboard"}
        </Link>
        <h1 className={styles.title}>Equipe</h1>

        {myInvites.length > 0 && (
          <div className={styles.invitesList}>
            {myInvites.map((invite) => (
              <PendingInviteCard key={invite.id} invite={invite} />
            ))}
          </div>
        )}

        {isAgency ? (
          <>
            <p className={styles.subtitle}>
              Crie uma organização para adicionar corretores e distribuir seus imóveis entre eles.
            </p>
            <TeamSection
              isAgency={isAgency}
              membership={null}
              canManageTeam={false}
              currentUserId={user.id}
              organizationListings={[]}
              assignedListings={[]}
              pendingInvites={[]}
            />
          </>
        ) : myInvites.length === 0 ? (
          <p className={styles.restricted}>Criar uma organização é exclusivo para contas Imobiliária.</p>
        ) : null}
      </main>
    );
  }

  const canManageTeam = MANAGE_ROLES.includes(membership.role);
  const hasOrgWideView = ORG_WIDE_VIEW_ROLES.includes(membership.role);

  const [organizationListings, assignedListings, pendingInvites, buildings, auditLog, joinCode, joinRequests] = await Promise.all([
    hasOrgWideView ? getOrganizationListings(token) : Promise.resolve([]),
    !hasOrgWideView ? getMyAssignedListings(token) : Promise.resolve([]),
    canManageTeam ? getOrganizationInvites(token) : Promise.resolve([]),
    getOrganizationBuildings(token),
    canManageTeam ? getOrganizationAuditLog(token) : Promise.resolve(null),
    canManageTeam ? getJoinCode(token) : Promise.resolve(null),
    canManageTeam ? getPendingJoinRequests(token) : Promise.resolve([]),
  ]);

  const eligibleMembers = membership.organization.members.filter(
    (m) => m.status === "ACTIVE" && (m.role === "OWNER" || m.role === "MANAGER" || m.role === "BROKER")
  );

  const { organization } = membership;
  const activeMembers = organization.members.filter((m) => m.status === "ACTIVE");
  const receivingLeads = activeMembers.filter((m) => (m.role === "BROKER" || m.role === "MANAGER") && m.receiveLeads).length;
  const metrics = [
    { value: activeMembers.length, label: activeMembers.length === 1 ? "Membro ativo" : "Membros ativos", icon: Users, tone: "accent" },
    { value: receivingLeads, label: "Recebendo novos clientes", icon: UserCheck, tone: "green" },
    ...(canManageTeam ? [
      { value: joinRequests.length, label: "Pedidos para entrar", icon: KeyRound, tone: "amber" },
      { value: pendingInvites.length, label: "Convites por e-mail pendentes", icon: Mail, tone: "blue" },
    ] : [
      { value: hasOrgWideView ? organizationListings.length : assignedListings.length, label: hasOrgWideView ? "Imóveis da imobiliária" : "Imóveis atribuídos a você", icon: Home, tone: "blue" },
    ]),
  ];

  return (
    <main className={workspace.page}>
      <div className={workspace.header}>
        <div>
          <h1>Equipe</h1>
          <p className={workspace.muted}>Membros da {organization.name}, quem atende cada imóvel e como os novos clientes são distribuídos.</p>
        </div>
        <div className={teamHeader.badges}>
          {organization.verified
            ? <span className={teamHeader.badge} data-tone="green"><BadgeCheck size={15} aria-hidden="true" />Imobiliária verificada</span>
            : <span className={teamHeader.badge} data-tone="amber"><Clock size={15} aria-hidden="true" />Aguardando verificação</span>}
          {organization.document && organization.document !== "00000000000000" && <span className={teamHeader.badge}><FileText size={15} aria-hidden="true" />CNPJ {organization.document}</span>}
        </div>
      </div>

      <div className={workspace.metrics}>
        {metrics.map(({ value, label, icon: Icon, tone }) => (
          <div className={workspace.metric} data-tone={tone} key={label}>
            <span className={workspace.metricIcon}><Icon size={20} aria-hidden="true" /></span>
            <div><strong>{value}</strong><span>{label}</span></div>
          </div>
        ))}
      </div>

      {joinCode && <JoinCodeSection code={joinCode} requests={joinRequests} organizationName={membership.organization.name} />}

      <div className={teamHeader.stack}>
        <TeamSection
          isAgency={isAgency}
          membership={membership}
          canManageTeam={canManageTeam}
          currentUserId={user.id}
          organizationListings={organizationListings}
          assignedListings={assignedListings}
          pendingInvites={pendingInvites}
        />

        <BuildingsSection buildings={buildings} eligibleMembers={eligibleMembers} canManage={canManageTeam} />

        {auditLog && <AuditLogSection entries={auditLog.items} />}
      </div>
    </main>
  );
}
