"use client"

import { usePathname, useRouter } from "next/navigation"
import Sidebar, { MobileNav } from "./Sidebar"
import { useState, useEffect } from "react"
import SplashScreen from "@/components/SplashScreen"
import { supabase } from "@/lib/supabase"

const PUBLIC_PATHS = ["/login", "/register"]

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)

  const isPublic = PUBLIC_PATHS.includes(pathname)

  useEffect(() => {
    setMounted(true)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        if (!isPublic) router.replace("/login")
        setChecking(false)
        return
      }
      setAuthed(true)
      setChecking(false)

      const key = `splash_${new Date().toLocaleDateString()}`
      const count = parseInt(localStorage.getItem(key) ?? "0")
      if (count < 2) {
        setShowSplash(true)
        localStorage.setItem(key, String(count + 1))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setAuthed(false)
        if (!isPublic) router.replace("/login")
      } else if (session) {
        setAuthed(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Public pages — always show
  if (isPublic) return <>{children}</>

  // Checking auth
  if (checking || !mounted) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
      <div className="w-10 h-10 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
    </div>
  )

  if (!authed) return null

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <div className="flex min-h-screen" style={{ background: "var(--bg-primary)" }}>
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-auto" style={{ background: "var(--bg-primary)" }}>
          <MobileNav />
          {children}
        </main>
      </div>
    </>
  )
}