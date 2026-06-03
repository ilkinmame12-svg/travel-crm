"use client"

import { useState, useEffect, useMemo } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { formatCurrency, formatDate } from "@/lib/calculations"
import { Download } from "lucide-react"
import * as XLSX from "xlsx"

const PERIODS = ["1-7", "8-15", "16-23", "24-31"] as const
const card = { background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(20px)", borderRadius: "24px" }

export default function IATAPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const [activePeriod, setActivePeriod] = useState<string>("1-7")
  const [selectedMonth, setSelectedMonth] = useState("2026-01")
  const [ready, setReady] = useState(false)

  useEffect(() => { fetchBookings(); setReady(true) }, [])

  const grouped = useMemo(() => PERIODS.map(period => {
    const items = bookings.filter(b => b.iataPeriod === period && b.isIata === true && b.departureDate.startsWith(selectedMonth))
    return { period, items, totalSell: items.reduce((s, b) => s + b.sellPrice, 0), totalBuy: items.reduce((s, b) => s + b.buyPrice, 0), totalProfit: items.reduce((s, b) => s + b.profit, 0), totalCommission: items.reduce((s, b) => s + b.commissionAmount, 0) }
  }), [bookings, selectedMonth])

  const active = useMemo(() => grouped.find(g => g.period === activePeriod) ?? grouped[0], [grouped, activePeriod])

  function exportToExcel() {
    const rows = active.items.map(b => ({ "Müştəri": b.clientName, "Telefon": b.clientPhone, "İstiqamət": b.destination, "Uçuş tarixi": b.departureDate, "Menecer": b.manager, "Bilet №": b.ticketNumber ?? "", "PNR": b.pnr ?? "", "Satış (AZN)": b.sellPrice, "Alış (AZN)": b.buyPrice, "Komissiya (AZN)": b.commissionAmount, "Mənfəət (AZN)": b.profit, "Ödəniş": b.paymentStatus === "paid" ? "Ödənilib" : b.paymentStatus === "partial" ? "Qismən" : "Ödənilməyib" }))
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, `Period ${activePeriod}`); XLSX.writeFile(wb, `IATA_Period_${activePeriod}.xlsx`)
  }

  function exportAllToExcel() {
    const wb = XLSX.utils.book_new()
    grouped.forEach(g => {
      if (g.items.length === 0) return
      const rows = g.items.map(b => ({ "Müştəri": b.clientName, "İstiqamət": b.destination, "Uçuş tarixi": b.departureDate, "Menecer": b.manager, "Bilet №": b.ticketNumber ?? "", "Satış (AZN)": b.sellPrice, "Alış (AZN)": b.buyPrice, "Komissiya (AZN)": b.commissionAmount, "Mənfəət (AZN)": b.profit }))
      const ws = XLSX.utils.json_to_sheet(rows); XLSX.utils.book_append_sheet(wb, ws, `Period ${g.period}`)
    })
    XLSX.writeFile(wb, `IATA_Hesabat.xlsx`)
  }

  if (!ready) return null

  const periodColors = ["linear-gradient(135deg, #3b82f6, #06b6d4)", "linear-gradient(135deg, #8b5cf6, #6366f1)", "linear-gradient(135deg, #ef4444, #f97316)", "linear-gradient(135deg, #10b981, #34d399)"]

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>
      <div className="flex items-center justify-between mb-7">
        <div><h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>IATA Periods</h1><p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Aylıq IATA hesabatı</p></div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl" style={card}>
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Ay:</span>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="text-sm focus:outline-none bg-transparent" style={{ color: "var(--text-primary)" }} />
            <span className="text-xs px-2 py-1 rounded-xl" style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>{bookings.filter(b => b.isIata && b.departureDate.startsWith(selectedMonth)).length} bilet</span>
          </div>
          <button onClick={exportAllToExcel} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}><Download size={16} />Hamısını Excel-ə yüklə</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {grouped.map((g, i) => (
          <button key={g.period} onClick={() => setActivePeriod(g.period)} className="text-left p-5 rounded-3xl transition-all hover:scale-[1.02]"
            style={{ background: activePeriod === g.period ? periodColors[i] : "var(--bg-card)", border: activePeriod === g.period ? "none" : "1px solid var(--border-color)", backdropFilter: "blur(20px)", boxShadow: activePeriod === g.period ? "0 8px 25px rgba(0,0,0,0.2)" : "none" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: activePeriod === g.period ? "white" : "var(--text-primary)" }}>Period {g.period}</h2>
              <span className="text-xs px-2 py-1 rounded-xl font-medium" style={{ background: activePeriod === g.period ? "rgba(255,255,255,0.2)" : "var(--bg-glass)", color: activePeriod === g.period ? "white" : "var(--text-secondary)" }}>{g.items.length} bron</span>
            </div>
            <div className="space-y-2">
              {[{ label: "Satış", value: formatCurrency(g.totalSell) }, { label: "Alış", value: formatCurrency(g.totalBuy) }, { label: "Komissiya", value: formatCurrency(g.totalCommission) }].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-sm" style={{ color: activePeriod === g.period ? "rgba(255,255,255,0.7)" : "var(--text-secondary)" }}>{label}</span>
                  <span className="text-sm font-semibold" style={{ color: activePeriod === g.period ? "white" : "var(--text-primary)" }}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2" style={{ borderColor: activePeriod === g.period ? "rgba(255,255,255,0.2)" : "var(--border-color)" }}>
                <span className="text-sm font-semibold" style={{ color: activePeriod === g.period ? "rgba(255,255,255,0.8)" : "var(--text-secondary)" }}>Mənfəət</span>
                <span className="text-sm font-bold" style={{ color: activePeriod === g.period ? "white" : g.totalProfit >= 0 ? "#22c55e" : "#ef4444" }}>{formatCurrency(g.totalProfit)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-3xl overflow-hidden" style={card}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Period {active.period}</h2>
            <span className="text-xs px-2 py-1 rounded-xl" style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>{active.items.length} bron</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-4 text-sm">
              {[{ label: "Satış", value: active.totalSell, color: "var(--text-primary)" }, { label: "Alış", value: active.totalBuy, color: "#ef4444" }, { label: "Komissiya", value: active.totalCommission, color: "#6366f1" }, { label: "Mənfəət", value: active.totalProfit, color: active.totalProfit >= 0 ? "#22c55e" : "#ef4444" }].map(({ label, value, color }) => (
                <span key={label} style={{ color: "var(--text-secondary)" }}>{label}: <span style={{ color, fontWeight: 600 }}>{formatCurrency(value)}</span></span>
              ))}
            </div>
            <button onClick={exportToExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}><Download size={14} />Excel</button>
          </div>
        </div>

        {active.items.length === 0 ? (
          <div className="text-center py-16" style={{ color: "var(--text-muted)" }}><p className="text-sm font-medium">Bu periodda bron yoxdur</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: "1px solid var(--border-color)" }}>{["Müştəri", "İstiqamət", "Tarix", "Menecer", "Bilet №", "Satış", "Alış", "Komissiya", "Mənfəət", "Ödəniş", "Status"].map(h => <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3" style={{ color: "var(--text-muted)" }}>{h}</th>)}</tr></thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border-color)" }}>
              {active.items.map(b => (
                <tr key={b.id}>
                  <td className="px-4 py-3"><p className="font-medium" style={{ color: "var(--text-primary)" }}>{b.clientName}</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>{b.clientPhone}</p></td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{b.destination}</td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{formatDate(b.departureDate)}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{b.manager}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{b.ticketNumber || "—"}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>{formatCurrency(b.sellPrice)}</td>
                  <td className="px-4 py-3 font-semibold text-red-500">{formatCurrency(b.buyPrice)}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "#6366f1" }}>{formatCurrency(b.commissionAmount)}</td>
                  <td className="px-4 py-3"><span className={b.profit >= 0 ? "font-semibold text-green-500" : "font-semibold text-red-500"}>{formatCurrency(b.profit)}</span></td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-xl font-medium" style={{ background: b.paymentStatus === "paid" ? "rgba(34,197,94,0.1)" : b.paymentStatus === "partial" ? "rgba(249,115,22,0.1)" : "rgba(239,68,68,0.1)", color: b.paymentStatus === "paid" ? "#22c55e" : b.paymentStatus === "partial" ? "#f97316" : "#ef4444" }}>{b.paymentStatus === "paid" ? "Ödənilib" : b.paymentStatus === "partial" ? "Qismən" : "Ödənilməyib"}</span></td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-xl font-medium" style={{ background: b.status === "confirmed" ? "rgba(99,102,241,0.1)" : b.status === "pending" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)", color: b.status === "confirmed" ? "#6366f1" : b.status === "pending" ? "#f59e0b" : "#22c55e" }}>{b.status === "confirmed" ? "Təsdiqlənib" : b.status === "pending" ? "Gözləyir" : "Tamamlandı"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
