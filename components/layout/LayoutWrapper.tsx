"use client"

import { usePathname } from "next/navigation"
import Sidebar, { MobileNav } from "./Sidebar"
import { useState, useEffect } from "react"

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const isLogin = pathname === "/login"

  if (isLogin) return <>{children}</>

  return (
   <div className="flex min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div className="hidden md:block">
        {mounted && <Sidebar />}
      </div>
      <main className="flex-1 overflow-auto" style={{ background: "var(--bg-primary)" }}>
        {mounted && <MobileNav />}
        {children}
      </main>
    </div>
  )
}