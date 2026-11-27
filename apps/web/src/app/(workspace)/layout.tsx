import { cookies } from "next/headers";
import { getWorkspaceSession } from "@/lib/workspace";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { SIDEBAR_COOKIE } from "@/components/workspace/sidebar-cookie";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { membership, user } = await getWorkspaceSession();
  if (!membership || !user) return children;
  // Preferência de barra lateral recolhida lida no servidor: a página já nasce no estado certo.
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";
  return <WorkspaceShell membership={membership} user={user} hasSeason={membership.organization.hasSeason ?? false} initialCollapsed={collapsed}>{children}</WorkspaceShell>;
}
