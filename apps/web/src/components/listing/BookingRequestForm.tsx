"use client";

import { useState } from "react";
import { CalendarRange, MessageCircle, Lock } from "lucide-react";
import { useChatSocket } from "@/components/chat/ChatSocketProvider";
import { RentalBookingCalendar } from "./RentalBookingCalendar";
import { getPublicApiUrl } from "@/lib/public-api";
import { useRouter } from "next/navigation";
import type { Listing } from "@zhivago/shared";
import { stayQuote } from "@/lib/stay-period";
import styles from "./BookingRequestForm.module.css";

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export type BookingTerms = Pick<Listing, "id" | "price" | "cleaningFee" | "minimumNights">;
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function BookingRequestForm({ terms, onChatOpened }: { terms: BookingTerms; onChatOpened?: () => void }) {
  const { id: listingId, price } = terms;
  const cleaningFee = terms.cleaningFee ?? 0;
  const minimum = Math.max(1, terms.minimumNights ?? 1);
  const router = useRouter();
  const { token, openSidebar } = useChatSocket();
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedChat, setSubmittedChat] = useState<string | null>(null);

  const quote = stayQuote(startDate, endDate, price, cleaningFee);
  const isPeriodValid = quote !== null && quote.nights >= minimum;

  const handleSelectPeriod = (start: string | null, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !quote || !isPeriodValid || pending || submittedChat) return;
    if (!token) {
      router.push(`/login?next=/imovel/${listingId}`);
      return;
    }

    setPending(true);
    setError(null);

    try {
      const res = await fetch(`${getPublicApiUrl()}/listings/${listingId}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          estimatedTotal: quote.total,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? data?.message ?? "Não foi possível solicitar a reserva.");
        return;
      }

      if (data?.conversationId) {
        setSubmittedChat(data.conversationId);
        openSidebar(data.conversationId);
        onChatOpened?.();
      }
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setPending(false);
    }
  };

  if (submittedChat) return (
    <div className={styles.form}>
      <p role="status">Solicitação enviada. Aguardando confirmação do anunciante.</p>
      <button type="button" className={styles.button} onClick={() => openSidebar(submittedChat)}>Abrir conversa</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <p className={styles.title}>
        <CalendarRange size={16} />
        Solicitar estadia
      </p>

      {/* Calendário com Dias Ocupados */}
      <RentalBookingCalendar
        listingId={listingId}
        startDate={startDate}
        endDate={endDate}
        onSelectPeriod={handleSelectPeriod}
      />

      <div className={styles.selectedPeriodBox} aria-live="polite">
        <span>Estadia mínima de {minimum} {minimum === 1 ? "noite" : "noites"}</span>
        <span>Entrada · {startDate ? formatDateBR(startDate) : "Selecione a entrada"}</span>
        <span>Saída · {endDate ? formatDateBR(endDate) : "Selecione a saída"}</span>
        {quote && <>
          <span>{quote.nights} {quote.nights === 1 ? "noite" : "noites"} × {currency.format(price)}</span>
          <span>Taxa de limpeza · {currency.format(cleaningFee)}</span>
          <strong>Total estimado · {currency.format(quote.total)}</strong>
          {!isPeriodValid && <span>Escolha um período que atenda à estadia mínima.</span>}
        </>}
      </div>
      <small>O anunciante precisa confirmar a solicitação.</small>

      {error && <p className={styles.error}>{error}</p>}

      {/* O Chat só é liberado após a escolha da data */}
      <button
        type="submit"
        className={`${styles.button} ${!isPeriodValid ? styles.buttonDisabled : ""}`}
        disabled={pending || !isPeriodValid}
      >
        {!isPeriodValid ? (
          <>
            <Lock size={16} />
            Selecione um período válido
          </>
        ) : pending ? (
          "Enviando solicitação…"
        ) : (
          <>
            <MessageCircle size={18} />
            Solicitar reserva e abrir chat
          </>
        )}
      </button>
    </form>
  );
}
