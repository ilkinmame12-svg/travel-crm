"use client"

import { useEffect } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { formatCurrency } from "@/lib/calculations"
import { TrendingUp, TrendingDown, DollarSign, Users, Clock, CheckCircle, ArrowUpRight } from "lucide-react"

export default function DashboardPage() {
  const { bookings, fetchBookings } = useBookingsStore()

  useEffect(() => { fetchBookings() }, [])

  const totalRevenue = bookings.reduce((s, b) => s + b.sellPrice, 0)
  const totalCost = bookings.reduce((s, b) => s + b.buyPrice, 0)
  const totalProfit = bookings.reduce((s, b) => s + b.profit, 0)
  const totalCommission = bookings.reduce((s, b) => s + b.commissionAmount, 0)
  const pending = bookings.filter(b => b.status === "pending").length
  const confirmed = bookings.filter(b => b.status === "confirmed").length
  const unpaid = bookings.filter(b => b.paymentStatus !== "paid").length
  const margin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0
  const recent = [...bookings].slice(0, 8)

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
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl text-sm font-medium" style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            color: "var(--text-secondary)",
            backdropFilter: "blur(20px)",
          }}>
            {bookings.length} sifariş
          </div>
        </div>
      </div>

      {/* Main KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">

        {/* Revenue - gradient card */}
        <div className="col-span-2 lg:col-span-1 rounded-3xl p-6 text-white relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
            style={{ background: "white", transform: "translate(20%, -30%)" }} />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-10"
            style={{ background: "white", transform: "translate(-20%, 30%)" }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium opacity-80">Ümumi gəlir</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                <ArrowUpRight size={15} />
              </div>
            </div>
            <p className="text-2xl font-bold mb-1">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs opacity-70">Satış qiyməti</p>
          </div>
        </div>

        {/* Cost */}
        <div className="rounded-3xl p-5 relative overflow-hidden" style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          backdropFilter: "blur(20px)",
        }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Alış xərci</p>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
              <TrendingDown size={14} className="text-red-500" />
            </div>
          </div>
          <p className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{formatCurrency(totalCost)}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Bilet və tur xərcləri</p>
        </div>

        {/* Profit */}
        <div className="rounded-3xl p-5" style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          backdropFilter: "blur(20px)",
        }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Mənfəət</p>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)" }}>
              <TrendingUp size={14} className="text-green-500" />
            </div>
          </div>
          <p className="text-xl font-bold mb-1" style={{ color: totalProfit >= 0 ? "#22c55e" : "#ef4444" }}>{formatCurrency(totalProfit)}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Marja: {margin}%</p>
        </div>

        {/* Commission */}
        <div className="rounded-3xl p-5" style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          backdropFilter: "blur(20px)",
        }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Komissiya</p>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
              <DollarSign size={14} className="text-indigo-500" />
            </div>
          </div>
          <p className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{formatCurrency(totalCommission)}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Cəmi komissiya</p>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Cəmi sifarişlər", value: bookings.length, icon: Users, color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
          { label: "Gözləyir", value: pending, icon: Clock, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
          { label: "Ödənilməyib", value: unpaid, icon: CheckCircle, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-3xl p-5 flex items-center gap-4" style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            backdropFilter: "blur(20px)",
          }}>
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

      {/* Recent bookings */}
      <div className="rounded-3xl overflow-hidden" style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        backdropFilter: "blur(20px)",
      }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Son sifarişlər</h2>
          <a href="/bookings" className="text-xs font-medium px-3 py-1.5 rounded-xl transition-all hover:opacity-80"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
            Hamısına bax →
          </a>
        </div>

        {/* Mobile */}
        <div className="md:hidden p-4 space-y-3">
          {recent.map(b => (
            <div key={b.id} className="rounded-2xl p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-semibold truncate flex-1" style={{ color: "var(--text-primary)" }}>{b.clientName}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0 ${
                  b.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                  b.status === "pending" ? "bg-amber-100 text-amber-700" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  {b.status === "confirmed" ? "✓" : b.status === "pending" ? "⏳" : "✕"}
                </span>
              </div>
              <p className="text-xs truncate mb-2" style={{ color: "var(--text-muted)" }}>{b.destination}</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{formatCurrency(b.sellPrice)}</p>
                <p className={`text-xs font-semibold ${b.profit >= 0 ? "text-green-500" : "text-red-500"}`}>{formatCurrency(b.profit)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
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
                <tr key={b.id} className="group transition-all" style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td className="px-6 py-4">
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{b.clientName}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{b.clientPhone}</p>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate" style={{ color: "var(--text-secondary)" }}>{b.destination}</td>
                  <td className="px-6 py-4 font-semibold" style={{ color: "var(--text-primary)" }}>{formatCurrency(b.sellPrice)}</td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${b.profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {formatCurrency(b.profit)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      b.paymentStatus === "paid" ? "bg-green-100 text-green-700" :
                      b.paymentStatus === "partial" ? "bg-orange-100 text-orange-600" :
                      "bg-red-100 text-red-600"
                    }`}>
                      {b.paymentStatus === "paid" ? "Ödənilib" : b.paymentStatus === "partial" ? "Qismən" : "Ödənilməyib"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      b.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                      b.status === "pending" ? "bg-amber-100 text-amber-700" :
                      b.status === "completed" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
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