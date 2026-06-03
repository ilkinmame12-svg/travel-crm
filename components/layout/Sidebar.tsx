"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, ClipboardList, Wallet, CreditCard, Globe, Settings, HelpCircle, LogOut, BotMessageSquare, Users, PlaneTakeoff, Building2, Scale, Clock, MessageCircle, ChevronRight } from "lucide-react"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { ThemeToggle } from "@/components/ThemeProvider"

const ALL_MENU = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["it_admin", "boss", "direktor", "muhasib", "menecer"] },
  { href: "/bookings", label: "Sifarişlər", icon: ClipboardList, roles: ["it_admin", "boss", "direktor", "muhasib", "menecer"] },
  { href: "/drafts", label: "Təsdiq", icon: Clock, roles: ["it_admin", "direktor", "muhasib", "menecer"] },
  { href: "/flights", label: "TK NDC", icon: PlaneTakeoff, roles: ["it_admin", "direktor", "menecer"] },
  { href: "/assistant", label: "AI Köməkçi", icon: BotMessageSquare, roles: ["it_admin", "boss", "direktor", "muhasib", "menecer"] },
  { href: "/chat", label: "Mesajlar", icon: MessageCircle, roles: ["it_admin", "boss", "direktor", "muhasib", "menecer"] },
  { href: "/employees", label: "İşçilər", icon: Users, roles: ["it_admin", "boss", "direktor", "muhasib"] },
  { href: "/settings", label: "Ayarlar", icon: Settings, roles: ["it_admin", "boss", "direktor", "muhasib", "menecer"] },
  { href: "/help", label: "Help", icon: HelpCircle, roles: ["it_admin", "boss", "direktor", "muhasib", "menecer"] },
]

const FINANCE_MENU = [
  { href: "/finances", label: "Maliyyə", icon: Wallet },
  { href: "/debts", label: "Borclar", icon: CreditCard },
  { href: "/creditors", label: "Kreditorlar", icon: Building2 },
  { href: "/balances", label: "Balanslar", icon: Scale },
  { href: "/iata", label: "IATA", icon: Globe },
]

const FINANCE_ROLES = ["it_admin", "boss", "direktor", "muhasib"]

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
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!profile?.id) return
    async function loadUnread() {
      const { data } = await supabase.from("messages").select("id").eq("receiver_id", profile!.id).eq("is_read", false)
      setUnreadCount(data?.length ?? 0)
    }
    loadUnread()
    const interval = setInterval(loadUnread, 5000)
    return () => clearInterval(interval)
  }, [profile])

  const MENU = ALL_MENU.filter(item => !profile || item.roles.includes(profile.role))
  async function handleLogout() { await supabase.auth.signOut(); router.push("/login"); router.refresh() }
  if (!mounted) return <div className="md:hidden h-14" style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }} />
  return (
    <div className="md:hidden px-4 py-3 flex items-center justify-between" style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)", backdropFilter: "blur(20px)" }}>
      <Image src="/logo.png" alt="itstour" width={80} height={30} style={{ width: "auto", height: "auto" }} className="object-contain" />
      <div className="flex gap-1 overflow-x-auto">
        {MENU.map(item => {
          const active = pathname === item.href
          const Icon = item.icon
          const isChat = item.href === "/chat"
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-xs font-medium transition-all relative"
              style={{ background: active ? "linear-gradient(135deg, #ef4444, #f97316)" : "transparent", color: active ? "white" : "var(--text-secondary)" }}>
              <Icon size={16} />
              {isChat && unreadCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: "#22c55e", fontSize: "9px" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </div>
              )}
            </Link>
          )
        })}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button onClick={handleLogout} style={{ color: "var(--text-secondary)" }} className="p-2 rounded-xl"><LogOut size={18} /></button>
      </div>
    </div>
  )
}

function MenuItem({ item, expanded, pathname, unreadCount }: { item: any, expanded: boolean, pathname: string, unreadCount?: number }) {
  const active = pathname === item.href
  const Icon = item.icon
  const isChat = item.href === "/chat"
  const hasUnread = isChat && (unreadCount ?? 0) > 0

  return (
    <Link href={item.href} title={!expanded ? item.label : undefined}
      className="flex items-center rounded-2xl transition-all relative"
      style={{ gap: expanded ? "10px" : "0", padding: expanded ? "10px 12px" : "10px 0", justifyContent: expanded ? "flex-start" : "center", background: active ? "linear-gradient(135deg, #ef4444, #f97316)" : "transparent", color: active ? "white" : hasUnread ? "#22c55e" : "var(--text-secondary)", boxShadow: active ? "0 4px 15px rgba(239,68,68,0.3)" : "none", whiteSpace: "nowrap" }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)" }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent" }}>
      <div className="relative flex-shrink-0">
        <Icon size={17} />
        {hasUnread && !expanded && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: "#22c55e", fontSize: "9px" }}>
            {(unreadCount ?? 0) > 9 ? "9+" : unreadCount}
          </div>
        )}
      </div>
      {expanded && <span className="text-sm font-medium flex-1">{item.label}</span>}
      {expanded && hasUnread && (
        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold text-white ml-auto"
          style={{ background: "#22c55e", fontSize: "10px" }}>
          {(unreadCount ?? 0) > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useUserRole()
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [financeOpen, setFinanceOpen] = useState(false)
  const [financePos, setFinancePos] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const timerRef = useState<any>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!profile?.id) return
    async function loadUnread() {
      const { data } = await supabase.from("messages").select("id").eq("receiver_id", profile!.id).eq("is_read", false)
      setUnreadCount(data?.length ?? 0)
    }
    loadUnread()
    const interval = setInterval(loadUnread, 5000)
    return () => clearInterval(interval)
  }, [profile])

  const MENU = ALL_MENU.filter(item => !profile || item.roles.includes(profile.role))
  const isFinanceActive = FINANCE_MENU.some(f => pathname === f.href)
  const showFinance = profile && FINANCE_ROLES.includes(profile.role)

  async function handleLogout() { await supabase.auth.signOut(); router.push("/login"); router.refresh() }

  function openFinance(e: React.MouseEvent) {
    if (timerRef[0]) clearTimeout(timerRef[0])
    setFinancePos(e.currentTarget.getBoundingClientRect().top)
    setFinanceOpen(true)
  }

  function closeFinance() {
    const t = setTimeout(() => setFinanceOpen(false), 200)
    timerRef[1](t)
  }

  function keepFinance() {
    if (timerRef[0]) clearTimeout(timerRef[0])
    setFinanceOpen(true)
  }

  if (!mounted) return <div style={{ width: "64px", minHeight: "100vh", background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }} />

  return (
    <>
      {expanded && <div className="fixed inset-0 z-30" onClick={() => setExpanded(false)} />}

      <div className="hidden md:flex flex-col fixed top-0 left-0 h-full z-40 transition-all duration-300"
        style={{ width: expanded ? "220px" : "64px", background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)", backdropFilter: "blur(20px)", overflow: "hidden" }}>

        {/* Logo */}
        <div className="flex items-center px-3 py-4" style={{ borderBottom: "1px solid var(--border-color)", minHeight: "60px", gap: expanded ? "8px" : "0", justifyContent: expanded ? "space-between" : "center" }}>
          {expanded
            ? <Image src="/logo.png" alt="itstour" width={100} height={34} className="object-contain" />
            : <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xl" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>✈</div>
          }
          <button onClick={() => setExpanded(!expanded)} className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ color: "var(--text-muted)", background: "var(--bg-glass)" }}>
            <ChevronRight size={13} style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s" }} />
          </button>
        </div>

        {/* Nav */}
        <div className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          <nav className="space-y-1 px-2">
            {MENU.slice(0, 2).map(item => (
              <MenuItem key={item.href} item={item} expanded={expanded} pathname={pathname} unreadCount={unreadCount} />
            ))}

            {showFinance && (
              <div onMouseEnter={openFinance} onMouseLeave={closeFinance}>
                <Link href="/finances" title={!expanded ? "Maliyyə" : undefined}
                  className="flex items-center rounded-2xl transition-all"
                  style={{ gap: expanded ? "10px" : "0", padding: expanded ? "10px 12px" : "10px 0", justifyContent: expanded ? "flex-start" : "center", background: isFinanceActive ? "linear-gradient(135deg, #ef4444, #f97316)" : financeOpen ? "var(--bg-glass)" : "transparent", color: isFinanceActive ? "white" : "var(--text-secondary)", borderRadius: "16px", whiteSpace: "nowrap" }}>
                  <Wallet size={17} style={{ flexShrink: 0 }} />
                  {expanded && <span className="text-sm font-medium">Maliyyə ▾</span>}
                </Link>
              </div>
            )}

            {MENU.slice(2).map(item => (
              <MenuItem key={item.href} item={item} expanded={expanded} pathname={pathname} unreadCount={unreadCount} />
            ))}
          </nav>
        </div>

        {/* Bottom */}
        <div className="px-2 pb-3 space-y-2" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "8px" }}>
          <div className="flex items-center rounded-2xl p-2" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", gap: expanded ? "10px" : "0", justifyContent: expanded ? "flex-start" : "center" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 text-white font-bold text-sm"
              style={{ background: ROLE_GRADIENTS[profile?.role ?? ""] ?? "linear-gradient(135deg, #6b7280, #9ca3af)" }}>
              {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : <span>{profile?.fullName?.[0]?.toUpperCase() ?? "?"}</span>}
            </div>
            {expanded && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{profile?.fullName ?? "..."}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ROLE_LABELS[profile?.role ?? ""] ?? "..."}</p>
              </div>
            )}
          </div>
          <div className="flex gap-1" style={{ flexDirection: expanded ? "row" : "column", alignItems: "center" }}>
            <ThemeToggle />
            <button onClick={handleLogout} title="Çıxış"
              className="flex items-center justify-center rounded-2xl transition-all"
              style={{ padding: "8px", flex: expanded ? 1 : "none", background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)", gap: expanded ? "6px" : "0", width: expanded ? "auto" : "36px", height: "36px" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; (e.currentTarget as HTMLElement).style.color = "#ef4444" }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)" }}>
              <LogOut size={15} />
              {expanded && <span className="text-sm font-medium">Çıxış</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Finance submenu */}
      {financeOpen && showFinance && (
        <div className="fixed z-[9999] py-2 rounded-2xl"
          style={{ top: financePos, left: expanded ? "228px" : "72px", minWidth: "170px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }}
          onMouseEnter={keepFinance}
          onMouseLeave={closeFinance}>
          <div className="absolute right-full top-0 h-full w-3" onMouseEnter={keepFinance} />
          <p className="text-xs font-semibold uppercase tracking-wider px-4 pb-2 pt-1" style={{ color: "var(--text-muted)" }}>Maliyyə</p>
          {FINANCE_MENU.map(f => {
            const Icon = f.icon
            const active = pathname === f.href
            return (
              <Link key={f.href} href={f.href}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all"
                style={{ color: active ? "#ef4444" : "var(--text-primary)", background: active ? "rgba(239,68,68,0.08)" : "transparent" }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)" }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent" }}>
                <Icon size={15} />
                {f.label}
              </Link>
            )
          })}
        </div>
      )}

      <div className="hidden md:block flex-shrink-0 transition-all duration-300" style={{ width: expanded ? "220px" : "64px" }} />
    </>
  )
}