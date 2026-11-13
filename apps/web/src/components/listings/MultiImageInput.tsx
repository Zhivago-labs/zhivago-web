"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, X, ChevronLeft, ChevronRight, Trash2, Star, CircleAlert, ArrowLeft, ArrowRight } from "lucide-react";
import { thumbnailUrl } from "@/lib/images";
import styles from "./MultiImageInput.module.css";

const MAX_FILES = 10;
const MAX_BYTES = 20 * 1024 * 1024;

const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;

/** Foto da lista: uma que já está no anúncio (edição) ou um arquivo novo escolhido agora. */
export type PhotoItem =
  | { key: string; kind: "existing"; id: string; url: string; name: string }
  | { key: string; kind: "new"; file: File; url: string; name: string };

let keySeq = 0;
const newFiles = (list: PhotoItem[]) => list.flatMap((item) => (item.kind === "new" ? [item.file] : []));
/** O <input type="file"> guarda só as fotos novas, na ordem em que aparecem na lista. */
function writeFiles(input: HTMLInputElement | null, list: PhotoItem[]) {
  const transfer = new DataTransfer();
  newFiles(list).forEach((file) => transfer.items.add(file));
  if (input) input.files = transfer.files;
}
const newItem = (file: File): PhotoItem => ({ key: `n${++keySeq}`, kind: "new", file, url: URL.createObjectURL(file), name: file.name });

/**
 * Ordem final das fotos para o servidor: `existing:<id>` ou `new:<n>` (n = posição do arquivo no
 * `<input type="file">`, que guarda só as fotos novas, na ordem em que aparecem).
 */
export function photoOrderTokens(items: PhotoItem[]): string[] {
  let n = 0;
  return items.map((item) => (item.kind === "existing" ? `existing:${item.id}` : `new:${n++}`));
}

export function MultiImageInput({
  name = "images",
  onFilesChange,
  onItemsChange,
  initialFiles,
  existingPhotos,
  error,
}: {
  name?: string;
  /** Total de fotos e os arquivos novos (na ordem atual). */
  onFilesChange?: (count: number, files: File[]) => void;
  /** Lista completa, com URLs prontas para prévia (válidas enquanto a foto estiver na lista). */
  onItemsChange?: (items: PhotoItem[]) => void;
  initialFiles?: File[];
  /** Fotos que o anúncio já tem (modo edição). */
  existingPhotos?: { id: string; url: string }[];
  /** Erro de validação vindo do formulário (ex.: nenhuma foto ao publicar). */
  error?: string;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<PhotoItem[]>(() => [
    ...(existingPhotos ?? []).map((photo, index): PhotoItem => ({ key: `e${photo.id}`, kind: "existing", id: photo.id, url: photo.url, name: `Foto ${index + 1}` })),
    ...(initialFiles ?? []).map(newItem),
  ]);
  const itemsRef = useRef(items);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  // Problemas por arquivo (formato, tamanho, limite) — os arquivos válidos do mesmo lote entram mesmo assim.
  const [rejections, setRejections] = useState<string[]>([]);


  // Estado inicial: sincroniza o <input type="file"> e avisa o formulário (prévia, contagem).
  useEffect(() => {
    writeFiles(inputRef.current, itemsRef.current);
    onItemsChange?.(itemsRef.current);
    // Só na montagem: depois disso, cada mudança passa por `commit`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Libera as URLs locais (blob:) das fotos novas quando o componente sai da tela.
  useEffect(() => () => itemsRef.current.forEach((item) => { if (item.kind === "new") URL.revokeObjectURL(item.url); }), []);

  // Após um erro do servidor o React reinicia o <form>, o que esvazia o <input type="file">.
  // Reaplica as fotos escolhidas para que a nova tentativa envie as mesmas imagens.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => setTimeout(() => writeFiles(inputRef.current, itemsRef.current), 0);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  // Navegação por teclado (ESC para fechar, Setas Esquerda/Direita para trocar de foto)
  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedIndex(null);
      if (e.key === "ArrowLeft") setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      if (e.key === "ArrowRight") setSelectedIndex((prev) => (prev !== null && prev < items.length - 1 ? prev + 1 : prev));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, items.length]);

  const commit = (next: PhotoItem[]) => {
    // Revoga só as URLs de fotos novas que saíram da lista.
    items.forEach((item) => { if (item.kind === "new" && !next.includes(item)) URL.revokeObjectURL(item.url); });
    writeFiles(inputRef.current, next);
    itemsRef.current = next;
    setItems(next);
    onFilesChange?.(next.length, newFiles(next));
    onItemsChange?.(next);
  };

  const addFiles = (picked: File[]) => {
    if (picked.length === 0) {
      writeFiles(inputRef.current, items);
      return;
    }
    const problems: string[] = [];
    const accepted: File[] = [];
    for (const file of picked) {
      if (!file.type.startsWith("image/")) problems.push(`${file.name}: formato não suportado. Use JPEG, PNG ou WebP.`);
      else if (file.size > MAX_BYTES) problems.push(`${file.name}: ${formatMb(file.size)} — o máximo é 20 MB por foto.`);
      else if (items.length + accepted.length >= MAX_FILES) problems.push(`${file.name}: limite de ${MAX_FILES} fotos atingido.`);
      else accepted.push(file);
    }
    setRejections(problems);
    commit([...items, ...accepted.map(newItem)]);
  };

  const handleRemove = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    commit(next);
    if (selectedIndex !== null) {
      if (next.length === 0) setSelectedIndex(null);
      else if (selectedIndex >= next.length) setSelectedIndex(next.length - 1);
    }
  };

  const move = (from: number, to: number) => {
    const next = [...items];
    [next[from], next[to]] = [next[to], next[from]];
    commit(next);
  };

  const full = items.length >= MAX_FILES;
  const shown = selectedIndex !== null ? items[selectedIndex] : undefined;

  return (
    <div className={styles.wrap}>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        multiple
        onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
        className={styles.hiddenInput}
        tabIndex={-1}
        aria-hidden="true"
      />

      <button
        type="button"
        id="photos"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!full) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files ?? [])); }}
        disabled={full}
        aria-describedby={error ? errorId : undefined}
        className={`${styles.dropzone} ${items.length > 0 ? styles.dropzoneCompact : ""} ${dragging ? styles.dragging : ""} ${error ? styles.dropzoneInvalid : ""}`}
      >
        <span className={styles.dropIcon} aria-hidden="true"><ImagePlus size={22} /></span>
        <span>
          <span className={styles.dropTitle}>
            {full ? "Limite de 10 fotos atingido" : items.length > 0 ? "Adicionar mais fotos" : "Arraste as fotos aqui ou clique para escolher"}
          </span>
          <span className={styles.dropHint}>JPEG, PNG ou WebP · até 20 MB cada · até 10 fotos. A primeira foto é a capa do anúncio.</span>
        </span>
      </button>

      {error && (
        <p id={errorId} className={styles.alert} role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {rejections.length > 0 && (
        <div className={styles.alert} role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          <div>
            <p className={styles.alertTitle}>
              {rejections.length === 1 ? "1 arquivo não foi adicionado" : `${rejections.length} arquivos não foram adicionados`}
            </p>
            <ul>{rejections.map((message) => <li key={message}>{message}</li>)}</ul>
          </div>
          <button type="button" className={styles.alertClose} onClick={() => setRejections([])} aria-label="Fechar aviso">
            <X size={16} />
          </button>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className={styles.statusRow} aria-live="polite">
            <span><strong>{items.length} foto(s) selecionada(s)</strong> · a primeira é a capa</span>
            <span>{items.length} de {MAX_FILES}</span>
          </div>
          <div className={styles.meter} aria-hidden="true">
            <div className={styles.meterFill} style={{ width: `${(items.length / MAX_FILES) * 100}%` }} />
          </div>

          <div className={styles.grid}>
            {items.map((item, index) => (
              <div
                key={item.key}
                className={`${styles.thumb} ${index === 0 ? styles.thumbCover : ""}`}
                role="group"
                aria-label={`Foto ${index + 1}: ${item.name}${index === 0 ? " (capa)" : ""}`}
              >
                <button type="button" className={styles.thumbOpen} onClick={() => setSelectedIndex(index)} aria-label={`Ampliar ${item.name}`}>
                  {/* Local object URLs cannot be optimized by next/image. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.kind === "existing" ? thumbnailUrl(item.url) ?? item.url : item.url} onError={(e) => { if (item.kind === "existing" && e.currentTarget.src !== item.url) e.currentTarget.src = item.url; }} alt="" className={styles.thumbImage} />
                </button>

                {index === 0 && <span className={styles.coverBadge}>Capa</span>}
                {item.kind === "new" && index !== 0 && <span className={styles.newBadge}>Nova</span>}

                <div className={styles.photoActions}>
                  {index > 0 && (
                    <button type="button" onClick={() => commit([item, ...items.filter((_, i) => i !== index)])} aria-label={`Usar ${item.name} como capa`}>
                      <Star size={12} aria-hidden="true" />Usar como capa
                    </button>
                  )}
                  <span className={styles.moveButtons}>
                    {index > 0 && (
                      <button type="button" aria-label={`Mover ${item.name} para a esquerda`} title="Mover para a esquerda" onClick={() => move(index, index - 1)}>
                        <ArrowLeft size={13} />
                      </button>
                    )}
                    {index < items.length - 1 && (
                      <button type="button" aria-label={`Mover ${item.name} para a direita`} title="Mover para a direita" onClick={() => move(index, index + 1)}>
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </span>
                </div>

                <button type="button" className={styles.removeButton} onClick={() => handleRemove(index)} aria-label={`Remover ${item.name}`} title="Remover foto">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── LIGHTBOX MODAL DE VISUALIZAÇÃO AMPLIADA ── */}
      {selectedIndex !== null && shown && (
        <div className={styles.lightboxOverlay} onClick={() => setSelectedIndex(null)}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Foto ${selectedIndex + 1} de ${items.length}`}>
            <div className={styles.lightboxHeader}>
              <span className={styles.lightboxCounter}>Foto {selectedIndex + 1} de {items.length} — {shown.name}</span>
              <div className={styles.lightboxActions}>
                <button type="button" className={styles.lightboxRemoveBtn} onClick={() => handleRemove(selectedIndex)} title="Excluir esta foto">
                  <Trash2 size={15} />
                  <span>Excluir foto</span>
                </button>
                <button type="button" className={styles.lightboxCloseBtn} onClick={() => setSelectedIndex(null)} title="Fechar (Esc)" aria-label="Fechar">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className={styles.lightboxImageWrap}>
              {selectedIndex > 0 && (
                <button type="button" className={`${styles.navBtn} ${styles.prevBtn}`} onClick={() => setSelectedIndex(selectedIndex - 1)} title="Foto anterior (Seta para esquerda)" aria-label="Foto anterior">
                  <ChevronLeft size={24} />
                </button>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shown.url} alt={shown.name} className={styles.lightboxImage} />
              {selectedIndex < items.length - 1 && (
                <button type="button" className={`${styles.navBtn} ${styles.nextBtn}`} onClick={() => setSelectedIndex(selectedIndex + 1)} title="Próxima foto (Seta para direita)" aria-label="Próxima foto">
                  <ChevronRight size={24} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
