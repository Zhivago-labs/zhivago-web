"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, X, ChevronLeft, ChevronRight, Trash2, Star, CircleAlert, ArrowLeft, ArrowRight } from "lucide-react";
import styles from "./MultiImageInput.module.css";

const MAX_FILES = 10;
const MAX_BYTES = 20 * 1024 * 1024;

const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;

export function MultiImageInput({
  name = "images",
  onFilesChange,
  initialFiles,
  error,
}: {
  name?: string;
  onFilesChange?: (count: number, files: File[]) => void;
  initialFiles?: File[];
  /** Erro de validação vindo do formulário (ex.: nenhuma foto ao publicar). */
  error?: string;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>(initialFiles ?? []);
  const filesRef = useRef<File[]>(initialFiles ?? []);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  // URLs de preview para as imagens selecionadas
  const [previewUrls, setPreviewUrls] = useState<string[]>(() => (initialFiles ?? []).map(file => URL.createObjectURL(file)));
  // Problemas por arquivo (formato, tamanho, limite) — os arquivos válidos do mesmo lote entram mesmo assim.
  const [rejections, setRejections] = useState<string[]>([]);

  const writeInput = (next: File[]) => {
    const transfer = new DataTransfer();
    next.forEach(file => transfer.items.add(file));
    if (inputRef.current) inputRef.current.files = transfer.files;
  };

  useEffect(() => {
    if (!initialFiles) return;
    writeInput(initialFiles);
  }, [initialFiles]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Após um erro do servidor o React reinicia o <form>, o que esvazia o <input type="file">.
  // Reaplica as fotos escolhidas para que "Publicar" de novo envie as mesmas imagens.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => setTimeout(() => writeInput(filesRef.current), 0);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  // Navegação por teclado (ESC para fechar, Setas Esquerda/Direita para trocar de foto)
  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedIndex(null);
      if (e.key === "ArrowLeft") {
        setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      }
      if (e.key === "ArrowRight") {
        setSelectedIndex((prev) => (prev !== null && prev < files.length - 1 ? prev + 1 : prev));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, files.length]);

  const syncInput = (next: File[]) => {
    writeInput(next);
    setFiles(next);
    setPreviewUrls(next.map(file => URL.createObjectURL(file)));
    onFilesChange?.(next.length, next);
  };

  const addFiles = (picked: File[]) => {
    if (picked.length === 0) {
      writeInput(files);
      return;
    }
    const problems: string[] = [];
    const accepted: File[] = [];
    for (const file of picked) {
      if (!file.type.startsWith("image/")) problems.push(`${file.name}: formato não suportado. Use JPEG, PNG ou WebP.`);
      else if (file.size > MAX_BYTES) problems.push(`${file.name}: ${formatMb(file.size)} — o máximo é 20 MB por foto.`);
      else if (files.length + accepted.length >= MAX_FILES) problems.push(`${file.name}: limite de ${MAX_FILES} fotos atingido.`);
      else accepted.push(file);
    }
    setRejections(problems);
    syncInput([...files, ...accepted]);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []));
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files ?? []));
  };

  const handleRemove = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextFiles = files.filter((_, i) => i !== index);
    syncInput(nextFiles);

    if (selectedIndex !== null) {
      if (nextFiles.length === 0) {
        setSelectedIndex(null);
      } else if (selectedIndex >= nextFiles.length) {
        setSelectedIndex(nextFiles.length - 1);
      }
    }
  };

  const move = (from: number, to: number) => {
    const next = [...files];
    [next[from], next[to]] = [next[to], next[from]];
    syncInput(next);
  };

  const full = files.length >= MAX_FILES;

  return (
    <div className={styles.wrap}>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        multiple
        onChange={handleChange}
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
        onDrop={handleDrop}
        disabled={full}
        aria-describedby={error ? errorId : undefined}
        className={`${styles.dropzone} ${files.length > 0 ? styles.dropzoneCompact : ""} ${dragging ? styles.dragging : ""} ${error ? styles.dropzoneInvalid : ""}`}
      >
        <span className={styles.dropIcon} aria-hidden="true"><ImagePlus size={22} /></span>
        <span>
          <span className={styles.dropTitle}>
            {full ? "Limite de 10 fotos atingido" : files.length > 0 ? "Adicionar mais fotos" : "Arraste as fotos aqui ou clique para escolher"}
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

      {files.length > 0 && (
        <>
          <div className={styles.statusRow} aria-live="polite">
            <span><strong>{files.length} foto(s) selecionada(s)</strong> · a primeira é a capa</span>
            <span>{files.length} de {MAX_FILES}</span>
          </div>
          <div className={styles.meter} aria-hidden="true">
            <div className={styles.meterFill} style={{ width: `${(files.length / MAX_FILES) * 100}%` }} />
          </div>
        </>
      )}

      {files.length > 0 && (
        <div className={styles.grid}>
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className={`${styles.thumb} ${index === 0 ? styles.thumbCover : ""}`}
              role="group"
              aria-label={`Foto ${index + 1}: ${file.name}${index === 0 ? " (capa)" : ""}`}
            >
              <button type="button" className={styles.thumbOpen} onClick={() => setSelectedIndex(index)} aria-label={`Ampliar ${file.name}`}>
                {previewUrls[index] && (
                  // Local object URLs cannot be optimized by next/image.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrls[index]} alt="" className={styles.thumbImage} />
                )}
              </button>

              {index === 0 && <span className={styles.coverBadge}>Capa</span>}

              <div className={styles.photoActions}>
                {index > 0 && (
                  <button type="button" onClick={() => syncInput([file, ...files.filter((_, i) => i !== index)])} aria-label={`Usar ${file.name} como capa`}>
                    <Star size={12} aria-hidden="true" />Usar como capa
                  </button>
                )}
                <span className={styles.moveButtons}>
                  {index > 0 && (
                    <button type="button" aria-label={`Mover ${file.name} para a esquerda`} title="Mover para a esquerda" onClick={() => move(index, index - 1)}>
                      <ArrowLeft size={13} />
                    </button>
                  )}
                  {index < files.length - 1 && (
                    <button type="button" aria-label={`Mover ${file.name} para a direita`} title="Mover para a direita" onClick={() => move(index, index + 1)}>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </span>
              </div>

              <button
                type="button"
                className={styles.removeButton}
                onClick={(e) => handleRemove(index, e)}
                aria-label={`Remover ${file.name}`}
                title="Remover foto"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── LIGHTBOX MODAL DE VISUALIZAÇÃO AMPLIADA ── */}
      {selectedIndex !== null && files[selectedIndex] && (
        <div className={styles.lightboxOverlay} onClick={() => setSelectedIndex(null)}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Foto ${selectedIndex + 1} de ${files.length}`}>
            {/* Cabeçalho do modal */}
            <div className={styles.lightboxHeader}>
              <span className={styles.lightboxCounter}>
                Foto {selectedIndex + 1} de {files.length} — {files[selectedIndex].name}
              </span>

              <div className={styles.lightboxActions}>
                <button
                  type="button"
                  className={styles.lightboxRemoveBtn}
                  onClick={() => handleRemove(selectedIndex)}
                  title="Excluir esta foto"
                >
                  <Trash2 size={15} />
                  <span>Excluir foto</span>
                </button>
                <button
                  type="button"
                  className={styles.lightboxCloseBtn}
                  onClick={() => setSelectedIndex(null)}
                  title="Fechar (Esc)"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Imagem em alta resolução */}
            <div className={styles.lightboxImageWrap}>
              {selectedIndex > 0 && (
                <button
                  type="button"
                  className={`${styles.navBtn} ${styles.prevBtn}`}
                  onClick={() => setSelectedIndex(selectedIndex - 1)}
                  title="Foto anterior (Seta para esquerda)"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrls[selectedIndex]}
                alt={files[selectedIndex].name}
                className={styles.lightboxImage}
              />

              {selectedIndex < files.length - 1 && (
                <button
                  type="button"
                  className={`${styles.navBtn} ${styles.nextBtn}`}
                  onClick={() => setSelectedIndex(selectedIndex + 1)}
                  title="Próxima foto (Seta para direita)"
                  aria-label="Próxima foto"
                >
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
