import { useLayoutEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { Icon } from "@/components/ui/Icon";
import { CATALOG_LIMITS } from "../types";
import type { CatalogLicense, CatalogProduct, LicensePrices } from "../types";
import styles from "./CatalogDialog.module.scss";

export type CatalogDialogTarget =
  | { kind: "add-product" }
  | { kind: "edit-product"; product: CatalogProduct }
  | { kind: "add-license"; product: CatalogProduct }
  | { kind: "edit-license"; product: CatalogProduct; license: CatalogLicense };

export interface CatalogEditorInput {
  name: string;
  shortName: string;
  firstLicense: string;
  prices: LicensePrices;
}

interface CatalogDialogProps {
  target: CatalogDialogTarget;
  onClose: () => void;
  onSubmit: (input: CatalogEditorInput) => string | null;
  onDelete?: () => string | null;
}

const PRICE_FIELDS = [
  { id: "monthly", label: "Monthly price", unit: "per license / month" },
  { id: "annual-monthly", label: "Annual paid monthly price", unit: "per license / month" },
  { id: "annual-upfront", label: "Annual upfront price", unit: "per license / year" },
] as const;

function readText(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export function CatalogDialog({ target, onClose, onSubmit, onDelete }: CatalogDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const firstInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const isProduct = target.kind === "add-product" || target.kind === "edit-product";
  const isEditing = target.kind === "edit-product" || target.kind === "edit-license";
  const existingProduct = target.kind === "edit-product" ? target.product : undefined;
  const existingLicense = target.kind === "edit-license" ? target.license : undefined;
  const title = `${isEditing ? "Edit" : "Add"} ${isProduct ? "product" : "license"}`;
  const description = isProduct
    ? isEditing ? "Update this product in your catalog." : "Add a product and its first license."
    : `Manage a license for ${target.product.name}.`;

  useLayoutEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element?.showModal();
    firstInput.current?.focus();
    return () => {
      // Close before React removes the dialog so keyboard focus can return to its trigger.
      element?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(onSubmit({
      name: readText(form, "name"),
      shortName: readText(form, "shortName"),
      firstLicense: readText(form, "firstLicense"),
      prices: {
        monthly: readText(form, "monthly"),
        "annual-monthly": readText(form, "annual-monthly"),
        "annual-upfront": readText(form, "annual-upfront"),
      },
    }));
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="catalog-dialog-title"
      aria-describedby="catalog-dialog-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
    >
      <div className={styles.header}>
        <h2 id="catalog-dialog-title">{title}</h2>
        <button type="button" className={styles.close} aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button>
      </div>
      <p id="catalog-dialog-description" className={styles.description}>{description}</p>
      <form onSubmit={submit}>
        <div className={styles.field}>
          <label htmlFor="catalog-name">{isProduct ? "Product name" : "License name"}</label>
          <input
            ref={firstInput}
            id="catalog-name"
            name="name"
            type="text"
            defaultValue={existingProduct?.name ?? existingLicense?.name ?? ""}
            required
            maxLength={CATALOG_LIMITS.name}
            autoComplete="off"
          />
        </div>
        {isProduct ? <div className={styles.field}>
          <label htmlFor="catalog-short-name">Short label</label>
          <input
            id="catalog-short-name"
            name="shortName"
            type="text"
            defaultValue={existingProduct?.shortName ?? ""}
            required={isEditing}
            maxLength={4}
            placeholder="Up to 4 characters"
            autoComplete="off"
            aria-describedby="catalog-short-name-help"
          />
          <p id="catalog-short-name-help" className={styles.hint}>Shown below the product icon. {isEditing ? "" : "Leave blank to use initials."}</p>
        </div> : null}
        {target.kind === "add-product" ? <div className={styles.field}>
          <label htmlFor="catalog-first-license">First license name</label>
          <input id="catalog-first-license" name="firstLicense" type="text" required maxLength={CATALOG_LIMITS.name} autoComplete="off" />
        </div> : null}
        {target.kind !== "edit-product" ? <fieldset className={styles.prices}>
          <legend>Default prices · USD</legend>
          <p className={styles.priceHelp}>Leave a price blank to enter it in each order.</p>
          {PRICE_FIELDS.map(({ id, label, unit }) => <div key={id} className={styles.priceField}>
            <div>
              <label htmlFor={`catalog-price-${id}`}>{label}</label>
              <p id={`catalog-price-${id}-unit`} className={styles.hint}>{unit}</p>
            </div>
            <div className={styles.priceInput}>
              <span aria-hidden="true">$</span>
              <input
                id={`catalog-price-${id}`}
                name={id}
                type="text"
                inputMode="decimal"
                defaultValue={existingLicense?.prices?.[id] ?? ""}
                maxLength={32}
                placeholder="Not set"
                autoComplete="off"
                aria-describedby={`catalog-price-${id}-unit`}
              />
            </div>
          </div>)}
        </fieldset> : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.actions}>
          {isEditing && onDelete ? <button
            type="button"
            className={styles.delete}
            onClick={() => { setError(onDelete()); }}
          >Delete {isProduct ? "product" : "license"}</button> : null}
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.submit}>{isEditing ? "Save changes" : title}</button>
        </div>
      </form>
    </dialog>
  );
}
