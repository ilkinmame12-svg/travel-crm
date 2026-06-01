"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, ClipboardList, Wallet, CreditCard, Globe, Settings, HelpCircle, LogOut, BotMessageSquare, Users, PlaneTakeoff, Building2, Scale,Clock } from "lucide-react"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/lib/hooks/useUserRole"


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
  { href: "/assistant", label: "AI Köməkçi", icon: BotMessageSquare, roles:["it_admin", "boss", "direktor", "muhasib"] },
  { href: "/settings", label: "Ayarlar", icon: Settings, roles: ["it_admin", "boss", "direktor", "muhasib", "menecer"] },
  { href: "/drafts", label: "Təsdiq", icon: Clock, roles: ["it_admin", "direktor", "muhasib", "menecer"] },
]
const ROLE_LABELS: Record<string, string> = {
  it_admin: "IT Admin",
  boss: "Boss",
  direktor: "Direktor",
  muhasib: "Mühasib",
  menecer: "Menecer",
}

const ROLE_COLORS: Record<string, string> = {
  it_admin: "bg-purple-100 text-purple-700",
  boss: "bg-red-100 text-red-700",
  direktor: "bg-blue-100 text-blue-700",
  muhasib: "bg-green-100 text-green-700",
  menecer: "bg-gray-100 text-gray-600",
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

 if (!mounted) return <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 h-12" /> 
  return (
    
    <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
      <Image src="/logo.png" alt="itstour" width={80} height={30} style={{ width: "auto", height: "auto" }} className="object-contain" />
      <div className="flex gap-1 overflow-x-auto">
        {MENU.map(item => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                active ? "bg-red-500 text-white" : "text-gray-500 hover:bg-gray-100"
              }`}>
              <Icon size={16} />
            </Link>
          )
        })}
      </div>
      <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500">
        <LogOut size={18} />
      </button>
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

 if (!mounted) return <div className="w-60 min-h-screen bg-white border-r border-gray-100" />
  return (
    <div className="w-60 min-h-screen bg-white flex flex-col border-r border-gray-100">
      <div className="px-6 py-5 border-b border-gray-100">
        <Image src="/logo.png" alt="itstour" width={120} height={40} className="object-contain" />
      </div>
      <div className="px-4 flex-1 py-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Menu</p>
        <nav className="space-y-0.5 mb-6">
          {MENU.map(item => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? "bg-red-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        {profile?.role === "it_admin" && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">General</p>
            <nav className="space-y-0.5">
              <Link href="/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all">
                <Settings size={18} />
                <span>Settings</span>
              </Link>
              <Link href="/help"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all">
                <HelpCircle size={18} />
                <span>Help</span>
              </Link>
            </nav>
          </>
        )}
      </div>
      <div className="px-4 pb-4 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl">
         <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center overflow-hidden">
  {profile?.avatarUrl ? (
    <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
  ) : (
    <span className="text-red-600 text-sm font-semibold">
      {profile?.fullName?.[0]?.toUpperCase() ?? (loading ? "..." : "?")}
    </span>
  )}
</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{profile?.fullName ?? "..."}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${ROLE_COLORS[profile?.role ?? ""] ?? "bg-gray-100 text-gray-500"}`}>
              {ROLE_LABELS[profile?.role ?? ""] ?? "..."}
            </span>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all w-full">
          <LogOut size={18} />
          <span>Çıxış</span>
        </button>
      </div>
    </div>
  )
}