"use client"

import { useEffect } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { formatCurrency } from "@/lib/calculations"
import { TrendingUp, TrendingDown, DollarSign, Users, Clock, CheckCircle, ArrowUpRight } from "lucide-react"

function KpiCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: any = {
    red: "bg-red-50 text-red-500",
    green: "bg-green-50 text-green-600",
    blue: "bg-blue-50 text-blue-600",
    gray: "bg-gray-100 text-gray-500",
    amber: "bg-amber-50 text-amber-500",
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    red: "bg-red-50 text-red-500",
    green: "bg-green-50 text-green-600",
    blue: "bg-blue-50 text-blue-600",
    gray: "bg-gray-100 text-gray-500",
    amber: "bg-amber-50 text-amber-500",
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 truncate">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { bookings, fetchBookings } = useBookingsStore()

  useEffect(() => { fetchBookings() }, [])

  const totalRevenue = bookings.reduce((s, b) => s + b.sellPrice, 0)
  const totalCost = bookings.reduce((s, b) => s + b.buyPrice, 0)
  const totalProfit = bookings.reduce((s, b) => s + b.profit, 0)
  const totalCommission = bookings.reduce((s, b) => s + b.commissionAmount, 0)
  const pending = bookings.filter(b => b.status === "pending").length
  const confirmed = bookings.filter(b => b.status === "confirmed").length
  const margin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0
  const recent = [...bookings].slice(0, 5)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">Bugünkü statistika</p>
        </div>
      </div>

      {/* KPI cards - 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-green-600 rounded-2xl p-4 text-white col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium opacity-90">Ümumi gəlir</p>
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <ArrowUpRight size={14} />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold mb-0.5">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs opacity-70">Satış qiyməti</p>
        </div>
        <KpiCard label="Ümumi xərc" value={formatCurrency(totalCost)} sub="Alış qiyməti" icon={TrendingDown} color="red" />
        <KpiCard label="Mənfəət" value={formatCurrency(totalProfit)} sub={`Marja: ${margin}%`} icon={TrendingUp} color="green" />
        <KpiCard label="Komissiya" value={formatCurrency(totalCommission)} sub="Cəmi komissiya" icon={DollarSign} color="blue" />
      </div>

      {/* Stat cards - 3 cols always */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="Cəmi sifarişlər" value={bookings.length} icon={Users} color="gray" />
        <StatCard label="Gözləyir" value={pending} icon={Clock} color="amber" />
        <StatCard label="Təsdiqlənib" value={confirmed} icon={CheckCircle} color="green" />
      </div>

      {/* Recent bookings */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm md:text-base font-semibold text-gray-900">Son sifarişlər</h2>
          <a href="/bookings" className="text-xs text-green-600 font-medium hover:underline">Hamısına bax →</a>
        </div>

        {/* Mobile: card view */}
        <div className="md:hidden space-y-3">
          {recent.map(b => (
            <div key={b.id} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-semibold text-gray-900 truncate flex-1">{b.clientName}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0 ${
                  b.status === "confirmed" ? "bg-blue-50 text-blue-700" :
                  b.status === "pending" ? "bg-amber-50 text-amber-700" :
                  b.status === "completed" ? "bg-green-50 text-green-700" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  {b.status === "confirmed" ? "Təsdiqlənib" : b.status === "pending" ? "Gözləyir" : b.status === "completed" ? "Tamamlandı" : "Ləğv edildi"}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate mb-2">{b.destination}</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">{formatCurrency(b.sellPrice)}</p>
                <p className={`text-xs font-semibold ${b.profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {formatCurrency(b.profit)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: table view */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Müştəri", "İstiqamət", "Satış", "Mənfəət", "Status"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map(b => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-900">{b.clientName}</td>
                  <td className="py-3 text-gray-500 max-w-xs truncate">{b.destination}</td>
                  <td className="py-3 font-semibold text-gray-900">{formatCurrency(b.sellPrice)}</td>
                  <td className="py-3">
                    <span className={b.profit >= 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                      {formatCurrency(b.profit)}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      b.status === "confirmed" ? "bg-blue-50 text-blue-700" :
                      b.status === "pending" ? "bg-amber-50 text-amber-700" :
                      b.status === "completed" ? "bg-green-50 text-green-700" :
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