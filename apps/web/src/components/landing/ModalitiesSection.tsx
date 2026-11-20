import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import shared from "./shared.module.css";
import styles from "./ModalitiesSection.module.css";

export interface ModalityTile {
  /** Valor de ?categoria= no /imoveis. */
  categoria: "venda" | "aluguel" | "temporada";
  title: string;
  text: string;
  count: number;
  image: string | null;
}

/** Comprar, alugar ou temporada — cada bloco com a foto de um imóvel real daquela modalidade. */
export function ModalitiesSection({ tiles }: { tiles: ModalityTile[] }) {
  const visible = tiles.filter((tile) => tile.count > 0);
  if (visible.length < 2) return null;

  return (
    <section className={styles.section} aria-labelledby="modalities-title">
      <div className={shared.wrap}>
        <div className={shared.sectionHead}>
          <div className={shared.sectionKicker}>Do seu jeito</div>
          <h2 id="modalities-title" className={shared.sectionTitle}>Como você quer morar?</h2>
        </div>
        <ul className={styles.grid}>
          {visible.map((tile) => (
            <li key={tile.categoria}>
              <Link href={`/imoveis?categoria=${tile.categoria}`} className={styles.tile}>
                {tile.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tile.image} alt="" className={styles.image} loading="lazy" decoding="async" />
                ) : (
                  <span className={styles.image} aria-hidden="true" />
                )}
                <span className={styles.body}>
                  <span className={styles.count}>
                    {tile.count} {tile.count === 1 ? "imóvel" : "imóveis"}
                  </span>
                  <span className={styles.title}>{tile.title}</span>
                  <span className={styles.text}>{tile.text}</span>
                </span>
                <span className={styles.arrow} aria-hidden="true">
                  <ArrowUpRight size={18} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
