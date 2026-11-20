"use client";

import { useState } from "react";
import { CalendarRange, X } from "lucide-react";
import { BookingRequestForm, type BookingTerms } from "./BookingRequestForm";
import styles from "./MobileRentTrigger.module.css";

export function MobileRentTrigger({ terms }: { terms: BookingTerms }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        <CalendarRange size={18} />
        Escolher datas
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <h3 className={styles.title}>Solicitar estadia</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setOpen(false)} title="Fechar">
                <X size={18} />
              </button>
            </div>
            <div className={styles.content}>
              <BookingRequestForm terms={terms} onChatOpened={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
