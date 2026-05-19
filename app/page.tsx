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
  const margin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0
  const recent = [...bookings].slice(0, 5)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Xoş gəldiniz! Bugünkü statistika</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-700 font-semibold text-sm">A</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-green-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium opacity-90">Ümumi gəlir</p>
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold mb-1">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs opacity-70">Satış qiyməti</p>
        </div>

        <KpiCard label="Ümumi xərc" value={formatCurrency(totalCost)} sub="Alış qiyməti" icon={TrendingDown} color="red" />
        <KpiCard label="Mənfəət" value={formatCurrency(totalProfit)} sub={`Marja: ${margin}%`} icon={TrendingUp} color="green" />
        <KpiCard label="Komissiya" value={formatCurrency(totalCommission)} sub="Cəmi komissiya" icon={DollarSign} color="blue" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Cəmi sifarişlər" value={bookings.length} icon={Users} color="gray" />
        <StatCard label="Gözləyir" value={pending} icon={Clock} color="amber" />
        <StatCard label="Təsdiqlənib" value={confirmed} icon={CheckCircle} color="green" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Son sifarişlər</h2>
          <a href="/bookings" className="text-xs text-green-600 font-medium hover:underline">Hamısına bax →</a>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["Müştəri", "İstiqamət", "Satış", "Mənfəət", "Status"].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 px-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.map(b => (
              <tr key={b.id} className="hover:bg-gray-50 rounded-xl">
                <td className="px-2 py-3 font-medium text-gray-900">{b.clientName}</td>
                <td className="px-2 py-3 text-gray-600">{b.destination}</td>
                <td className="px-2 py-3 font-semibold text-gray-900">{formatCurrency(b.sellPrice)}</td>
                <td className="px-2 py-3">
                  <span className={b.profit >= 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                    {formatCurrency(b.profit)}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    b.status === "confirmed" ? "bg-green-100 text-green-700" :
                    b.status === "pending" ? "bg-amber-100 text-amber-700" :
                    b.status === "completed" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-500"}`}>
                    {b.status === "confirmed" ? "Təsdiqlənib" :
                     b.status === "pending" ? "Gözləyir" :
                     b.status === "completed" ? "Tamamlandı" : "Ləğv edildi"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub: string; icon: any
  color: "red" | "green" | "blue"
}) {
  const colors = {
    red:   { bg: "bg-red-50",   icon: "text-red-500",   val: "text-red-600",   iconBg: "bg-red-100" },
    green: { bg: "bg-green-50", icon: "text-green-600", val: "text-green-700", iconBg: "bg-green-100" },
    blue:  { bg: "bg-blue-50",  icon: "text-blue-600",  val: "text-blue-700",  iconBg: "bg-blue-100" },
  }
  const c = colors[color]
  return (
    <div className={`${c.bg} rounded-2xl p-5 border border-white`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <div className={`w-8 h-8 ${c.iconBg} rounded-lg flex items-center justify-center`}>
          <Icon size={16} className={c.icon} />
        </div>
      </div>
      <p className={`text-xl font-bold ${c.val} mb-1`}>{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: any
  color: "gray" | "amber" | "green"
}) {
  const colors = {
    gray:  { bg: "bg-white",     iconBg: "bg-gray-100",   icon: "text-gray-500" },
    amber: { bg: "bg-white",     iconBg: "bg-amber-50",   icon: "text-amber-500" },
    green: { bg: "bg-white",     iconBg: "bg-green-50",   icon: "text-green-600" },
  }
  const c = colors[color]
  return (
    <div className={`${c.bg} rounded-2xl border border-gray-100 p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-2xl ${c.iconBg} flex items-center justify-center`}>
        <Icon size={22} className={c.icon} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}
