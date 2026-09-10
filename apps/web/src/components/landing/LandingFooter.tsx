import Link from "next/link";
import { SmoothAnchorLink } from "./SmoothAnchorLink";
import shared from "./shared.module.css";
import styles from "./LandingFooter.module.css";

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={`${shared.wrap} ${styles.footerInner}`}>
        <div className={styles.logo}>
          zhiv<span>a</span>go
        </div>
        <div className={styles.footerLinks}>
          <SmoothAnchorLink href="#marketplace">Imóveis</SmoothAnchorLink>
          <SmoothAnchorLink href="#crm">Imobiliárias</SmoothAnchorLink>
          <Link href="/login">Entrar</Link>
        </div>
        <div>© {year} Zhivago</div>
      </div>
    </footer>
  );
}
