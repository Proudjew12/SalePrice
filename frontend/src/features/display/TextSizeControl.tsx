import { useContext } from "react";

import { DisplayPreferencesContext } from "./context";
import { isTextSize, TEXT_SIZES } from "./preferences";
import styles from "./TextSizeControl.module.scss";

export function TextSizeControl() {
  const preferences = useContext(DisplayPreferencesContext);
  if (!preferences) throw new Error("TextSizeControl requires DisplayPreferencesProvider.");

  return (
    <label className={styles.control}>
      <span>Text size</span>
      <select aria-label="Text size" value={preferences.textSize} onChange={(event) => {
        const size = Number(event.target.value);
        if (isTextSize(size)) preferences.changeTextSize(size);
      }}>
        {TEXT_SIZES.map((size) => <option key={size} value={size}>{size}%</option>)}
      </select>
      {preferences.saveFailed ? <span className={styles.notice} role="status">Size applies for this visit; it could not be saved.</span> : null}
    </label>
  );
}
