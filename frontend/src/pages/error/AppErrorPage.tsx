import { Button } from "@/components/ui/Button";
import styles from "@/pages/error/AppErrorPage.module.scss";

export function AppErrorPage() {
  return (
    <main className={styles.page}>
      <section className={styles.content} role="alert">
        <p className={styles.code}>Application error</p>
        <h1>Something went wrong</h1>
        <p>The page could not be displayed. No changes were made.</p>
        <Button onClick={() => window.location.reload()}>Reload the page</Button>
      </section>
    </main>
  );
}
