"use client"

import { usePathname } from "next/navigation"
import Sidebar, { MobileNav } from "./Sidebar"

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === "/login"

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