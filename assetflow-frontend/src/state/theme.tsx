import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { ThemeMode } from "../lib/types";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getSystemTheme = () => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => (localStorage.getItem("assetflow.theme") as ThemeMode | null) ?? "light");
  const [resolved, setResolved] = useState<"light" | "dark">(() => (mode === "system" ? getSystemTheme() : mode));

  useEffect(() => {
    const apply = () => {
      const next = mode === "system" ? getSystemTheme() : mode;
      setResolved(next);
      document.documentElement.dataset.theme = next;
    };
    apply();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    resolved,
    setMode: (next) => {
      localStorage.setItem("assetflow.theme", next);
      setModeState(next);
    },
  }), [mode, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
};
