"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "build-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setThemeState(stored);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  }, []);

  return { theme, setTheme };
}
