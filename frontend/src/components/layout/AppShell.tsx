import type { MouseEvent, ReactNode } from "react";

import { env } from "@/shared/config/env";
import styles from "@/components/layout/AppShell.module.scss";

interface AppShellProps {
  children: ReactNode;
}

function skipToMainContent(event: MouseEvent<HTMLAnchorElement>): void {
  event.preventDefault();
  const mainContent = document.getElementById("main-content");
  mainContent?.focus({ preventScroll: true });
  mainContent?.scrollIntoView({ block: "start" });
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content" onClick={skipToMainContent}>
        Skip to main content
      </a>
      <header className={styles.header}>
        <span className={styles.brand}>
          {env.appName}
        </span>
      </header>
      <main className={styles.main} id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className={styles.footer}>{env.appName}</footer>
    </div>
  );
}
