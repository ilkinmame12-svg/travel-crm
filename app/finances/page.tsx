"use client"

import { useState } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
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
  const { bookings } = useBookingsStore()
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: "1", name: "Ofis icarəsi", amount: 800, category: "Ofis", date: "2024-11-01" },
    { id: "2", name: "Internet", amount: 50, category: "Kommunal", date: "2024-11-01" },
    { id: "3", name: "Reklam", amount: 200, category: "Marketing", date: "2024-11-05" },
  ])
  const [modal, setModal] = useState(false)

  const totalRevenue = bookings.reduce((s, b) => s + b.sellPrice, 0)
  const totalBookingCost = bookings.reduce((s, b) => s + b.buyPrice, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalProfit = bookings.reduce((s, b) => s + b.profit, 0) - totalExpenses
  const margin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setExpenses(prev => [...prev, {
      id: Date.now().toString(),
      name: fd.get("name") as string,
      amount: Number(fd.get("amount")),
      category: fd.get("category") as string,
      date: fd.get("date") as string,
    }])
    setModal(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Finances</h1>
        <p className="text-sm text-gray-500 mt-1">Maliyyə hesabatı</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="Ümumi gəlir" value={formatCurrency(totalRevenue)} icon={DollarSign} color="blue" />
        <KpiCard label="Alış xərci" value={formatCurrency(totalBookingCost)} icon={TrendingDown} color="red" />
        <KpiCard label="Əməliyyat xərcləri" value={formatCurrency(totalExpenses)} icon={TrendingDown} color="orange" />
        <KpiCard label="Xalis mənfəət" value={formatCurrency(totalProfit)} icon={TrendingUp} color="green" sub={`Marja: ${margin}%`} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Gəlirlər (Bronlar)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {["Müştəri", "Istiqamət", "Satış", "Alış", "Mənfəət"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="py-2.5 font-medium text-gray-900">{b.clientName}</td>
                  <td className="py-2.5 text-gray-600">{b.destination}</td>
                  <td className="py-2.5 font-semibold">{formatCurrency(b.sellPrice)}</td>
                  <td className="py-2.5 text-gray-500">{formatCurrency(b.buyPrice)}</td>
                  <td className="py-2.5">
                    <span className={b.profit >= 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                      {formatCurrency(b.profit)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Əməliyyat xərcləri</h2>
            <button onClick={() => setModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus size={15} />
              Əlavə et
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {["Ad", "Kateqoriya", "Tarix", "Məbləğ", ""].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 group">
                  <td className="py-2.5 font-medium text-gray-900">{e.name}</td>
                  <td className="py-2.5">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{e.category}</span>
                  </td>
                  <td className="py-2.5 text-gray-500">{e.date}</td>
                  <td className="py-2.5 font-semibold text-red-500">{formatCurrency(e.amount)}</td>
                  <td className="py-2.5">
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
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Yeni xərc</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">x</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
                <input name="name" required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Məbləğ (AZN) *</label>
                <input name="amount" type="number" step="0.01" min="0" required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kateqoriya</label>
                <select name="category" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Ofis</option>
                  <option>Kommunal</option>
                  <option>Marketing</option>
                  <option>Maaş</option>
                  <option>Digər</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarix</label>
                <input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Ləğv et</button>
                <button type="submit" className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Əlavə et</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string; icon: any
  color: "blue" | "red" | "green" | "orange"; sub?: string
}) {
  const colors = {
    blue:   { bg: "bg-blue-50",   icon: "text-blue-600",   val: "text-blue-700" },
    red:    { bg: "bg-red-50",    icon: "text-red-500",    val: "text-red-600" },
    green:  { bg: "bg-green-50",  icon: "text-green-600",  val: "text-green-700" },
    orange: { bg: "bg-orange-50", icon: "text-orange-500", val: "text-orange-600" },
  }
  const c = colors[color]
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon size={18} className={c.icon} />
        </div>
      </div>
      <p className={`text-xl font-bold ${c.val}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
