import { createContext } from "react";

import type { TextSize } from "./preferences";

interface DisplayPreferences {
  textSize: TextSize;
  changeTextSize: (size: TextSize) => void;
  saveFailed: boolean;
}

export const DisplayPreferencesContext = createContext<DisplayPreferences | null>(null);
