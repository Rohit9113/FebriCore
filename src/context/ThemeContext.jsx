// src/context/ThemeContext.jsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  theme:       "dark",
  toggleTheme: () => {},
  isDark:      true,
});
const getInitialTheme = () => {
  if (typeof document === "undefined") return "dark"; // SSR pe dark default
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : "dark";
};

export function ThemeProvider({ children }) {
  const [theme,   setTheme]   = useState(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("fabricore_theme") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("fabricore_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };
  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      isDark: theme === "dark",
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);