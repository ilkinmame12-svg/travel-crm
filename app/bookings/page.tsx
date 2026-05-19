"use client"

import { useState, useMemo, useEffect } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import type { Booking, BookingFilters, BookingFormData, BookingType } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/calculations"
import { Plus, Search, Plane, Hotel, Palmtree, Ship, Car } from "lucide-react"

const MANAGERS = ["Miraslan Abbasov", "Rehime Qasimli", "Ayxan Elxanli", "Gunes Abdullazade", "Gunay Qurbanova", "Mircemil Abbasov", "Meryem Eliyeva"]

const BOOKING_TYPES = [
  { value: "bilet", label: "Aviabilet", Icon: Plane, color: "blue" },
  { value: "otel", label: "Otel", Icon: Hotel, color: "purple" },
  { value: "tur", label: "Tur paketi", Icon: Palmtree, color: "green" },
  { value: "kruiz", label: "Kruiz", Icon: Ship, color: "cyan" },
  { value: "transfer", label: "Transfer", Icon: Car, color: "orange" },
]

const EMPTY_FILTERS: BookingFilters = {
  search: "", status: "all", manager: "", iataPeriod: "all", bookingType: "all", dateFrom: "", dateTo: ""
}

export default function SifarislerPage() {
  const { bookings, loading, fetchBookings, addBooking, updateBooking, deleteBooking } = useBookingsStore()
  const [modal, setModal] = useState<"create" | "edit" | null>(null)
  const [selected, setSelected] = useState<Booking | null>(null)
  const [filters, setFilters] = useState<BookingFilters>(EMPTY_FILTERS)
  const [activeTab, setActiveTab] = useState<BookingType | "all">("all")

  useEffect(() => { fetchBookings() }, [])

  const filtered = useMemo(() => bookings.filter(b => {
    if (activeTab !== "all" && b.bookingType !== activeTab) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!b.clientName.toLowerCase().includes(q) && !b.destination.toLowerCase().includes(q)) return false
    }
    if (filters.status !== "all" && b.status !== filters.status) return false
    if (filters.manager && b.manager !== filters.manager) return false
    if (filters.iataPeriod !== "all" && b.iataPeriod !== filters.iataPeriod) return false
    return true
  }), [bookings, filters, activeTab])

  const totalRevenue = filtered.reduce((s, b) => s + b.sellPrice, 0)
  const totalProfit = filtered.reduce((s, b) => s + b.profit, 0)
  const totalCost = filtered.reduce((s, b) => s + b.buyPrice, 0)

  const typeCounts = BOOKING_TYPES.map(t => ({
    ...t,
    count: bookings.filter(b => b.bookingType === t.value).length
  }))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const sellPrice = Number(fd.get("sellPrice"))
    const buyPrice = Number(fd.get("buyPrice"))
    const commissionPercent = Number(fd.get("commissionPercent"))
    const commissionAmount = Math.round(sellPrice * commissionPercent) / 100
    const profit = sellPrice - buyPrice - commissionAmount

    const data: BookingFormData = {
      bookingType: fd.get("bookingType") as BookingType,
      clientName: fd.get("clientName") as string,
      clientPhone: fd.get("clientPhone") as string,
      clientEmail: fd.get("clientEmail") as string,
      destination: fd.get("destination") as string,
      departureDate: fd.get("departureDate") as string,
      returnDate: fd.get("returnDate") as string,
      travelers: Number(fd.get("travelers")),
      description: fd.get("description") as string,
      buyPrice, sellPrice, commissionPercent,
      manager: fd.get("manager") as string,
      iataPeriod: fd.get("iataPeriod") as "1-7" | "8-14" | "15-21" | "22-31",
      status: fd.get("status") as "pending" | "confirmed" | "completed" | "cancelled",
      paymentStatus: fd.get("paymentStatus") as "unpaid" | "partial" | "paid",
      notes: fd.get("notes") as string,
    }

    if (modal === "edit" && selected) {
      await updateBooking(selected.id, data)
    } else {
      await addBooking(data)
    }
    setModal(null)
    setSelected(null)
  }

  function getTypeInfo(value: string) {
    return BOOKING_TYPES.find(t => t.value === value) ?? BOOKING_TYPES[0]
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sifarişlər</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} / {bookings.length} sifariş</p>
        </div>
        <button onClick={() => { setSelected(null); setModal("create") }}
          className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 shadow-sm">
          <Plus size={16} />
          Yeni sifariş
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-red-500 rounded-2xl p-5 text-white">
          <p className="text-sm opacity-90 mb-2">Ümumi gəlir</p>
          <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-2">Ümumi xərc</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-2">Mənfəət</p>
          <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-500"}`}>{formatCurrency(totalProfit)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "all" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              Hamısı ({bookings.length})
            </button>
            {typeCounts.map(t => {
              const Icon = t.Icon
              return (
                <button key={t.value} onClick={() => setActiveTab(t.value as BookingType)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === t.value ? "bg-red-500 text-white" : "text-gray-500 hover:bg-gray-100"
                  }`}>
                  <Icon size={14} />
                  {t.label} ({t.count})
                </button>
              )
            })}
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Axtar..." value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-48" />
            </div>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value as any }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
              <option value="all">Bütün statuslar</option>
              <option value="pending">Gözləyir</option>
              <option value="confirmed">Təsdiqlənib</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">Ləğv edildi</option>
            </select>
            <select value={filters.iataPeriod} onChange={e => setFilters(f => ({ ...f, iataPeriod: e.target.value as any }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
              <option value="all">Bütün periodlar</option>
              <option value="1-7">IATA 1-7</option>
              <option value="8-14">IATA 8-14</option>
              <option value="15-21">IATA 15-21</option>
              <option value="22-31">IATA 22-31</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Yüklənir...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Növ", "Müştəri", "İstiqamət", "Tarixlər", "Menecer", "Satış", "Alış", "Mənfəət", "Status", "Ödəniş", "IATA", ""].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="text-center py-16 text-gray-400">Sifariş tapılmadı</td></tr>
              )}
              {filtered.map(b => {
                const typeInfo = getTypeInfo(b.bookingType)
                const Icon = typeInfo.Icon
                return (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors group border-b border-gray-50">
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium w-fit ${
                        typeInfo.color === "blue" ? "bg-blue-100 text-blue-700" :
                        typeInfo.color === "purple" ? "bg-purple-100 text-purple-700" :
                        typeInfo.color === "green" ? "bg-green-100 text-green-700" :
                        typeInfo.color === "cyan" ? "bg-cyan-100 text-cyan-700" :
                        "bg-orange-100 text-orange-700"
                      }`}>
                        <Icon size={11} />
                        {typeInfo.label}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{b.clientName}</p>
                      <p className="text-xs text-gray-400">{b.clientPhone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800">{b.destination}</p>
                      <p className="text-xs text-gray-400">{b.travelers} nəfər</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-gray-800">{formatDate(b.departureDate)}</p>
                      <p className="text-xs text-gray-400">→ {formatDate(b.returnDate)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{b.manager}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(b.sellPrice)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(b.buyPrice)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={b.profit >= 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                        {formatCurrency(b.profit)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        b.status === "confirmed" ? "bg-green-100 text-green-700" :
                        b.status === "pending" ? "bg-amber-100 text-amber-700" :
                        b.status === "completed" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-500"}`}>
                        {b.status === "confirmed" ? "Təsdiqlənib" : b.status === "pending" ? "Gözləyir" : b.status === "completed" ? "Tamamlandı" : "Ləğv edildi"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        b.paymentStatus === "paid" ? "bg-green-100 text-green-700" :
                        b.paymentStatus === "partial" ? "bg-orange-100 text-orange-600" :
                        "bg-red-100 text-red-600"}`}>
                        {b.paymentStatus === "paid" ? "Ödənilib" : b.paymentStatus === "partial" ? "Qismən" : "Ödənilməyib"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                        {b.iataPeriod}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => { setSelected(b); setModal("edit") }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                          ✏️
                        </button>
                        <button onClick={() => { if(confirm("Silinsin?")) deleteBooking(b.id) }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4 pt-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">{modal === "edit" ? "Redaktə et" : "Yeni sifariş"}</h2>
              <button onClick={() => { setModal(null); setSelected(null) }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sifariş növü *</label>
                <div className="grid grid-cols-5 gap-2">
                  {BOOKING_TYPES.map(t => {
                    const Icon = t.Icon
                    return (
                      <label key={t.value} className="cursor-pointer">
                        <input type="radio" name="bookingType" value={t.value}
                          defaultChecked={selected ? selected.bookingType === t.value : t.value === "bilet"}
                          className="sr-only peer" />
                        <div className="border-2 rounded-xl p-3 text-center peer-checked:border-red-500 peer-checked:bg-red-50 hover:border-red-300 transition-all">
                          <Icon size={20} className="mx-auto mb-1 text-gray-500 peer-checked:text-red-500" />
                          <p className="text-xs font-medium text-gray-600">{t.label}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Müştəri</div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
                <input name="clientName" defaultValue={selected?.clientName} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                <input name="clientPhone" defaultValue={selected?.clientPhone} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input name="clientEmail" type="email" defaultValue={selected?.clientEmail} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">Səfər</div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">İstiqamət *</label>
                <input name="destination" defaultValue={selected?.destination} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Uçuş tarixi *</label>
                <input name="departureDate" type="date" defaultValue={selected?.departureDate} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qayıdış tarixi *</label>
                <input name="returnDate" type="date" defaultValue={selected?.returnDate} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turistlər</label>
                <input name="travelers" type="number" min="1" defaultValue={selected?.travelers ?? 1} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">Maliyyə</div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Satış qiyməti (AZN) *</label>
                <input name="sellPrice" type="number" step="0.01" min="0" defaultValue={selected?.sellPrice ?? 0} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alış qiyməti (AZN) *</label>
                <input name="buyPrice" type="number" step="0.01" min="0" defaultValue={selected?.buyPrice ?? 0} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Komissiya (%)</label>
                <input name="commissionPercent" type="number" step="0.1" min="0" max="100" defaultValue={selected?.commissionPercent ?? 5} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div className="col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">İdarəetmə</div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Menecer</label>
                <select name="manager" defaultValue={selected?.manager ?? MANAGERS[0]} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                  {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IATA period</label>
                <select name="iataPeriod" defaultValue={selected?.iataPeriod ?? "1-7"} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                  <option value="1-7">1-7</option>
                  <option value="8-14">8-14</option>
                  <option value="15-21">15-21</option>
                  <option value="22-31">22-31</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select name="status" defaultValue={selected?.status ?? "pending"} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                  <option value="pending">Gözləyir</option>
                  <option value="confirmed">Təsdiqlənib</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="cancelled">Ləğv edildi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ödəniş</label>
                <select name="paymentStatus" defaultValue={selected?.paymentStatus ?? "unpaid"} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                  <option value="unpaid">Ödənilməyib</option>
                  <option value="partial">Qismən</option>
                  <option value="paid">Ödənilib</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Qeydlər</label>
                <textarea name="notes" rows={2} defaultValue={selected?.notes} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
              </div>
              <div className="col-span-2 flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => { setModal(null); setSelected(null) }}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Ləğv et</button>
                <button type="submit"
                  className="px-5 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium">
                  {modal === "edit" ? "Yadda saxla" : "Yarat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

