"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HomeSimple, Group, ViewColumns3, Building, ChatBubble, Calendar, Settings, Plus, Menu, Xmark, ArrowLeft, User, LogOut, UserXmark, NavArrowLeft, NavArrowRight } from "@/components/icons";
import type { MyOrganization } from "@/lib/organizations-api";
import type { SessionUser } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth";
import { useChatSocket } from "@/components/chat/ChatSocketProvider";
import styles from "./Workspace.module.css";
import { SIDEBAR_COOKIE } from "./sidebar-cookie";
export function WorkspaceShell({ membership, user, hasSeason, initialCollapsed = false, children }: { membership: MyOrganization; user: SessionUser; hasSeason: boolean; initialCollapsed?: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const { setWorkspaceActive } = useChatSocket();
  useEffect(() => {
    setWorkspaceActive(true);
    return () => setWorkspaceActive(false);
  }, [setWorkspaceActive]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const elements = () => Array.from(document.querySelectorAll<HTMLElement>('#company-navigation a, #company-navigation button, #company-navigation summary'))
      .filter(element => element.getClientRects().length > 0);
    elements()[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const list = elements();
      if (event.shiftKey && document.activeElement === list[0]) { event.preventDefault(); list.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === list.at(-1)) { event.preventDefault(); list[0]?.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [open]);
  // Recolher/expandir a barra lateral no desktop; a escolha fica num cookie (lido no layout).
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }
  const company = membership.organization;
  const canCreate = ["OWNER", "ADMIN", "BROKER"].includes(membership.role);
  const canConfigure = ["OWNER", "ADMIN"].includes(membership.role);
  const links = [
    { href: "/empresa", label: "Início", icon: HomeSimple },
    { href: "/empresa/contatos", label: "Contatos", icon: Group },
    ...(["OWNER", "ADMIN", "MANAGER", "ASSISTANT"].includes(membership.role) ? [{ href: "/empresa/fila", label: "Sem responsável", icon: UserXmark }] : []),
    { href: "/imobiliaria", label: "Kanban", icon: ViewColumns3 },
    { href: "/empresa/imoveis", label: "Imóveis", icon: Building },
    { href: "/empresa/mensagens", label: "Mensagens", icon: ChatBubble },
    ...(hasSeason ? [{ href: "/empresa/reservas", label: "Reservas / Temporada", icon: Calendar }] : []),
    { href: "/equipe", label: "Equipe", icon: Group },
    ...(canConfigure ? [{ href: "/configuracoes/imobiliaria", label: "Configurações da imobiliária", icon: Settings }] : []),
  ];
  const tip = (label: string) => (collapsed ? label : undefined);
  return <div className={`${styles.shell} ${collapsed ? styles.collapsed : ""}`} data-workspace="true">
    <div className={styles.mobileBar}><Link href="/empresa">Zhivago · {company.name}</Link><button type="button" aria-expanded={open} aria-controls="company-navigation" aria-label={open ? "Fechar navegação" : "Abrir navegação"} onClick={() => setOpen(!open)}>{open ? <Xmark /> : <Menu />}</button></div>
    <aside id="company-navigation" className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}>
      <div className={styles.sidebarTop}>
        <Link href="/empresa" className={styles.brand}><Image priority src="/images/system/logo.png" alt="Zhivago" width={132} height={40} /></Link>
        <button type="button" className={styles.collapseToggle} onClick={toggleCollapsed} aria-expanded={!collapsed} aria-controls="company-navigation" aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"} title={collapsed ? "Expandir menu" : "Recolher menu"}>
          {collapsed ? <NavArrowRight width={18} height={18} aria-hidden="true" /> : <NavArrowLeft width={18} height={18} aria-hidden="true" />}
        </button>
      </div>
      <div className={styles.companyIdentity} title={tip(company.name)}>{company.logo ? <Image unoptimized src={company.logo} alt="" width={42} height={42} /> : <span>{company.name.split(/\s+/).slice(0,2).map(word => word[0]).join("").toUpperCase()}</span>}<div className={styles.label}><strong>{company.name}</strong><small>Imobiliária ativa</small></div></div>
      {canCreate && <Link href="/anuncios/novo" className={`${styles.primary} ${pathname.startsWith("/empresa/contatos") ? styles.primaryQuiet : ""}`} onClick={() => setOpen(false)} title={tip("Novo anúncio")} aria-label={collapsed ? "Novo anúncio" : undefined}><Plus width={20} height={20} aria-hidden="true" /><span className={styles.label}>Novo anúncio</span></Link>}
      <nav aria-label="Área da imobiliária">{links.map(({ href, label, icon: Icon }) => {
        const active = href === "/empresa" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`) || (href === "/empresa/imoveis" && pathname.startsWith("/anuncios"));
        return <Link href={href} key={href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)} title={tip(label)} aria-label={collapsed ? label : undefined}><Icon width={20} height={20} strokeWidth={1.5} aria-hidden="true" /><span className={styles.label}>{label}</span></Link>;
      })}</nav>
      <Link href="/imoveis" className={styles.publicLink} title={tip("Voltar ao site público")} aria-label={collapsed ? "Voltar ao site público" : undefined}><ArrowLeft width={18} height={18} aria-hidden="true" /><span className={styles.label}>Voltar ao site público</span></Link>
      <details className={styles.personal}><summary title={tip(user.name)}>{user.avatar ? <Image unoptimized src={user.avatar} alt="" width={32} height={32} /> : <User width={24} height={24} />}<span className={styles.label}>{user.name}<small>Conta pessoal</small></span></summary><Link href="/configuracoes" onClick={() => setOpen(false)}>Minha conta</Link><Link href="/imoveis-comprados" onClick={() => setOpen(false)}>Imóveis comprados</Link><form action={logoutAction}><button type="submit"><LogOut width={18} height={18} />Sair</button></form></details>
    </aside>
    {open && <button className={styles.scrim} aria-label="Fechar navegação" onClick={() => setOpen(false)} />}
    <div className={styles.content}>{children}</div>
  </div>;
}
