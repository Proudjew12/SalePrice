import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { Icon } from "@/components/ui/Icon";
import { CATALOG_LIMITS } from "../types";
import styles from "./CatalogDialog.module.scss";

interface CatalogDialogProps {
  mode: "product" | "license";
  productName?: string;
  onClose: () => void;
  onSubmit: (name: string, firstLicense: string) => string | null;
}

export function CatalogDialog({ mode, productName, onClose, onSubmit }: CatalogDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const firstInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const isProduct = mode === "product";
  const title = isProduct ? "Add product" : "Add license";

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    firstInput.current?.focus();
    return () => element?.close();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = form.get("name");
    const firstLicense = form.get("firstLicense");
    if (typeof name !== "string") return;
    setError(onSubmit(name, typeof firstLicense === "string" ? firstLicense : ""));
  }

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="catalog-dialog-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className={styles.header}>
        <h2 id="catalog-dialog-title">{title}</h2>
        <button type="button" className={styles.close} aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button>
      </div>
      <p className={styles.description}>{isProduct ? "Add a product and its first license to your catalog." : `Add a license to ${productName ?? "this product"}.`}</p>
      <form onSubmit={submit}>
        <label htmlFor="catalog-name">{isProduct ? "Product name" : "License name"}</label>
        <input ref={firstInput} id="catalog-name" name="name" type="text" required maxLength={CATALOG_LIMITS.name} autoComplete="off" />
        {isProduct ? <>
          <label htmlFor="catalog-first-license">First license name</label>
          <input id="catalog-first-license" name="firstLicense" type="text" required maxLength={CATALOG_LIMITS.name} autoComplete="off" />
        </> : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.actions}>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.submit}>{title}</button>
        </div>
      </form>
    </dialog>
  );
}
