"use client"

import { useState, useEffect, useMemo } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { formatCurrency, formatDate } from "@/lib/calculations"
import { Download } from "lucide-react"
import * as XLSX from "xlsx"

const PERIODS = ["1-7", "8-15", "16-23", "24-31"] as const

export default function IATAPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const [activePeriod, setActivePeriod] = useState<string>("1-7")
  const [selectedMonth, setSelectedMonth] = useState("2026-01")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetchBookings()
    setReady(true)
  }, [])

  const grouped = useMemo(() => PERIODS.map(period => {
    const items = bookings.filter(b =>
      b.iataPeriod === period &&
      b.isIata === true &&
      b.departureDate.startsWith(selectedMonth)
    )
    const totalSell = items.reduce((s, b) => s + b.sellPrice, 0)
    const totalBuy = items.reduce((s, b) => s + b.buyPrice, 0)
    const totalProfit = items.reduce((s, b) => s + b.profit, 0)
    const totalCommission = items.reduce((s, b) => s + b.commissionAmount, 0)
    return { period, items, totalSell, totalBuy, totalProfit, totalCommission }
  }), [bookings, selectedMonth])

  const active = useMemo(() => grouped.find(g => g.period === activePeriod) ?? grouped[0], [grouped, activePeriod])

  function exportToExcel() {
    const rows = active.items.map(b => ({
      "Müştəri": b.clientName,
      "Telefon": b.clientPhone,
      "İstiqamət": b.destination,
      "Uçuş tarixi": b.departureDate,
      "Qayıdış tarixi": b.returnDate,
      "Turistlər": b.travelers,
      "Menecer": b.manager,
      "Bilet №": b.ticketNumber ?? "",
      "PNR": b.pnr ?? "",
      "Satış (AZN)": b.sellPrice,
      "Alış (AZN)": b.buyPrice,
      "Komissiya %": b.commissionPercent,
      "Komissiya (AZN)": b.commissionAmount,
      "Mənfəət (AZN)": b.profit,
      "Ödəniş": b.paymentStatus === "paid" ? "Ödənilib" : b.paymentStatus === "partial" ? "Qismən" : "Ödənilməyib",
      "Status": b.status === "confirmed" ? "Təsdiqlənib" : b.status === "pending" ? "Gözləyir" : b.status === "completed" ? "Tamamlandı" : "Ləğv edildi",
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Period ${activePeriod}`)
    XLSX.writeFile(wb, `IATA_Period_${activePeriod}.xlsx`)
  }

  function exportAllToExcel() {
    const wb = XLSX.utils.book_new()
    grouped.forEach(g => {
      const rows = g.items.map(b => ({
        "Müştəri": b.clientName,
        "Telefon": b.clientPhone,
        "İstiqamət": b.destination,
        "Uçuş tarixi": b.departureDate,
        "Qayıdış tarixi": b.returnDate,
        "Turistlər": b.travelers,
        "Menecer": b.manager,
        "Satış (AZN)": b.sellPrice,
        "Alış (AZN)": b.buyPrice,
        "Komissiya %": b.commissionPercent,
        "Komissiya (AZN)": b.commissionAmount,
        "Mənfəət (AZN)": b.profit,
        "Ödəniş": b.paymentStatus === "paid" ? "Ödənilib" : b.paymentStatus === "partial" ? "Qismən" : "Ödənilməyib",
        "Status": b.status === "confirmed" ? "Təsdiqlənib" : b.status === "pending" ? "Gözləyir" : b.status === "completed" ? "Tamamlandı" : "Ləğv edildi",
      }))
      if (rows.length > 0) {
        const ws = XLSX.utils.json_to_sheet(rows)
        XLSX.utils.book_append_sheet(wb, ws, `Period ${g.period}`)
      }
    })
    XLSX.writeFile(wb, `IATA_Hesabat.xlsx`)
  }

  if (!ready) return null

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IATA Periods</h1>
          <p className="text-sm text-gray-500 mt-1">Aylıq IATA hesabatı</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
            <span className="text-sm font-medium text-gray-600">Ay:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="text-sm text-gray-900 focus:outline-none bg-transparent"
            />
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
              {bookings.filter(b => b.isIata && b.departureDate.startsWith(selectedMonth)).length} bilet
            </span>
          </div>
          <button
            onClick={exportAllToExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <Download size={16} />
            Hamısını Excel-ə yüklə
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {grouped.map(g => (
          <button
            key={g.period}
            onClick={() => setActivePeriod(g.period)}
            className={`text-left p-5 rounded-2xl border transition-all ${
              activePeriod === g.period
                ? "bg-blue-600 border-blue-600 text-white shadow-lg"
                : "bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-bold ${activePeriod === g.period ? "text-white" : "text-gray-900"}`}>
                Period {g.period}
              </h2>
              <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                activePeriod === g.period ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-700"
              }`}>
                {g.items.length} bron
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-sm ${activePeriod === g.period ? "text-blue-100" : "text-gray-500"}`}>Satış</span>
                <span className={`text-sm font-semibold ${activePeriod === g.period ? "text-white" : "text-gray-900"}`}>
                  {formatCurrency(g.totalSell)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${activePeriod === g.period ? "text-blue-100" : "text-gray-500"}`}>Komissiya</span>
                <span className={`text-sm font-semibold ${activePeriod === g.period ? "text-white" : "text-blue-600"}`}>
                  {formatCurrency(g.totalCommission)}
                </span>
              </div>
              <div className={`flex justify-between border-t pt-2 ${activePeriod === g.period ? "border-blue-500" : "border-gray-100"}`}>
                <span className={`text-sm font-semibold ${activePeriod === g.period ? "text-blue-100" : "text-gray-700"}`}>Mənfəət</span>
                <span className={`text-sm font-bold ${
                  activePeriod === g.period ? "text-white" : g.totalProfit >= 0 ? "text-green-600" : "text-red-500"
                }`}>
                  {formatCurrency(g.totalProfit)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900">Period {active.period}</h2>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-md">
              {active.items.length} bron
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-4 text-sm">
              <span className="text-gray-500">Satış: <span className="font-semibold text-gray-900">{formatCurrency(active.totalSell)}</span></span>
              <span className="text-gray-500">Komissiya: <span className="font-semibold text-blue-600">{formatCurrency(active.totalCommission)}</span></span>
              <span className="text-gray-500">Mənfəət: <span className={`font-semibold ${active.totalProfit >= 0 ? "text-green-600" : "text-red-500"}`}>{formatCurrency(active.totalProfit)}</span></span>
            </div>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700"
            >
              <Download size={14} />
              Excel
            </button>
          </div>
        </div>

        {active.items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm font-medium">Bu periodda bron yoxdur</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {["Müştəri", "İstiqamət", "Tarix", "Menecer", "Satış", "Alış", "Komissiya", "Mənfəət", "Ödəniş", "Status"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {active.items.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{b.clientName}</p>
                    <p className="text-xs text-gray-400">{b.clientPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.destination}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(b.departureDate)}</td>
                  <td className="px-4 py-3 text-gray-600">{b.manager}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(b.sellPrice)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatCurrency(b.buyPrice)}</td>
                  <td className="px-4 py-3 text-blue-600 font-semibold">{formatCurrency(b.commissionAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={b.profit >= 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                      {formatCurrency(b.profit)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                      b.paymentStatus === "paid" ? "bg-green-50 text-green-700" :
                      b.paymentStatus === "partial" ? "bg-orange-50 text-orange-600" :
                      "bg-red-50 text-red-600"}`}>
                      {b.paymentStatus === "paid" ? "Ödənilib" : b.paymentStatus === "partial" ? "Qismən" : "Ödənilməyib"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                      b.status === "confirmed" ? "bg-blue-50 text-blue-700" :
                      b.status === "pending" ? "bg-amber-50 text-amber-700" :
                      b.status === "completed" ? "bg-green-50 text-green-700" :
                      "bg-gray-100 text-gray-500"}`}>
                      {b.status === "confirmed" ? "Təsdiqlənib" : b.status === "pending" ? "Gözləyir" : b.status === "completed" ? "Tamamlandı" : "Ləğv edildi"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
