"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard, ClipboardList, Wallet, CreditCard, Globe,
  Settings, HelpCircle, LogOut, BotMessageSquare, Users,
  PlaneTakeoff, Building2, Scale, Clock, MessageCircle,
  ChevronRight, ChevronLeft, Sparkles, FileText
} from "lucide-react"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { ThemeToggle } from "@/components/ThemeProvider"

// ─── Menu config ─────────────────────────────────────────────────────────
const ALL_MENU = [
  { href: "/",          label: "Dashboard",   icon: LayoutDashboard, roles: ["it_admin","boss","direktor","muhasib","menecer"] },
  { href: "/bookings",  label: "Sifarişlər",  icon: ClipboardList,   roles: ["it_admin","boss","direktor","muhasib","menecer"] },
  { href: "/drafts",    label: "Təsdiq",      icon: Clock,           roles: ["it_admin","direktor","muhasib","menecer"] },
  { href: "/mir", label: "MIR Import", icon: FileText, roles: ["it_admin", "direktor", "menecer"] },
  { href: "/flights",   label: "TK NDC",      icon: PlaneTakeoff,    roles: ["it_admin","direktor","menecer"] },
  { href: "/assistant", label: "AI Köməkçi",  icon: BotMessageSquare,roles: ["it_admin","boss","direktor","muhasib","menecer"] },
  { href: "/chat",      label: "Mesajlar",    icon: MessageCircle,   roles: ["it_admin","boss","direktor","muhasib","menecer"] },
  { href: "/employees", label: "İşçilər",     icon: Users,           roles: ["it_admin","boss","direktor","muhasib"] },
  { href: "/settings",  label: "Ayarlar",     icon: Settings,        roles: ["it_admin","boss","direktor","muhasib","menecer"] },
  { href: "/help",      label: "Help",        icon: HelpCircle,      roles: ["it_admin","boss","direktor","muhasib","menecer"] },
]

const FINANCE_MENU = [
  { href: "/finances",  label: "Maliyyə",     icon: Wallet },
  { href: "/debts",     label: "Borclar",     icon: CreditCard },
  { href: "/creditors", label: "Kreditorlar", icon: Building2 },
  { href: "/balances",  label: "Balanslar",   icon: Scale },
  { href: "/iata",      label: "IATA",        icon: Globe },
]

const FINANCE_ROLES = ["it_admin", "boss", "direktor", "muhasib"]

const ROLE_LABELS: Record<string, string> = {
  it_admin: "IT Admin", boss: "Boss", direktor: "Direktor", muhasib: "Mühasib", menecer: "Menecer",
}

const ROLE_GRADIENTS: Record<string, string> = {
  it_admin:  "linear-gradient(135deg, #667eea, #764ba2)",
  boss:      "linear-gradient(135deg, #ef4444, #f97316)",
  direktor:  "linear-gradient(135deg, #3b82f6, #06b6d4)",
  muhasib:   "linear-gradient(135deg, #10b981, #34d399)",
  menecer:   "linear-gradient(135deg, #6b7280, #9ca3af)",
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function useUnread(profileId?: string) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!profileId) return
    const load = async () => {
      const { data } = await supabase.from("messages").select("id").eq("receiver_id", profileId).eq("is_read", false)
      setCount(data?.length ?? 0)
    }
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [profileId])
  return count
}

// ─── Mobile Nav ───────────────────────────────────────────────────────────
export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useUserRole()
  const [mounted, setMounted] = useState(false)
  const unread = useUnread(profile?.id)

  useEffect(() => { setMounted(true) }, [])

  const MENU = ALL_MENU.filter(item => !profile || item.roles.includes(profile.role))

  async function handleLogout() { await supabase.auth.signOut(); router.push("/login"); router.refresh() }

  if (!mounted) return (
    <div className="md:hidden h-14 animate-pulse" style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }} />
  )

  return (
    <div className="md:hidden px-4 py-3 flex items-center justify-between"
      style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)", backdropFilter: "blur(20px)" }}>
      <Image src="/logo.png" alt="itstour" width={80} height={30} style={{ width: "auto", height: "auto" }} className="object-contain" />
      <div className="flex gap-1 overflow-x-auto">
        {MENU.map(item => {
          const active = pathname === item.href
          const Icon = item.icon
          const isChat = item.href === "/chat"
          return (
            <Link key={item.href} href={item.href}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-90"
              style={{
                background: active ? "linear-gradient(135deg, #ef4444, #f97316)" : "transparent",
                color: active ? "white" : "var(--text-secondary)",
                boxShadow: active ? "0 4px 12px rgba(239,68,68,0.3)" : "none",
              }}>
              <Icon size={17} />
              {isChat && unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: "#22c55e", fontSize: "9px" }}>
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          )
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <button onClick={handleLogout}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
          style={{ color: "var(--text-secondary)", background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
          <LogOut size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── Nav Item ─────────────────────────────────────────────────────────────
function NavItem({ item, expanded, pathname, unread = 0 }: { item: any; expanded: boolean; pathname: string; unread?: number }) {
  const active = pathname === item.href
  const isChat = item.href === "/chat"
  const hasUnread = isChat && unread > 0
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      title={!expanded ? item.label : undefined}
      className="group relative flex items-center rounded-2xl transition-all duration-150"
      style={{
        gap: expanded ? "10px" : "0",
        padding: expanded ? "9px 12px" : "9px 0",
        justifyContent: expanded ? "flex-start" : "center",
        background: active
          ? "linear-gradient(135deg, #ef4444, #f97316)"
          : "transparent",
        color: active ? "white" : hasUnread ? "#22c55e" : "var(--text-secondary)",
        boxShadow: active ? "0 4px 16px rgba(239,68,68,0.28)" : "none",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)" }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent" }}
    >
      {/* Icon + badge */}
      <div className="relative flex-shrink-0">
        <Icon size={17} />
        {hasUnread && !expanded && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold animate-pulse"
            style={{ background: "#22c55e", fontSize: "9px" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </div>

      {/* Label */}
      {expanded && (
        <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
      )}

      {/* Unread badge (expanded) */}
      {expanded && hasUnread && (
        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold text-white ml-auto"
          style={{ background: "#22c55e", fontSize: "10px" }}>
          {unread > 9 ? "9+" : unread}
        </span>
      )}

      {/* Tooltip (collapsed) */}
      {!expanded && (
        <div className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 rounded-xl text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50"
          style={{ background: "rgba(15,23,42,0.9)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {item.label}
          {hasUnread && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-white" style={{ background: "#22c55e", fontSize: "9px" }}>{unread}</span>}
        </div>
      )}
    </Link>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { profile } = useUserRole()
  const [mounted,      setMounted]      = useState(false)
  const [expanded,     setExpanded]     = useState(false)
  const [financeOpen,  setFinanceOpen]  = useState(false)
  const [financePos,   setFinancePos]   = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unread   = useUnread(profile?.id)

  useEffect(() => { setMounted(true) }, [])

  const MENU          = ALL_MENU.filter(item => !profile || item.roles.includes(profile.role))
  const isFinActive   = FINANCE_MENU.some(f => pathname === f.href)
  const showFinance   = profile && FINANCE_ROLES.includes(profile.role)

  async function handleLogout() { await supabase.auth.signOut(); router.push("/login"); router.refresh() }

  function openFinance(e: React.MouseEvent) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setFinancePos(e.currentTarget.getBoundingClientRect().top)
    setFinanceOpen(true)
  }
  function closeFinance() {
    timerRef.current = setTimeout(() => setFinanceOpen(false), 180)
  }
  function keepFinance() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setFinanceOpen(true)
  }

  if (!mounted) return (
    <div className="hidden md:block" style={{ width: 64, minHeight: "100vh", background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }} />
  )

  return (
    <>
      {/* Overlay */}
      {expanded && (
        <div className="fixed inset-0 z-30" onClick={() => setExpanded(false)} />
      )}

      {/* Sidebar panel */}
      <div
        className="hidden md:flex flex-col fixed top-0 left-0 h-full z-40"
        style={{
          width: expanded ? 224 : 64,
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
          backdropFilter: "blur(24px)",
          overflow: "hidden",
          transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* ── Logo row ── */}
        <div
          className="flex items-center px-3 py-4 flex-shrink-0"
          style={{
            borderBottom: "1px solid var(--border-color)",
            minHeight: 60,
            justifyContent: expanded ? "space-between" : "center",
            gap: expanded ? 8 : 0,
          }}
        >
          {expanded ? (
            <Image src="/logo.png" alt="itstour" width={104} height={35} className="object-contain" />
          ) : (
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-bold text-lg transition-transform hover:scale-110"
              style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", boxShadow: "0 4px 12px rgba(239,68,68,0.35)" }}
            >
              ✈
            </div>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
            style={{ color: "var(--text-muted)", background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}
          >
            {expanded
              ? <ChevronLeft size={12} />
              : <ChevronRight size={12} />
            }
          </button>
        </div>

        {/* ── Nav ── */}
        <div className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          <nav className="space-y-0.5 px-2">

            {/* First 2 items: Dashboard + Sifarişlər */}
            {MENU.slice(0, 2).map(item => (
              <NavItem key={item.href} item={item} expanded={expanded} pathname={pathname} unread={unread} />
            ))}

            {/* Finance group */}
            {showFinance && (
              <>
                {expanded
                  ? /* Expanded: accordion-style links */
                    <div>
                      <Link href="/finances"
                        className="flex items-center rounded-2xl transition-all duration-150"
                        style={{
                          gap: "10px", padding: "9px 12px",
                          background: isFinActive ? "linear-gradient(135deg, #ef4444, #f97316)" : "transparent",
                          color: isFinActive ? "white" : "var(--text-secondary)",
                          boxShadow: isFinActive ? "0 4px 16px rgba(239,68,68,0.28)" : "none",
                          whiteSpace: "nowrap",
                        }}
                        onMouseEnter={e => { if (!isFinActive) (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)" }}
                        onMouseLeave={e => { if (!isFinActive) (e.currentTarget as HTMLElement).style.background = "transparent" }}>
                        <Wallet size={17} style={{ flexShrink: 0 }} />
                        <span className="text-sm font-medium flex-1">Maliyyə</span>
                      </Link>
                      <div className="ml-2 mt-0.5 space-y-0.5 pl-3" style={{ borderLeft: "1px solid var(--border-color)" }}>
                        {FINANCE_MENU.map(f => {
                          const Icon = f.icon
                          const active = pathname === f.href
                          return (
                            <Link key={f.href} href={f.href}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                              style={{
                                color: active ? "#ef4444" : "var(--text-secondary)",
                                background: active ? "rgba(239,68,68,0.1)" : "transparent",
                              }}
                              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)" }}
                              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent" }}>
                              <Icon size={14} />
                              {f.label}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  : /* Collapsed: hover popup */
                    <div
                      className="group relative"
                      onMouseEnter={openFinance}
                      onMouseLeave={closeFinance}
                    >
                      <div
                        className="flex items-center justify-center rounded-2xl transition-all duration-150 cursor-pointer"
                        style={{
                          padding: "9px 0",
                          background: isFinActive
                            ? "linear-gradient(135deg, #ef4444, #f97316)"
                            : financeOpen ? "var(--bg-glass)" : "transparent",
                          color: isFinActive ? "white" : "var(--text-secondary)",
                          boxShadow: isFinActive ? "0 4px 16px rgba(239,68,68,0.28)" : "none",
                        }}
                      >
                        <Wallet size={17} />
                      </div>
                      {/* Tooltip */}
                      <div className="pointer-events-none absolute left-full ml-3 top-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50"
                        style={{ background: "rgba(15,23,42,0.9)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        Maliyyə
                      </div>
                    </div>
                }
              </>
            )}

            {/* Rest */}
            {MENU.slice(2).map(item => (
              <NavItem key={item.href} item={item} expanded={expanded} pathname={pathname} unread={unread} />
            ))}
          </nav>
        </div>

        {/* ── Bottom ── */}
        <div
          className="px-2 pb-3 pt-2 space-y-2 flex-shrink-0"
          style={{ borderTop: "1px solid var(--border-color)" }}
        >
          {/* Profile */}
          <div
            className="flex items-center rounded-2xl p-2 transition-all"
            style={{
              background: "var(--bg-glass)",
              border: "1px solid var(--border-color)",
              gap: expanded ? 10 : 0,
              justifyContent: expanded ? "flex-start" : "center",
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 text-white font-bold text-sm"
              style={{ background: ROLE_GRADIENTS[profile?.role ?? ""] ?? "linear-gradient(135deg,#6b7280,#9ca3af)" }}
            >
              {profile?.avatarUrl
                ? <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                : <span>{profile?.fullName?.[0]?.toUpperCase() ?? "?"}</span>
              }
            </div>
            {expanded && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  {profile?.fullName ?? "..."}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {ROLE_LABELS[profile?.role ?? ""] ?? "..."}
                </p>
              </div>
            )}
          </div>

          {/* Theme + Logout */}
          <div
            className="flex gap-1.5"
            style={{ flexDirection: expanded ? "row" : "column", alignItems: "center" }}
          >
            <ThemeToggle />
            <button
              onClick={handleLogout}
              title="Çıxış"
              className="flex items-center justify-center rounded-2xl transition-all hover:scale-[1.03] active:scale-95"
              style={{
                padding: "8px",
                flex: expanded ? 1 : "none",
                background: "var(--bg-glass)",
                border: "1px solid var(--border-color)",
                color: "var(--text-secondary)",
                gap: expanded ? 6 : 0,
                width: expanded ? "auto" : 36,
                height: 36,
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
              <LogOut size={15} />
              {expanded && <span className="text-sm font-medium">Çıxış</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Finance popup (collapsed mode) */}
      {financeOpen && showFinance && !expanded && (
        <div
          className="fixed z-[9999] py-2 rounded-2xl"
          style={{
            top: financePos,
            left: 72,
            minWidth: 180,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
            backdropFilter: "blur(20px)",
            animation: "fadeInLeft 0.15s ease",
          }}
          onMouseEnter={keepFinance}
          onMouseLeave={closeFinance}
        >
          {/* Bridge gap */}
          <div className="absolute right-full top-0 h-full w-3" onMouseEnter={keepFinance} />
          <p className="text-xs font-bold uppercase tracking-widest px-4 py-2" style={{ color: "var(--text-muted)" }}>
            Maliyyə
          </p>
          {FINANCE_MENU.map(f => {
            const Icon = f.icon
            const active = pathname === f.href
            return (
              <Link
                key={f.href}
                href={f.href}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all"
                style={{
                  color: active ? "#ef4444" : "var(--text-primary)",
                  background: active ? "rgba(239,68,68,0.08)" : "transparent",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)" }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = active ? "rgba(239,68,68,0.08)" : "transparent" }}
              >
                <Icon size={15} style={{ color: active ? "#ef4444" : "var(--text-muted)" }} />
                {f.label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />}
              </Link>
            )
          })}
        </div>
      )}

      {/* Spacer */}
      <div
        className="hidden md:block flex-shrink-0"
        style={{ width: expanded ? 224 : 64, transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)" }}
      />

      <style>{`
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  )
}