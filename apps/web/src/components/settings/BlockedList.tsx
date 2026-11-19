"use client";

import { useState } from "react";
import { Ban, AlertCircle } from "lucide-react";
import { getPublicApiUrl } from "@/lib/public-api";
import type { ChatBlockItem } from "@/lib/chat-api";
import styles from "./SettingsForms.module.css";

interface BlockedListProps {
  token: string;
  initialItems: ChatBlockItem[];
}

/**
 * Bloqueios de chat (ver lib/chat-blocks.ts no backend): os feitos por mim e, pra quem é da equipe
 * de uma imobiliária, os feitos em nome dela. Só desfaz quem pode (`canRemove`): o autor ou, nos
 * da imobiliária, o dono/administrador.
 */
export function BlockedList({ token, initialItems }: BlockedListProps) {
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUnblock = async (item: ChatBlockItem) => {
    if (!confirm(`Desbloquear ${item.target.name}? Vocês voltam a poder trocar mensagens.`)) return;
    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch(`${getPublicApiUrl()}/blocks/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== item.id));
      else setError("Não foi possível desbloquear. Tente novamente.");
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setBusyId(null);
    }
  };

  if (items.length === 0) {
    return <p className={styles.blockEmpty}>Ninguém bloqueado. Você pode bloquear alguém pelo ícone <Ban size={13} /> no chat.</p>;
  }

  return (
    <div className={styles.form}>
      {error && (
        <div className={styles.errorAlert}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      <ul className={styles.blockList}>
        {items.map((item) => (
          <li key={item.id} className={styles.blockRow}>
            <div className={styles.blockInfo}>
              <strong>{item.target.name}</strong>
              <span>
                {item.target.kind === "ORGANIZATION" ? "Imobiliária" : "Pessoa"}
                {item.scope === "ORGANIZATION" ? ` · bloqueado pela imobiliária (por ${item.blockedBy.name})` : ""}
                {" · "}
                {new Date(item.createdAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
            {item.canRemove && (
              <button
                type="button"
                className={styles.blockButton}
                onClick={() => handleUnblock(item)}
                disabled={busyId === item.id}
              >
                {busyId === item.id ? "Desbloqueando…" : "Desbloquear"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
