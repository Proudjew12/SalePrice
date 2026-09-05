import { useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";

import { DisplayPreferencesContext } from "./context";
import { loadTextSize, saveTextSize } from "./preferences";
import type { TextSize } from "./preferences";

export function DisplayPreferencesProvider({ children }: { children: ReactNode }) {
  const [textSize, setTextSize] = useState(loadTextSize);
  const [saveFailed, setSaveFailed] = useState(false);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--text-scale", String(textSize / 100));
    return () => { root.style.removeProperty("--text-scale"); };
  }, [textSize]);

  function changeTextSize(size: TextSize) {
    setTextSize(size);
    setSaveFailed(!saveTextSize(size));
  }

  return (
    <DisplayPreferencesContext value={{ textSize, changeTextSize, saveFailed }}>
      {children}
    </DisplayPreferencesContext>
  );
}
