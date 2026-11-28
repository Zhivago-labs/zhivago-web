"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChatBubble, Copy, ExternalLink, Mail, Phone, Check, Xmark, RefreshCw } from "@/components/icons";
import { loadContactPreview, type ContactPreviewResult } from "@/lib/actions/contacts";
import type { ContactOpportunity, WorkspaceContactDetail } from "@/lib/workspace-types";
import { OPERATION_LABELS, SOURCE_LABELS } from "@/lib/leads-api";
import { avatarTone, initials, STAGE_LABELS, STAGE_TONES, fmtAge, fmtDateTime } from "@/components/workspace/workspace-ui";
import { SlaBadge } from "@/components/dashboard/SlaBadge";
import { AddInteractionForm } from "@/components/dashboard/AddInteractionForm";
import { AddTaskForm } from "@/components/dashboard/AddTaskForm";
import { useChatSocket } from "@/components/chat/ChatSocketProvider";
import styles from "./Contacts.module.css";

type Props = {
  userId: string;
  selectedLeadId: string | null;
  focusListings: boolean;
  /** Volta da ficha completa: lista + esta prévia aberta. */
  backHref: string;
  taskMembers: { memberId: string; name: string }[];
  onSelectLead: (leadId: string) => void;
  onClose: () => void;
  /** Após salvar algo: recarrega a lista ao fundo (última atividade, próxima ação). */
  onMutated: () => void;
};

export function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={styles.copyButton}
      aria-label={copied ? `${label} copiado` : `Copiar ${label}`}
      title={copied ? "Copiado" : `Copiar ${label}`}
      onClick={async (event) => {
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* sem permissão de área de transferência: o texto continua selecionável */ }
      }}
    >
      {copied ? <Check width={14} height={14} aria-hidden="true" /> : <Copy width={14} height={14} aria-hidden="true" />}
    </button>
  );
}

function nextActionText(opp: ContactOpportunity) {
  if (!opp.nextAction) return "Nenhuma";
  return `${opp.nextAction.title}${opp.nextAction.at ? ` · ${fmtDateTime(opp.nextAction.at)}` : " · sem prazo"}`;
}

/**
 * Prévia lateral da pessoa. A lista continua montada atrás; fecha por botão ou Esc. Mostra só as
 * oportunidades que o backend autoriza (o escopo do papel é aplicado em `/organizations/contacts`).
 * A conversa só aparece para participantes — acesso de gestão à oportunidade não dá leitura do chat.
 */
export function ContactPreview({ userId, selectedLeadId, focusListings, backHref, taskMembers, onSelectLead, onClose, onMutated }: Props) {
  const [result, setResult] = useState<ContactPreviewResult | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const requestRef = useRef(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const listingsRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const { openSidebar } = useChatSocket();

  const fetchPreview = useCallback(() => {
    const request = ++requestRef.current;
    return loadContactPreview(userId).then((next) => {
      if (request !== requestRef.current) return;
      setResult(next);
      setLoadedFor(userId);
      setReloading(false);
    });
  }, [userId]);
  /** `keepCurrent`: recarga após salvar mantém os dados na tela; "tentar novamente" volta ao carregando. */
  const load = useCallback((keepCurrent: boolean) => {
    if (keepCurrent) setReloading(true);
    else setLoadedFor(null);
    return fetchPreview();
  }, [fetchPreview]);

  useEffect(() => {
    // Carrega ao abrir (o componente remonta a cada pessoa).
    void fetchPreview();
  }, [fetchPreview]);

  const loading = loadedFor !== userId;
  const data: WorkspaceContactDetail | null = !loading && result?.ok ? result.data : null;

  // Foco: botão fechar ao abrir (o componente remonta a cada pessoa); seção de imóveis, uma vez,
  // quando aberta pelo "+N" — recarregar depois de salvar não rouba o foco do formulário.
  const openedForListings = useRef(focusListings);
  const listingsFocused = useRef(false);
  useEffect(() => { if (!openedForListings.current) closeRef.current?.focus(); }, []);
  useEffect(() => { if (!focusListings) listingsFocused.current = false; }, [focusListings]);
  useEffect(() => {
    if (focusListings && data && !listingsFocused.current) {
      listingsFocused.current = true;
      listingsRef.current?.focus();
    }
  }, [focusListings, data]);

  const opportunities = data?.opportunities ?? [];
  const selected = opportunities.find((o) => o.id === selectedLeadId) ?? opportunities[0] ?? null;
  const canMutate = !!data?.canMutate;

  const afterMutation = useCallback(() => {
    void load(true);
    onMutated();
  }, [load, onMutated]);

  return (
    <aside
      className={styles.preview}
      aria-labelledby={titleId}
      aria-busy={loading || reloading}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className={styles.previewHead}>
        <button ref={closeRef} type="button" className={styles.iconButton} onClick={onClose} aria-label="Fechar prévia">
          <Xmark width={18} height={18} aria-hidden="true" />
        </button>
        {data ? (
          <div className={styles.previewIdentity}>
            <span className={styles.avatar} data-tone={avatarTone(data.contact.name)}>{initials(data.contact.name)}</span>
            <div>
              <h2 id={titleId}>{data.contact.name}</h2>
              <p className={styles.muted}>
                {opportunities.length} {opportunities.length === 1 ? "oportunidade visível" : "oportunidades visíveis"} · última atividade {fmtAge(data.lastActivityAt)}
              </p>
            </div>
          </div>
        ) : (
          <h2 id={titleId} className={styles.srOnly}>Prévia do contato</h2>
        )}
        {reloading && <span className={styles.muted} role="status">Atualizando…</span>}
      </div>

      {loading ? (
        <div className={styles.previewBody} role="status" aria-label="Carregando contato">
          <span className={styles.skeleton} style={{ width: "60%" }} />
          <span className={styles.skeleton} style={{ width: "40%" }} />
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
        </div>
      ) : !result?.ok ? (
        <div className={styles.previewBody}>
          <div className={styles.previewError} role="alert">
            <strong>{result?.notFound ? "Contato não disponível" : "Não foi possível carregar o contato"}</strong>
            <span>{result?.error}</span>
            {!result?.notFound && (
              <button type="button" className={styles.secondaryBtn} onClick={() => void load(false)}>
                <RefreshCw width={15} height={15} aria-hidden="true" />Tentar novamente
              </button>
            )}
          </div>
        </div>
      ) : data && (
        <div className={styles.previewBody}>
          <dl className={styles.contactFacts}>
            <div>
              <dt>Telefone</dt>
              <dd>{data.contact.phone ? <><a href={`tel:${data.contact.phone.replace(/[^+\d]/g, "")}`}><Phone width={14} height={14} aria-hidden="true" />{data.contact.phone}</a><CopyValue value={data.contact.phone} label="telefone" /></> : <span className={styles.muted}>Sem telefone</span>}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd><a href={`mailto:${data.contact.email}`}><Mail width={14} height={14} aria-hidden="true" />{data.contact.email}</a><CopyValue value={data.contact.email} label="e-mail" /></dd>
            </div>
          </dl>

          <section aria-labelledby={`${titleId}-imoveis`}>
            <h3 id={`${titleId}-imoveis`} ref={listingsRef} tabIndex={-1} className={styles.previewSectionTitle}>
              Imóveis de interesse ({opportunities.length})
            </h3>
            <ul className={styles.oppList} role="list">
              {opportunities.map((opp) => {
                const active = opp.id === selected?.id;
                return (
                  <li key={opp.id}>
                    <button type="button" className={styles.oppCard} aria-pressed={active} onClick={() => onSelectLead(opp.id)}>
                      <span className={styles.oppCardTop}>
                        <strong>{opp.listing.name}</strong>
                        <span className={styles.badge} data-tone={STAGE_TONES[opp.status] ?? "slate"}>{STAGE_LABELS[opp.status] ?? opp.status}</span>
                      </span>
                      <span className={styles.oppCardMeta}>
                        Responsável: {opp.broker?.name ?? "Sem responsável"}
                      </span>
                      <span className={styles.oppCardMeta}>Próxima ação: {nextActionText(opp)}</span>
                      <SlaBadge status={opp.slaStatus} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {selected && (
            <section className={styles.actionsBox} aria-labelledby={`${titleId}-acoes`} key={selected.id}>
              <h3 id={`${titleId}-acoes`} className={styles.previewSectionTitle}>Ações nesta negociação</h3>
              <p className={styles.target} aria-live="polite">
                <strong>{selected.listing.name}</strong> · {OPERATION_LABELS[selected.listing.operationType] ?? selected.listing.operationType}
                <br />
                <span className={styles.muted}>Responsável: {selected.broker?.name ?? "Sem responsável"} · origem {SOURCE_LABELS[selected.source] ?? selected.source}</span>
              </p>
              <div className={styles.actionLinks}>
                {selected.conversationId ? (
                  <button type="button" className={styles.secondaryBtn} onClick={() => openSidebar(selected.conversationId!, "organization")}>
                    <ChatBubble width={16} height={16} aria-hidden="true" />Abrir conversa
                  </button>
                ) : (
                  <span className={styles.muted}>Conversa disponível só para quem participa do atendimento.</span>
                )}
                <Link className={styles.secondaryBtn} href={`/imobiliaria/leads/${selected.id}?back=${encodeURIComponent(backHref)}`}>
                  <ExternalLink width={16} height={16} aria-hidden="true" />Abrir ficha completa
                </Link>
              </div>
              {canMutate ? (
                <>
                  <details className={styles.actionForm} open>
                    <summary>Registrar interação</summary>
                    <AddInteractionForm leadId={selected.id} onSuccess={afterMutation} />
                  </details>
                  <details className={styles.actionForm}>
                    <summary>Criar tarefa</summary>
                    <AddTaskForm leadId={selected.id} members={taskMembers} onSuccess={afterMutation} />
                  </details>
                </>
              ) : (
                <p className={styles.muted}>Seu perfil pode consultar, mas não alterar esta negociação.</p>
              )}
            </section>
          )}
        </div>
      )}
    </aside>
  );
}
