"use client"

import { usePathname } from "next/navigation"
import Sidebar, { MobileNav } from "./Sidebar"
import { useState, useEffect } from "react"
import SplashScreen from "@/components/SplashScreen"

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    setMounted(true)
    // Show splash only once per session
    const seen = sessionStorage.getItem("splash_shown")
    if (seen) setShowSplash(false)
    else sessionStorage.setItem("splash_shown", "1")
  }, [])

  const isLogin = pathname === "/login"

  if (isLogin) return <>{children}</>

  return (
    <>
      {showSplash && mounted && <SplashScreen onDone={() => setShowSplash(false)} />}
      <div className="flex min-h-screen" style={{ background: "var(--bg-primary)" }}>
        <div className="hidden md:block">
          {mounted && <Sidebar />}
        </div>
        <main className="flex-1 overflow-auto" style={{ background: "var(--bg-primary)" }}>
          {mounted && <MobileNav />}
          {children}
        </main>
      </div>
    </>
  )
}