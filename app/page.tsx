"use client"

import { useEffect, useState } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { usePaymentsStore } from "@/lib/store/paymentsStore"
import { supabase } from "@/lib/supabase"
import { formatCurrency } from "@/lib/calculations"
import { TrendingUp, TrendingDown, DollarSign, Users, Clock, ArrowUpRight, Trophy, AlertCircle } from "lucide-react"

export default function DashboardPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const { payments, fetchPayments } = usePaymentsStore()
  const [cashHistory, setCashHistory] = useState<any[]>([])

  useEffect(() => {
    fetchBookings()
    fetchPayments()
    supabase.from("cash_transactions").select("*").order("created_at", { ascending: false }).limit(5).then(({ data }) => {
      setCashHistory(data ?? [])
    })
  }, [])

  const totalRevenue = bookings.reduce((s, b) => s + b.sellPrice, 0)
  const totalCost = bookings.reduce((s, b) => s + b.buyPrice, 0)
  const totalProfit = bookings.reduce((s, b) => s + b.profit, 0)
  const totalCommission = bookings.reduce((s, b) => s + b.commissionAmount, 0)
  const pending = bookings.filter(b => b.status === "pending").length
  const unpaid = bookings.filter(b => b.paymentStatus !== "paid").length
  const margin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0
  const recent = [...bookings].slice(0, 6)

  // Top managers
  const managerStats = bookings.reduce((acc: any, b) => {
    if (!b.manager) return acc
    if (!acc[b.manager]) acc[b.manager] = { revenue: 0, profit: 0, count: 0 }
    acc[b.manager].revenue += b.sellPrice
    acc[b.manager].profit += b.profit
    acc[b.manager].count++
    return acc
  }, {})
  const topManagers = Object.entries(managerStats)
    .map(([name, s]: any) => ({ name, ...s }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Top clients
  const clientStats = bookings.reduce((acc: any, b) => {
    if (!b.clientName) return acc
    if (!acc[b.clientName]) acc[b.clientName] = { revenue: 0, count: 0 }
    acc[b.clientName].revenue += b.sellPrice
    acc[b.clientName].count++
    return acc
  }, {})
  const topClients = Object.entries(clientStats)
    .map(([name, s]: any) => ({ name, ...s }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Top debts
  const topDebts = bookings
    .filter(b => b.paymentStatus !== "paid" && b.sellPrice - (b.paidAmount ?? 0) > 0)
    .map(b => ({ ...b, remaining: b.sellPrice - (b.paidAmount ?? 0) }))
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 5)

  const cardStyle = {
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    backdropFilter: "blur(20px)",
    borderRadius: "24px",
  }

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {new Date().toLocaleDateString("az-AZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="col-span-2 lg:col-span-1 p-6 text-white relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", borderRadius: "24px" }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: "white", transform: "translate(20%, -30%)" }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium opacity-80">Ümumi gəlir</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                <ArrowUpRight size={15} />
              </div>
            </div>
            <p className="text-2xl font-bold mb-1">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs opacity-70">Marja: {margin}%</p>
          </div>
        </div>

        {[
          { label: "Alış xərci", value: formatCurrency(totalCost), sub: "Bilet və tur", icon: TrendingDown, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
          { label: "Mənfəət", value: formatCurrency(totalProfit), sub: `${margin}% marja`, icon: TrendingUp, color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
          { label: "Komissiya", value: formatCurrency(totalCommission), sub: "Cəmi", icon: DollarSign, color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <p className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{value}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Cəmi sifarişlər", value: bookings.length, icon: Users, color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
          { label: "Gözləyir", value: pending, icon: Clock, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
          { label: "Ödənilməyib", value: unpaid, icon: AlertCircle, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="p-5 flex items-center gap-4" style={cardStyle}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Widgets row 1: Top Managers + Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Top Managers */}
        <div style={cardStyle} className="overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
            <Trophy size={16} className="text-amber-500" />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Top Menecerlər</h2>
          </div>
          <div className="p-4 space-y-3">
            {topManagers.map((m, i) => (
              <div key={m.name} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: i === 0 ? "linear-gradient(135deg, #f59e0b, #fbbf24)" :
                                i === 1 ? "linear-gradient(135deg, #94a3b8, #cbd5e1)" :
                                i === 2 ? "linear-gradient(135deg, #b45309, #d97706)" :
                                "var(--bg-glass)",
                    color: i < 3 ? "white" : "var(--text-secondary)",
                  }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{m.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{m.count} sifariş</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{formatCurrency(m.revenue)}</p>
                  <p className="text-xs text-green-500">{formatCurrency(m.profit)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clients */}
        <div style={cardStyle} className="overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
            <Users size={16} className="text-blue-500" />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Top Müştərilər</h2>
          </div>
          <div className="p-4 space-y-3">
            {topClients.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: i === 0 ? "linear-gradient(135deg, #3b82f6, #06b6d4)" :
                                i === 1 ? "linear-gradient(135deg, #8b5cf6, #6366f1)" :
                                i === 2 ? "linear-gradient(135deg, #10b981, #34d399)" :
                                "var(--bg-glass)",
                    color: i < 3 ? "white" : "var(--text-secondary)",
                  }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.count} sifariş</p>
                </div>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{formatCurrency(c.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Widgets row 2: Cash History + Top Debts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Cash History */}
        <div style={cardStyle} className="overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
            <div className="flex items-center gap-2">
              <span className="text-base">💵</span>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Son Kassa Əməliyyatları</h2>
            </div>
            <a href="/finances" className="text-xs px-3 py-1.5 rounded-xl" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
              Hamısı →
            </a>
          </div>
          <div className="p-4 space-y-3">
            {cashHistory.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>Əməliyyat yoxdur</p>
            ) : cashHistory.map((t: any) => (
              <div key={t.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: t.operation === "add" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)" }}>
                  <span className={t.operation === "add" ? "text-green-500" : "text-red-500"} style={{ fontSize: 16 }}>
                    {t.operation === "add" ? "↑" : "↓"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{t.reason || "Səbəb yoxdur"}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(t.created_at).toLocaleDateString("az-AZ")} • {t.currency}
                  </p>
                </div>
                <p className={`text-sm font-bold ${t.operation === "add" ? "text-green-500" : "text-red-500"}`}>
                  {t.operation === "add" ? "+" : "−"}{t.amount} {t.currency}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Debts */}
        <div style={cardStyle} className="overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500" />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Ən Böyük Borclar</h2>
            </div>
            <a href="/debts" className="text-xs px-3 py-1.5 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              Hamısı →
            </a>
          </div>
          <div className="p-4 space-y-3">
            {topDebts.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>Borc yoxdur 🎉</p>
            ) : topDebts.map((b, i) => (
              <div key={b.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(239,68,68,0.1)" }}>
                  <span className="text-red-500 text-sm font-bold">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{b.clientName}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{b.destination}</p>
                </div>
                <p className="text-sm font-bold text-red-500">{formatCurrency(b.remaining)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div style={cardStyle} className="overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Son Sifarişlər</h2>
          <a href="/bookings" className="text-xs px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
            Hamısına bax →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                {["Müştəri", "İstiqamət", "Satış", "Mənfəət", "Ödəniş", "Status"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-6 py-4"
                    style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map(b => (
                <tr key={b.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td className="px-6 py-3">
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{b.clientName}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{b.clientPhone}</p>
                  </td>
                  <td className="px-6 py-3 max-w-xs truncate" style={{ color: "var(--text-secondary)" }}>{b.destination}</td>
                  <td className="px-6 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>{formatCurrency(b.sellPrice)}</td>
                  <td className="px-6 py-3">
                    <span className={`font-semibold ${b.profit >= 0 ? "text-green-500" : "text-red-500"}`}>{formatCurrency(b.profit)}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      b.paymentStatus === "paid" ? "bg-green-100 text-green-700" :
                      b.paymentStatus === "partial" ? "bg-orange-100 text-orange-600" :
                      "bg-red-100 text-red-600"}`}>
                      {b.paymentStatus === "paid" ? "Ödənilib" : b.paymentStatus === "partial" ? "Qismən" : "Ödənilməyib"}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      b.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                      b.status === "pending" ? "bg-amber-100 text-amber-700" :
                      b.status === "completed" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-500"}`}>
                      {b.status === "confirmed" ? "Təsdiqlənib" : b.status === "pending" ? "Gözləyir" : b.status === "completed" ? "Tamamlandı" : "Ləğv edildi"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}