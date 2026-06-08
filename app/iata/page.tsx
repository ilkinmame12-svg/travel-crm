"use client"

import { useState, useEffect, useMemo } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { formatCurrency, formatDate } from "@/lib/calculations"
import { Download, ChevronDown } from "lucide-react"
import * as XLSX from "xlsx"

const PERIODS = ["1-7", "8-15", "16-23", "24-31"] as const

const PERIOD_COLORS = [
  { from: "#3b82f6", to: "#06b6d4", shadow: "rgba(59,130,246,0.3)" },
  { from: "#8b5cf6", to: "#6366f1", shadow: "rgba(139,92,246,0.3)" },
  { from: "#ef4444", to: "#f97316", shadow: "rgba(239,68,68,0.3)" },
  { from: "#10b981", to: "#34d399", shadow: "rgba(16,185,129,0.3)" },
]

const card = { background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(20px)", borderRadius: "24px" }

export default function IATAPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const [activePeriod, setActivePeriod] = useState<string>("1-7")
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [ready, setReady] = useState(false)

  useEffect(() => { fetchBookings(); setReady(true) }, [])

  const grouped = useMemo(() => PERIODS.map(period => {
    const items = bookings.filter(b =>
      b.iataPeriod === period && b.isIata === true && b.departureDate.startsWith(selectedMonth)
    )
    return {
      period,
      items,
      totalSell: items.reduce((s, b) => s + b.sellPrice, 0),
      totalBuy: items.reduce((s, b) => s + b.buyPrice, 0),
      totalProfit: items.reduce((s, b) => s + b.profit, 0),
      totalCommission: items.reduce((s, b) => s + b.commissionAmount, 0),
    }
  }), [bookings, selectedMonth])

  const active = useMemo(() => grouped.find(g => g.period === activePeriod) ?? grouped[0], [grouped, activePeriod])

  function exportToExcel() {
    const rows = active.items.map(b => ({
      "Müştəri": b.clientName, "Telefon": b.clientPhone, "İstiqamət": b.destination,
      "Uçuş tarixi": b.departureDate, "Menecer": b.manager,
      "Bilet №": b.ticketNumber ?? "", "PNR": b.pnr ?? "",
      "Satış (AZN)": b.sellPrice, "Alış (AZN)": b.buyPrice,
      "Komissiya (AZN)": b.commissionAmount, "Mənfəət (AZN)": b.profit,
      "Ödəniş": b.paymentStatus === "paid" ? "Ödənilib" : b.paymentStatus === "partial" ? "Qismən" : "Ödənilməyib"
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Period ${activePeriod}`)
    XLSX.writeFile(wb, `IATA_Period_${activePeriod}.xlsx`)
  }

  function exportAllToExcel() {
    const wb = XLSX.utils.book_new()
    grouped.forEach(g => {
      if (g.items.length === 0) return
      const rows = g.items.map(b => ({
        "Müştəri": b.clientName, "İstiqamət": b.destination,
        "Uçuş tarixi": b.departureDate, "Menecer": b.manager,
        "Bilet №": b.ticketNumber ?? "", "Satış (AZN)": b.sellPrice,
        "Alış (AZN)": b.buyPrice, "Komissiya (AZN)": b.commissionAmount, "Mənfəət (AZN)": b.profit
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, `Period ${g.period}`)
    })
    XLSX.writeFile(wb, `IATA_Hesabat.xlsx`)
  }

  if (!ready) return null

  const totalBiletsThisMonth = bookings.filter(b => b.isIata && b.departureDate.startsWith(selectedMonth)).length

  return (
    <div className="min-h-screen p-4 md:p-7" style={{ background: "var(--bg-primary)" }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>IATA</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Aylıq IATA hesabatı</p>
        </div>
        <button onClick={exportAllToExcel}
          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-sm font-semibold text-white flex-shrink-0 transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #10b981, #34d399)", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}>
          <Download size={15} />
          <span className="hidden sm:inline">Hamısını </span>Excel
        </button>
      </div>

      {/* ── Month picker ── */}
      <div className="flex items-center gap-3 p-4 rounded-3xl mb-6" style={card}>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Ay:</span>
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="text-sm font-semibold focus:outline-none bg-transparent flex-1"
            style={{ color: "var(--text-primary)" }} />
        </div>
        <span className="text-xs px-2.5 py-1 rounded-xl font-semibold flex-shrink-0"
          style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
          {totalBiletsThisMonth} bilet
        </span>
      </div>

      {/* ── Period cards — horizontal scroll on mobile ── */}
      <div className="flex gap-3 overflow-x-auto pb-2 mb-6 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 scrollbar-hide">
        {grouped.map((g, i) => {
          const c = PERIOD_COLORS[i]
          const isActive = activePeriod === g.period
          return (
            <button
              key={g.period}
              onClick={() => setActivePeriod(g.period)}
              className="flex-shrink-0 w-44 md:w-auto text-left p-4 md:p-5 rounded-3xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: isActive ? `linear-gradient(135deg, ${c.from}, ${c.to})` : "var(--bg-card)",
                border: isActive ? "none" : "1px solid var(--border-color)",
                backdropFilter: "blur(20px)",
                boxShadow: isActive ? `0 8px 24px ${c.shadow}` : "none",
              }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold" style={{ color: isActive ? "white" : "var(--text-primary)" }}>
                  Period {g.period}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-xl font-semibold"
                  style={{ background: isActive ? "rgba(255,255,255,0.2)" : "var(--bg-glass)", color: isActive ? "white" : "var(--text-secondary)" }}>
                  {g.items.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: "Satış", value: formatCurrency(g.totalSell) },
                  { label: "Alış", value: formatCurrency(g.totalBuy) },
                  { label: "Komissiya", value: formatCurrency(g.totalCommission) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center gap-2">
                    <span className="text-xs" style={{ color: isActive ? "rgba(255,255,255,0.65)" : "var(--text-muted)" }}>{label}</span>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: isActive ? "white" : "var(--text-primary)" }}>{value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-1.5" style={{ borderTop: `1px solid ${isActive ? "rgba(255,255,255,0.2)" : "var(--border-color)"}` }}>
                  <span className="text-xs font-semibold" style={{ color: isActive ? "rgba(255,255,255,0.75)" : "var(--text-secondary)" }}>Mənfəət</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: isActive ? "white" : g.totalProfit >= 0 ? "#22c55e" : "#ef4444" }}>
                    {formatCurrency(g.totalProfit)}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Active period detail ── */}
      <div className="rounded-3xl overflow-hidden" style={card}>
        {/* Header */}
        <div className="px-4 md:px-6 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Period {active.period}</h2>
              <span className="text-xs px-2 py-0.5 rounded-xl" style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>
                {active.items.length} bron
              </span>
            </div>
            <button onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white flex-shrink-0 transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}>
              <Download size={13} />Excel
            </button>
          </div>
          {/* Summary row — wraps on mobile */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Satış", value: active.totalSell, color: "var(--text-primary)" },
              { label: "Alış", value: active.totalBuy, color: "#ef4444" },
              { label: "Komissiya", value: active.totalCommission, color: "#6366f1" },
              { label: "Mənfəət", value: active.totalProfit, color: active.totalProfit >= 0 ? "#22c55e" : "#ef4444" },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-3 py-1.5 rounded-xl"
                style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}: </span>
                <span className="text-xs font-bold tabular-nums" style={{ color }}>{formatCurrency(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {active.items.length === 0 ? (
          <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
            <p className="text-sm font-medium">Bu periodda bron yoxdur</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    {["Müştəri","İstiqamət","Tarix","Menecer","Bilet №","Satış","Alış","Komissiya","Mənfəət","Ödəniş","Status"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3"
                        style={{ color: "var(--text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {active.items.map(b => (
                    <tr key={b.id} className="transition-all" style={{ borderBottom: "1px solid var(--border-color)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{b.clientName}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{b.clientPhone}</p>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{b.destination}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm" style={{ color: "var(--text-secondary)" }}>{formatDate(b.departureDate)}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{b.manager?.split(" ")[0]}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{b.ticketNumber || "—"}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{formatCurrency(b.sellPrice)}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-red-500">{formatCurrency(b.buyPrice)}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums" style={{ color: "#6366f1" }}>{formatCurrency(b.commissionAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold tabular-nums ${b.profit >= 0 ? "text-green-500" : "text-red-500"}`}>{formatCurrency(b.profit)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-xl font-medium"
                          style={{ background: b.paymentStatus === "paid" ? "rgba(34,197,94,0.1)" : b.paymentStatus === "partial" ? "rgba(249,115,22,0.1)" : "rgba(239,68,68,0.1)", color: b.paymentStatus === "paid" ? "#22c55e" : b.paymentStatus === "partial" ? "#f97316" : "#ef4444" }}>
                          {b.paymentStatus === "paid" ? "Ödənilib" : b.paymentStatus === "partial" ? "Qismən" : "Ödənilməyib"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-xl font-medium"
                          style={{ background: b.status === "confirmed" ? "rgba(99,102,241,0.1)" : b.status === "pending" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)", color: b.status === "confirmed" ? "#6366f1" : b.status === "pending" ? "#f59e0b" : "#22c55e" }}>
                          {b.status === "confirmed" ? "Təsdiqlənib" : b.status === "pending" ? "Gözləyir" : "Tamamlandı"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: "var(--border-color)" }}>
              {active.items.map(b => (
                <div key={b.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{b.clientName}</p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{b.destination}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <span className="text-xs px-2 py-1 rounded-xl font-medium"
                        style={{ background: b.paymentStatus === "paid" ? "rgba(34,197,94,0.1)" : b.paymentStatus === "partial" ? "rgba(249,115,22,0.1)" : "rgba(239,68,68,0.1)", color: b.paymentStatus === "paid" ? "#22c55e" : b.paymentStatus === "partial" ? "#f97316" : "#ef4444" }}>
                        {b.paymentStatus === "paid" ? "Ödənilib" : b.paymentStatus === "partial" ? "Qismən" : "Ödənilməyib"}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="p-2 rounded-xl" style={{ background: "var(--bg-glass)" }}>
                      <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Satış</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{formatCurrency(b.sellPrice)}</p>
                    </div>
                    <div className="p-2 rounded-xl" style={{ background: "var(--bg-glass)" }}>
                      <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Alış</p>
                      <p className="text-sm font-bold tabular-nums text-red-500">{formatCurrency(b.buyPrice)}</p>
                    </div>
                    <div className="p-2 rounded-xl" style={{ background: "var(--bg-glass)" }}>
                      <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Mənfəət</p>
                      <p className={`text-sm font-bold tabular-nums ${b.profit >= 0 ? "text-green-500" : "text-red-500"}`}>{formatCurrency(b.profit)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(b.departureDate)}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>·</span>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{b.manager?.split(" ")[0]}</span>
                    {b.ticketNumber && (
                      <>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>·</span>
                        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{b.ticketNumber}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}