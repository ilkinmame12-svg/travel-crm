"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, ClipboardList, Wallet, CreditCard, Globe, Settings, HelpCircle, LogOut, BotMessageSquare, Users, PlaneTakeoff, Building2 } from "lucide-react"
import Image from "next/image"
import { supabase } from "@/lib/supabase"

const MENU = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Sifarişlər", icon: ClipboardList },
  { href: "/finances", label: "Maliyyə", icon: Wallet },
  { href: "/debts", label: "Borclar", icon: CreditCard },
  { href: "/creditors", label: "Kreditorlar", icon: Building2 },
  { href: "/iata", label: "IATA", icon: Globe },
  { href: "/employees", label: "İşçilər", icon: Users },
  { href: "/flights", label: "TK NDC", icon: PlaneTakeoff },
  { href: "/assistant", label: "AI Köməkçi", icon: BotMessageSquare },
]

const GENERAL = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: HelpCircle },
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

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

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

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
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">General</p>
        <nav className="space-y-0.5">
          {GENERAL.map(item => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all">
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="px-4 pb-4 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-sm font-semibold">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">Admin</p>
            <p className="text-xs text-gray-400 truncate">itstour.az</p>
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