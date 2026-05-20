"use client"

import { useState, useEffect } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { usePaymentsStore } from "@/lib/store/paymentsStore"
import { formatCurrency } from "@/lib/calculations"
import { TrendingUp, TrendingDown, DollarSign, Plus, Trash2 } from "lucide-react"

interface Expense {
  id: string
  name: string
  amount: number
  category: string
  date: string
}

export default function FinancesPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const { payments, fetchPayments, addPayment, deletePayment } = usePaymentsStore()
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: "1", name: "Ofis icarəsi", amount: 800, category: "Ofis", date: "2024-11-01" },
    { id: "2", name: "Internet", amount: 50, category: "Kommunal", date: "2024-11-01" },
    { id: "3", name: "Reklam", amount: 200, category: "Marketing", date: "2024-11-05" },
  ])
  const [modal, setModal] = useState<"expense" | "income" | null>(null)
  const [tab, setTab] = useState<"overview" | "income" | "expense">("overview")
  const [selectedBookingId, setSelectedBookingId] = useState("")

  useEffect(() => {
    fetchBookings()
    fetchPayments()
  }, [])

  const totalBookingRevenue = bookings.reduce((s, b) => s + b.sellPrice, 0)
  const totalBookingCost = bookings.reduce((s, b) => s + b.buyPrice, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalManualIncome = payments.reduce((s, p) => s + p.amount, 0)
  const totalProfit = bookings.reduce((s, b) => s + b.profit, 0) - totalExpenses + totalManualIncome
  const margin = totalBookingRevenue > 0 ? Math.round((totalProfit / totalBookingRevenue) * 100) : 0

  const unpaidBookings = bookings.filter(b => b.paymentStatus !== "paid")

  async function handleAddIncome(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await addPayment({
      clientName: fd.get("name") as string,
      amount: Number(fd.get("amount")),
      description: fd.get("description") as string,
      date: fd.get("date") as string,
      bookingId: selectedBookingId || undefined,
    })
    await fetchBookings()
    setSelectedBookingId("")
    setModal(null)
  }

  function handleAddExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setExpenses(prev => [...prev, {
      id: Date.now().toString(),
      name: fd.get("name") as string,
      amount: Number(fd.get("amount")),
      category: fd.get("category") as string,
      date: fd.get("date") as string,
    }])
    setModal(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maliyyə</h1>
          <p className="text-sm text-gray-500 mt-0.5">Maliyyə hesabatı</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal("income")}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 shadow-sm">
            <Plus size={16} />
            Gəlir əlavə et
          </button>
          <button onClick={() => setModal("expense")}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 shadow-sm">
            <Plus size={16} />
            Xərc əlavə et
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-green-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm opacity-90">Ümumi gəlir</p>
            <TrendingUp size={18} className="opacity-70" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalBookingRevenue + totalManualIncome)}</p>
          <p className="text-xs opacity-70 mt-1">Sifarişlər + ödənişlər</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Alış xərci</p>
            <TrendingDown size={18} className="text-red-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBookingCost)}</p>
          <p className="text-xs text-gray-400 mt-1">Bilet və tur xərcləri</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Əməliyyat xərcləri</p>
            <TrendingDown size={18} className="text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(totalExpenses)}</p>
          <p className="text-xs text-gray-400 mt-1">{expenses.length} xərc qeydi</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Xalis mənfəət</p>
            <DollarSign size={18} className="text-green-500" />
          </div>
          <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-500"}`}>{formatCurrency(totalProfit)}</p>
          <p className="text-xs text-gray-400 mt-1">Marja: {margin}%</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="flex gap-2 px-6 py-4 border-b border-gray-100">
          {[
            { value: "overview", label: "Ümumi baxış" },
            { value: "income", label: `💚 Gəlirlər (${payments.length})` },
            { value: "expense", label: `🔴 Xərclər (${expenses.length})` },
          ].map(t => (
            <button key={t.value} onClick={() => setTab(t.value as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.value ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Son ödənişlər</h3>
              {payments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Hələ ödəniş yoxdur</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Müştəri", "Açıqlama", "Məbləğ"].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 6).map(p => (
                      <tr key={p.id} className="border-b border-gray-50">
                        <td className="py-2 text-gray-900 font-medium">{p.clientName}</td>
                        <td className="py-2 text-gray-500">{p.description}</td>
                        <td className="py-2 font-bold text-green-600">{formatCurrency(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Son xərclər</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Ad", "Kateqoriya", "Məbləğ"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice(0, 6).map(e => (
                    <tr key={e.id} className="border-b border-gray-50">
                      <td className="py-2 text-gray-900 font-medium">{e.name}</td>
                      <td className="py-2">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{e.category}</span>
                      </td>
                      <td className="py-2 font-semibold text-red-500">{formatCurrency(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "income" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Daxil olan ödənişlər</h3>
              <p className="text-sm font-bold text-green-600">Cəmi: {formatCurrency(totalManualIncome)}</p>
            </div>
            {payments.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">Hələ ödəniş qeydi yoxdur</p>
                <button onClick={() => setModal("income")} className="mt-3 text-green-600 text-sm font-medium hover:underline">
                  + Gəlir əlavə et
                </button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Müştəri", "Açıqlama", "Tarix", "Məbləğ", "Sifariş", ""].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => {
                    const booking = bookings.find(b => b.id === p.bookingId)
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 group border-b border-gray-50">
                        <td className="py-3 font-medium text-gray-900">{p.clientName}</td>
                        <td className="py-3 text-gray-500">{p.description}</td>
                        <td className="py-3 text-gray-500">{p.date}</td>
                        <td className="py-3 font-bold text-green-600">{formatCurrency(p.amount)}</td>
                        <td className="py-3 text-xs text-gray-400">
                          {booking ? `${booking.destination}` : "—"}
                        </td>
                        <td className="py-3">
                          <button onClick={() => deletePayment(p.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "expense" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Əməliyyat xərcləri</h3>
              <p className="text-sm font-bold text-red-500">Cəmi: {formatCurrency(totalExpenses)}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Ad", "Kateqoriya", "Tarix", "Məbləğ", ""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 group border-b border-gray-50">
                    <td className="py-3 font-medium text-gray-900">{e.name}</td>
                    <td className="py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{e.category}</span>
                    </td>
                    <td className="py-3 text-gray-500">{e.date}</td>
                    <td className="py-3 font-semibold text-red-500">{formatCurrency(e.amount)}</td>
                    <td className="py-3">
                      <button onClick={() => setExpenses(prev => prev.filter(x => x.id !== e.id))}
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
      </div>

      {modal === "income" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Yeni ödəniş</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleAddIncome} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Müştəri / Şirkət adı *</label>
                <input name="name" required placeholder="Məs: Leyla Mammadova"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ödəniş sifarişə aiddir? (optional)</label>
                <select value={selectedBookingId} onChange={e => setSelectedBookingId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">— Seçin (istəyə görə) —</option>
                  {unpaidBookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.clientName} — {b.destination} — Qalıq: {formatCurrency(b.sellPrice - (b.paidAmount ?? 0))}
                    </option>
                  ))}
                </select>
                {selectedBookingId && (
                  <p className="text-xs text-green-600 mt-1">✓ Bu ödəniş seçilmiş sifarişin borcundan çıxılacaq</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Məbləğ (AZN) *</label>
                <input name="amount" type="number" step="0.01" min="0" required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıqlama</label>
                <input name="description" placeholder="Məs: Noyabr borcu ödənildi"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarix</label>
                <input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Ləğv et</button>
                <button type="submit" className="px-5 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium">Yadda saxla</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "expense" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Yeni xərc</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
                <input name="name" required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Məbləğ (AZN) *</label>
                <input name="amount" type="number" step="0.01" min="0" required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kateqoriya</label>
                <select name="category" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                  <option>Ofis</option>
                  <option>Kommunal</option>
                  <option>Marketing</option>
                  <option>Maaş</option>
                  <option>Digər</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarix</label>
                <input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Ləğv et</button>
                <button type="submit" className="px-5 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium">Əlavə et</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}