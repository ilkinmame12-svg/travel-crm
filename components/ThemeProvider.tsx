"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"

const ThemeContext = createContext<{ theme: string; toggle: () => void }>({ theme: "light", toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("theme") ?? "light"
    setTheme(saved)
    document.documentElement.setAttribute("data-theme", saved)
    setMounted(true)
  }, [])

  function toggle() {
    const next = theme === "light" ? "dark" : "light"
    setTheme(next)
    localStorage.setItem("theme", next)
    document.documentElement.setAttribute("data-theme", next)
  }

  if (!mounted) return <>{children}</>

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl transition-all hover:scale-105"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        color: "var(--text-secondary)",
      }}
    >
      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  )
}
