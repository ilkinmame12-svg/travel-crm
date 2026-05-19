"use client"

import { useState, useEffect } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { formatCurrency, formatDate } from "@/lib/calculations"
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react"

interface ManualDebt {
  id: string
  name: string
  amount: number
  direction: "they_owe" | "we_owe"
  description: string
  dueDate: string
  status: "pending" | "paid"
}

export default function DebtsPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const [manualDebts, setManualDebts] = useState<ManualDebt[]>([])
  const [modal, setModal] = useState(false)
  const [tab, setTab] = useState<"all" | "bookings" | "manual">("all")

  useEffect(() => { fetchBookings() }, [])

  const bookingDebts = bookings.filter(b =>
    b.paymentStatus === "unpaid" || b.paymentStatus === "partial"
  )

  const theyOweFromBookings = bookingDebts.reduce((s, b) => {
    if (b.paymentStatus === "unpaid") return s + b.sellPrice
    if (b.paymentStatus === "partial") return s + b.sellPrice / 2
    return s
  }, 0)

  const theyOweManual = manualDebts.filter(d => d.direction === "they_owe" && d.status === "pending").reduce((s, d) => s + d.amount, 0)
  const weOweManual = manualDebts.filter(d => d.direction === "we_owe" && d.status === "pending").reduce((s, d) => s + d.amount, 0)

  const totalTheyOwe = theyOweFromBookings + theyOweManual
  const totalWeOwe = weOweManual

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setManualDebts(prev => [...prev, {
      id: Date.now().toString(),
      name: fd.get("name") as string,
      amount: Number(fd.get("amount")),
      direction: fd.get("direction") as "they_owe" | "we_owe",
      description: fd.get("description") as string,
      dueDate: fd.get("dueDate") as string,
      status: "pending",
    }])
    setModal(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Borclar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Borc idarəetməsi</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 shadow-sm">
          <Plus size={16} />
          Yeni borc
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
            <TrendingUp size={22} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Bizə borclu (cəmi)</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalTheyOwe)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{bookingDebts.length} sifarişdən + {theyOweManual > 0 ? "əl ilə əlavə" : "0"}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
            <TrendingDown size={22} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Biz borcluq (cəmi)</p>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(totalWeOwe)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex gap-2">
            {[
              { value: "all", label: "Hamısı" },
              { value: "bookings", label: `📋 Sifarişlərdən (${bookingDebts.length})` },
              { value: "manual", label: `✏️ Əl ilə (${manualDebts.length})` },
            ].map(t => (
              <button key={t.value} onClick={() => setTab(t.value as any)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  tab === t.value ? "bg-red-500 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {(tab === "all" || tab === "bookings") && bookingDebts.length > 0 && (
          <div>
            <div className="px-6 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ödənilməmiş sifarişlər</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Müştəri", "İstiqamət", "Növ", "Uçuş tarixi", "Məbləğ", "Ödəniş statusu", "Menecer"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookingDebts.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 border-b border-gray-50">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{b.clientName}</p>
                      <p className="text-xs text-gray-400">{b.clientPhone}</p>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{b.destination}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        b.bookingType === "bilet" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                      }`}>
                        {b.bookingType === "bilet" ? "✈️ Bilet" : "🏖️ Tur"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{formatDate(b.departureDate)}</td>
                    <td className="px-6 py-3 font-semibold text-green-600">{formatCurrency(b.sellPrice)}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        b.paymentStatus === "partial" ? "bg-orange-100 text-orange-600" : "bg-red-100 text-red-600"
                      }`}>
                        {b.paymentStatus === "partial" ? "Qismən ödənilib" : "Ödənilməyib"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{b.manager}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(tab === "all" || tab === "manual") && manualDebts.length > 0 && (
          <div>
            <div className="px-6 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Əl ilə əlavə edilən borclar</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Ad", "Açıqlama", "Son tarix", "Məbləğ", "Növ", "Status", ""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {manualDebts.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 group border-b border-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{d.name}</td>
                    <td className="px-6 py-3 text-gray-500">{d.description}</td>
                    <td className="px-6 py-3 text-gray-500">{d.dueDate}</td>
                    <td className="px-6 py-3">
                      <span className={`font-semibold ${d.direction === "they_owe" ? "text-green-600" : "text-red-500"}`}>
                        {formatCurrency(d.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        d.direction === "they_owe" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                      }`}>
                        {d.direction === "they_owe" ? "Bizə borclu" : "Biz borcluq"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button onClick={() => setManualDebts(prev => prev.map(x => x.id === d.id ? { ...x, status: x.status === "pending" ? "paid" : "pending" } : x))}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer ${
                          d.status === "paid" ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700"
                        }`}>
                        {d.status === "paid" ? "Ödənilib" : "Gözləyir"}
                      </button>
                    </td>
                    <td className="px-6 py-3">
                      <button onClick={() => setManualDebts(prev => prev.filter(x => x.id !== d.id))}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {bookingDebts.length === 0 && manualDebts.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm font-medium">Borc tapılmadı</p>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Yeni borc</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
                <input name="name" required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Məbləğ (AZN) *</label>
                <input name="amount" type="number" step="0.01" min="0" required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Növ *</label>
                <select name="direction" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="they_owe">Bizə borclu</option>
                  <option value="we_owe">Biz borcluq</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıqlama</label>
                <input name="description" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Son tarix</label>
                <input name="dueDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Ləğv et</button>
                <button type="submit" className="px-5 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium">Əlavə et</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
