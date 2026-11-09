import Link from "next/link";
import { Search, Calendar } from "iconoir-react";
import { requireWorkspace, workspaceFetch } from "@/lib/workspace";
import type { ReceivedBookingsPage } from "@/lib/listings-api";
import { ReceivedBookingItem } from "@/components/dashboard/ReceivedBookingItem";
import styles from "@/components/workspace/Workspace.module.css";
export const metadata = { title: "Reservas e temporada" };
export default async function Reservations({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) {
  const { token, membership } = await requireWorkspace("/empresa/reservas");
  const params = await searchParams;
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  const query = new URLSearchParams({ page: String(page), search: params.search?.slice(0,120) || "" });
  const data = await workspaceFetch<ReceivedBookingsPage>(token, `/organizations/bookings?${query}`);
  const href = (page: number) => `/empresa/reservas?${new URLSearchParams({ page: String(page), search: params.search || "" })}`;
  return <main className={styles.page}>
    <div className={styles.header}><div><h1>Reservas / Temporada</h1><p className={styles.muted}>Reservas dos imóveis de temporada da imobiliária, conforme seu acesso. Os valores são os acordados na reserva; não representam receita recebida.</p></div></div>
    <form className={`${styles.filters} ${styles.toolbar}`}><div className={styles.searchField}><Search width={18} height={18} aria-hidden="true" /><input type="search" name="search" aria-label="Buscar hóspede ou imóvel" placeholder="Buscar hóspede ou imóvel" defaultValue={params.search || ""} /></div><button type="submit">Buscar</button>{params.search && <Link href="/empresa/reservas" className={styles.secondary}>Limpar</Link>}</form>
    <p className={styles.resultCount} role="status">{data.total} {data.total === 1 ? "reserva encontrada" : "reservas encontradas"}</p>
    {data.bookings.length ? data.bookings.map(booking => <ReceivedBookingItem key={booking.id} booking={booking} readOnly={membership.role === "ASSISTANT"} />) : <div className={styles.emptyState}><Calendar aria-hidden="true" /><strong>{params.search ? "Nenhuma reserva para esta busca" : "Nenhuma reserva de temporada"}</strong><span>{params.search ? "Tente outro nome de hóspede ou imóvel." : "As reservas dos imóveis de temporada aparecem aqui."}</span></div>}
    {data.totalPages > 1 && <nav className={styles.pagination} aria-label="Páginas de reservas">{page > 1 && <Link href={href(page - 1)}>← Anterior</Link>}<span>Página {page} de {data.totalPages}</span>{page < data.totalPages && <Link href={href(page + 1)}>Próxima →</Link>}</nav>}
  </main>;
}
