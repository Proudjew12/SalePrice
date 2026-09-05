import { Outlet } from "react-router-dom";

import { DisplayPreferencesProvider } from "@/features/display/DisplayPreferencesProvider";

export function App() {
  return <DisplayPreferencesProvider><Outlet /></DisplayPreferencesProvider>;
}
