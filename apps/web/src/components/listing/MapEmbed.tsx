"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Mapa do Google embutido que só é criado quando fica visível na tela. Dentro de uma aba fechada
 * (display: none) o Google calcula o mapa com tamanho zero e ele aparece em branco ao abrir a aba;
 * criando só quando visível, o mapa nasce no tamanho certo — e não carrega à toa se ninguém abrir.
 */
export function MapEmbed({ src, title, className }: { src: string; title: string; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || visible) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    observer.observe(box);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={boxRef} className={className}>
      {visible && <iframe title={title} src={src} style={{ display: "block", width: "100%", height: "100%", border: 0, borderRadius: "inherit" }} />}
    </div>
  );
}
