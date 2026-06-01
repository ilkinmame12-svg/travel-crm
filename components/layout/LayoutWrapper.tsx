"use client"

import { usePathname } from "next/navigation"
import Sidebar, { MobileNav } from "./Sidebar"
import { useState, useEffect } from "react"

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const isLogin = pathname === "/login"

  if (!mounted) return <>{children}</>
  if (isLogin) return <>{children}</>

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-auto bg-gray-50">
        <MobileNav />
        {children}
      </main>
    </div>
  )
}