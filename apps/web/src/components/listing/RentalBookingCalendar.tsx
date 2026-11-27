"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Lock } from "@/components/icons";
import { getPublicApiUrl } from "@/lib/public-api";
import { InlineLoading } from "@/components/feedback/InlineLoading";
import { stayOverlaps, type BookedRange } from "@/lib/stay-period";
import styles from "./RentalBookingCalendar.module.css";

interface RentalBookingCalendarProps {
  listingId: string;
  startDate: string | null;
  endDate: string | null;
  onSelectPeriod: (start: string | null, end: string | null) => void;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function RentalBookingCalendar({
  listingId,
  startDate,
  endDate,
  onSelectPeriod,
}: RentalBookingCalendarProps) {
  const [ranges, setRanges] = useState<BookedRange[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [warning, setWarning] = useState<string | null>(null);

  // Carrega as reservas confirmadas do imóvel
  useEffect(() => {
    let ignore = false;

    fetch(`${getPublicApiUrl()}/listings/${listingId}/bookings`)
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao carregar disponibilidade");
        return res.json();
      })
      .then((data: BookedRange[]) => {
        if (ignore) return;
        setRanges(data);
        setLoading(false);
      })
      .catch(() => {
        if (!ignore) { setLoadError(true); setLoading(false); }
      });

    return () => {
      ignore = true;
    };
  }, [listingId, attempt]);

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

  const daysInMonth = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

    // Dias do mês anterior para alinhar a grade
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthDays - i);
      days.push({ dateStr: toDateString(prevDate), dayNum: prevDate.getDate(), isCurrentMonth: false });
    }

    // Dias do mês atual
    for (let i = 1; i <= totalDays; i++) {
      const curDate = new Date(year, month, i);
      days.push({ dateStr: toDateString(curDate), dayNum: i, isCurrentMonth: true });
    }

    // Dias do próximo mês para completar a última semana
    const remaining = 42 - days.length; // 6 linhas completas
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({ dateStr: toDateString(nextDate), dayNum: i, isCurrentMonth: false });
    }

    return days;
  }, [currentMonthDate]);

  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayClick = (dateStr: string) => {
    setWarning(null);
    if (!startDate || endDate || dateStr <= startDate) {
      onSelectPeriod(dateStr, null);
    } else if (stayOverlaps(ranges, startDate, dateStr)) {
      setWarning("Há uma noite reservada nesse intervalo. Escolha outra data de saída.");
    } else {
      onSelectPeriod(startDate, dateStr);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.monthTitle}>
          {MONTH_NAMES[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}
        </span>
        <div className={styles.navButtons}>
          <button type="button" onClick={handlePrevMonth} className={styles.navButton} title="Mês anterior">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={handleNextMonth} className={styles.navButton} title="Próximo mês">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className={styles.weekdaysGrid}>
        {WEEKDAYS.map((w) => (
          <span key={w} className={styles.weekday}>
            {w}
          </span>
        ))}
      </div>

      {loading ? (
        <InlineLoading>Carregando calendário…</InlineLoading>
      ) : loadError ? (
        <p role="alert">Disponibilidade indisponível. <button type="button" onClick={() => {
          setLoadError(false); setLoading(true); setAttempt(value => value + 1);
        }}>Tentar novamente</button></p>
      ) : (
        <div className={styles.daysGrid}>
          {daysInMonth.map(({ dateStr, dayNum, isCurrentMonth }) => {
            const isBooked = ranges.some(range => range.startDate.slice(0, 10) <= dateStr && range.endDate.slice(0, 10) > dateStr);
            const checkoutOnly = Boolean(isBooked && startDate && !endDate && dateStr > startDate && !stayOverlaps(ranges, startDate, dateStr));
            const isPast = dateStr < todayStr;
            const isStart = startDate === dateStr;
            const isEnd = endDate === dateStr;
            const isInRange = Boolean(startDate && endDate && dateStr > startDate && dateStr < endDate);
            const isDisabled = (isBooked && !checkoutOnly) || isPast || !isCurrentMonth;

            let dayClass = styles.dayCell;
            if (!isCurrentMonth) dayClass += ` ${styles.otherMonth}`;
            if (isPast) dayClass += ` ${styles.pastDay}`;
            if (isBooked && !checkoutOnly) dayClass += ` ${styles.bookedDay}`;
            if (isStart) dayClass += ` ${styles.startDay}`;
            if (isEnd) dayClass += ` ${styles.endDay}`;
            if (isInRange) dayClass += ` ${styles.inRangeDay}`;

            return (
              <button
                key={dateStr}
                type="button"
                className={dayClass}
                disabled={isDisabled}
                onClick={() => handleDayClick(dateStr)}
                aria-label={`${dayNum} de ${MONTH_NAMES[currentMonthDate.getMonth()]} de ${currentMonthDate.getFullYear()}${checkoutOnly ? ", disponível apenas para saída" : ""}`}
                title={checkoutOnly ? "Disponível apenas para saída" : isBooked ? "Noite reservada" : undefined}
              >
                <span>{dayNum}</span>
                {isBooked && !checkoutOnly && <Lock size={10} className={styles.lockIcon} />}
              </button>
            );
          })}
        </div>
      )}

      {warning && <p className={styles.warningText}>{warning}</p>}

      <div className={styles.legendRow}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.availableDot}`} />
          <span>Disponível</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.bookedDot}`} />
          <span>Reservado</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.selectedDot}`} />
          <span>Selecionado</span>
        </div>
      </div>
    </div>
  );
}
