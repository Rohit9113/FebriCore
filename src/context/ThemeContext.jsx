"use client";
// src/context/ThemeContext.jsx
//
// ✅ NEW: Dark / Light theme toggle
//
// Kaise kaam karta hai:
//   - localStorage mein theme save hoti hai (refresh ke baad bhi yaad)
//   - <html> pe data-theme="dark" ya data-theme="light" attribute set hota hai
//   - globals.css mein CSS variables dono themes ke liye define hain
//   - Components jo CSS variables use karte hain — automatically update
//   - Hardcoded hex wale components — gradual migration possible

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  theme:      "dark",
  toggleTheme: () => {},
  isDark:     true,
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  // Mount pe localStorage se load karo
  useEffect(() => {
    const saved = localStorage.getItem("fabricore_theme") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
    setMounted(true);
  }, []);

  // Theme badlne pe HTML attribute + localStorage update
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("fabricore_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  // Hydration mismatch prevent — server pe dark render karo
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: "dark", toggleTheme, isDark: true }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);