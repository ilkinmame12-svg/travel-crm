"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, ClipboardList, Wallet, CreditCard, Globe, Settings, HelpCircle, LogOut, BotMessageSquare, Users, PlaneTakeoff, Building2, Scale, Clock, MessageCircle} from "lucide-react"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { ThemeToggle } from "@/components/ThemeProvider"

const ALL_MENU = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["it_admin", "boss", "direktor", "muhasib", "menecer"] },
  { href: "/bookings", label: "Sifarişlər", icon: ClipboardList, roles: ["it_admin", "boss", "direktor", "muhasib", "menecer"] },
  { href: "/finances", label: "Maliyyə", icon: Wallet, roles: ["it_admin", "boss", "direktor", "muhasib"] },
  { href: "/debts", label: "Borclar", icon: CreditCard, roles: ["it_admin", "boss", "direktor", "muhasib"] },
  { href: "/creditors", label: "Kreditorlar", icon: Building2, roles: ["it_admin", "boss", "direktor", "muhasib"] },
  { href: "/balances", label: "Balanslar", icon: Scale, roles: ["it_admin", "boss", "direktor", "muhasib"] },
  { href: "/iata", label: "IATA", icon: Globe, roles: ["it_admin", "boss", "direktor", "muhasib"] },
  { href: "/employees", label: "İşçilər", icon: Users, roles: ["it_admin", "boss", "direktor", "muhasib"] },
  { href: "/flights", label: "TK NDC", icon: PlaneTakeoff, roles: ["it_admin", "direktor", "menecer"] },
  { href: "/assistant", label: "AI Köməkçi", icon: BotMessageSquare, roles: ["it_admin", "boss", "direktor", "muhasib", "menecer"] },
  { href: "/drafts", label: "Təsdiq", icon: Clock, roles: ["it_admin", "direktor", "muhasib", "menecer"] },
  { href: "/settings", label: "Ayarlar", icon: Settings, roles: ["it_admin", "boss", "direktor", "muhasib", "menecer"] },
  { href: "/help", label: "Help", icon: HelpCircle, roles: ["it_admin", "boss", "direktor", "muhasib", "menecer"] },
  { href: "/chat", label: "Mesajlar", icon: MessageCircle, roles: ["it_admin", "boss", "direktor", "muhasib", "menecer"] },
]

const ROLE_LABELS: Record<string, string> = {
  it_admin: "IT Admin", boss: "Boss", direktor: "Direktor", muhasib: "Mühasib", menecer: "Menecer",
}

const ROLE_GRADIENTS: Record<string, string> = {
  it_admin: "linear-gradient(135deg, #667eea, #764ba2)",
  boss: "linear-gradient(135deg, #ef4444, #f97316)",
  direktor: "linear-gradient(135deg, #3b82f6, #06b6d4)",
  muhasib: "linear-gradient(135deg, #10b981, #34d399)",
  menecer: "linear-gradient(135deg, #6b7280, #9ca3af)",
}

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useUserRole()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const MENU = ALL_MENU.filter(item => !profile || item.roles.includes(profile.role))

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  if (!mounted) return <div className="md:hidden h-14" style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }} />

  return (
    <div className="md:hidden px-4 py-3 flex items-center justify-between" style={{
      background: "var(--bg-secondary)",
      borderBottom: "1px solid var(--border-color)",
      backdropFilter: "blur(20px)",
    }}>
      <Image src="/logo.png" alt="itstour" width={80} height={30} style={{ width: "auto", height: "auto" }} className="object-contain" />
      <div className="flex gap-1 overflow-x-auto">
        {MENU.map(item => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: active ? "linear-gradient(135deg, #ef4444, #f97316)" : "transparent",
                color: active ? "white" : "var(--text-secondary)",
              }}>
              <Icon size={16} />
            </Link>
          )
        })}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button onClick={handleLogout} style={{ color: "var(--text-secondary)" }} className="p-2 rounded-xl hover:text-red-500">
          <LogOut size={18} />
        </button>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, loading } = useUserRole()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const MENU = ALL_MENU.filter(item => !profile || item.roles.includes(profile.role))

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  if (!mounted) return <div className="w-64 min-h-screen" style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }} />

  return (
    <div className="w-64 min-h-screen flex flex-col" style={{
      background: "var(--sidebar-bg)",
      borderRight: "1px solid var(--sidebar-border)",
      backdropFilter: "blur(20px)",
    }}>
      {/* Logo */}
      <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--border-color)" }}>
        <Image src="/logo.png" alt="itstour" width={120} height={40} className="object-contain" />
      </div>

      {/* Menu */}
      <div className="px-3 flex-1 py-4 overflow-y-auto">
        <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-3" style={{ color: "var(--text-muted)" }}>Menu</p>
        <nav className="space-y-1">
          {MENU.map(item => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all"
                style={{
                  background: active ? "linear-gradient(135deg, #ef4444, #f97316)" : "transparent",
                  color: active ? "white" : "var(--text-secondary)",
                  boxShadow: active ? "0 4px 15px rgba(239,68,68,0.3)" : "none",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)" }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent" }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-2">
        {/* Profile card */}
        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl" style={{
          background: "var(--bg-glass)",
          border: "1px solid var(--border-color)",
        }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{
            background: ROLE_GRADIENTS[profile?.role ?? ""] ?? "linear-gradient(135deg, #6b7280, #9ca3af)",
          }}>
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-sm font-bold">
                {profile?.fullName?.[0]?.toUpperCase() ?? (loading ? "•" : "?")}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{profile?.fullName ?? "..."}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ROLE_LABELS[profile?.role ?? ""] ?? "..."}</p>
          </div>
        </div>

        {/* Theme + Logout */}
        <div className="flex gap-2">
          <ThemeToggle />
          <button onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-medium transition-all"
            style={{
              background: "var(--bg-glass)",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"
              ;(e.currentTarget as HTMLElement).style.color = "#ef4444"
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"
              ;(e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"
            }}
          >
            <LogOut size={16} />
            <span>Çıxış</span>
          </button>
        </div>
      </div>
    </div>
  )
}