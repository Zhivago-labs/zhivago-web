import styles from "@/components/contacts/Contacts.module.css";

/** Primeira carga de Contatos: mesma estrutura da tela (cabeçalho, seletor, superfície e linhas). */
export default function LoadingContacts() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.header}><h1>Contatos</h1></header>
      <div className={styles.tableSwitch} aria-hidden="true"><span className={styles.skeleton} style={{ width: 180, margin: "10px 0" }} /></div>
      <section className={styles.surface} role="status" aria-label="Carregando contatos">
        <div className={styles.views}><span className={styles.skeleton} style={{ width: 360, margin: "13px 0" }} /></div>
        <div className={styles.toolbar}><span className={styles.skeleton} style={{ width: "100%", height: 34 }} /></div>
        <div style={{ padding: 12, display: "grid", gap: 14 }}>
          {Array.from({ length: 8 }, (_, i) => <span key={i} className={styles.skeleton} style={{ width: `${92 - (i % 3) * 9}%` }} />)}
        </div>
      </section>
    </main>
  );
}
