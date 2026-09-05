import { Link } from "react-router-dom";

import styles from "@/pages/not-found/NotFoundPage.module.scss";

export function NotFoundPage() {
  return (
    <section className={styles.page}>
      <p className={styles.code}>404</p>
      <h1>Page not found</h1>
      <p>The requested route does not exist.</p>
      <Link to="/">Return home</Link>
    </section>
  );
}
