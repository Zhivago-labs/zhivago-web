import type { SlaStatus } from "@zhivago/shared";
import styles from "./SlaBadge.module.css";

const LABELS: Record<SlaStatus, string> = {
  UNASSIGNED: "Sem responsável",
  PENDING: "Aguardando resposta",
  AT_RISK: "Em risco",
  OVERDUE: "Atrasado",
  RESPONDED_ON_TIME: "Respondido no prazo",
  RESPONDED_LATE: "Respondido com atraso",
  CLOSED: "Encerrado",
};

/**
 * `compact` (cards/listas): só mostra o que pede ação — risco, atraso, sem responsável.
 * Completo (ficha): sempre mostra o estado da 1ª resposta.
 */
export function SlaBadge({ status, hideOnTime = true }: { status: SlaStatus | string; hideOnTime?: boolean }) {
  const known = (status in LABELS ? status : "PENDING") as SlaStatus;
  if (hideOnTime && !["AT_RISK", "OVERDUE", "UNASSIGNED"].includes(known)) return null;
  const toneClass =
    known === "OVERDUE" || known === "RESPONDED_LATE" ? styles.overdue
      : known === "AT_RISK" || known === "UNASSIGNED" ? styles.atRisk
        : known === "RESPONDED_ON_TIME" ? styles.onTime
          : styles.neutral;
  return <span className={`${styles.badge} ${toneClass}`} title="Tempo até a 1ª resposta efetiva (prazo: 4 h)">{LABELS[known]}</span>;
}
