"use client"

import { useState, useEffect } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { formatCurrency, formatDate } from "@/lib/calculations"
import { supabase } from "@/lib/supabase"
import { Plus, Trash2, TrendingDown, TrendingUp, DollarSign, Download } from "lucide-react"
import * as XLSX from "xlsx"

interface Creditor {
  id: string
  name: string
  contact: string
  phone: string
  email: string
  notes: string
  status: string
}

interface CreditorPayment {
  id: string
  creditorId: string
  amount: number
  description: string
  date: string
  type: string
}

export default function CreditorsPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const [creditors, setCreditors] = useState<Creditor[]>([])
  const [payments, setPayments] = useState<CreditorPayment[]>([])
  const [selected, setSelected] = useState<Creditor | null>(null)
  const [modal, setModal] = useState<"creditor" | "payment" | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetchBookings()
    fetchCreditors()
    fetchPayments()
    setReady(true)
  }, [])

  async function fetchCreditors() {
    const { data } = await supabase.from("creditors").select("*").order("name")
    if (data) setCreditors(data.map((c: any) => ({
      id: c.id, name: c.name, contact: c.contact ?? "",
      phone: c.phone ?? "", email: c.email ?? "",
      notes: c.notes ?? "", status: c.status ?? "active"
    })))
  }

  async function fetchPayments() {
    const { data } = await supabase.from("creditor_payments").select("*").order("date", { ascending: false })
    if (data) setPayments(data.map((p: any) => ({
      id: p.id, creditorId: p.creditor_id, amount: p.amount,
      description: p.description ?? "", date: p.date, type: p.type ?? "payment"
    })))
  }

  function getCreditorStats(creditorId: string, creditorName: string) {
    const creditorBookings = bookings.filter(b =>
      (b.vendor ?? "").toLowerCase() === creditorName.toLowerCase()
    )
    const totalDebt = creditorBookings.reduce((s, b) => s + b.buyPrice, 0)
    const creditorPayments = payments.filter(p => p.creditorId === creditorId)
    const totalPaid = creditorPayments.reduce((s, p) => s + p.amount, 0)
    const balance = totalPaid - totalDebt
    return { totalDebt, totalPaid, balance, bookingsCount: creditorBookings.length, creditorBookings, creditorPayments }
  }

  async function handleAddCreditor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = {
      name: fd.get("name") as string,
      contact: fd.get("contact") as string,
      phone: fd.get("phone") as string,
      email: fd.get("email") as string,
      notes: fd.get("notes") as string,
      status: "active",
    }
    if (selected) {
      await supabase.from("creditors").update(data).eq("id", selected.id)
    } else {
      await supabase.from("creditors").insert(data)
    }
    await fetchCreditors()
    setModal(null)
    setSelected(null)
  }

  async function handleAddPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await supabase.from("creditor_payments").insert({
      creditor_id: selected?.id,
      amount: Number(fd.get("amount")),
      description: fd.get("description") as string,
      date: fd.get("date") as string,
      type: fd.get("type") as string,
    })
    await fetchPayments()
    setModal(null)
  }

  async function handleDelete(id: string) {
    if (confirm("Silinsin?")) {
      await supabase.from("creditors").delete().eq("id", id)
      await fetchCreditors()
    }
  }

  function exportCreditorExcel(creditor: Creditor) {
    const stats = getCreditorStats(creditor.id, creditor.name)
    const wb = XLSX.utils.book_new()

    const bookingRows = stats.creditorBookings.map(b => ({
      "Müştəri": b.clientName,
      "İstiqamət": b.destination,
      "Tarix": b.departureDate,
      "Alış qiyməti": b.buyPrice,
      "Satış qiyməti": b.sellPrice,
      "Mənfəət": b.profit,
      "Status": b.status,
    }))
    const ws1 = XLSX.utils.json_to_sheet(bookingRows)
    XLSX.utils.book_append_sheet(wb, ws1, "Sifarişlər")

    const paymentRows = stats.creditorPayments.map(p => ({
      "Tarix": p.date,
      "Məbləğ": p.amount,
      "Növ": p.type === "payment" ? "Ödəniş" : "Kredit",
      "Açıqlama": p.description,
    }))
    const ws2 = XLSX.utils.json_to_sheet(paymentRows)
    XLSX.utils.book_append_sheet(wb, ws2, "Ödənişlər")

    const summaryRows = [{
      "Vendor": creditor.name,
      "Ümumi borc": stats.totalDebt,
      "Ödənilmiş": stats.totalPaid,
      "Balans": stats.balance,
      "Sifarişlər": stats.bookingsCount,
    }]
    const ws3 = XLSX.utils.json_to_sheet(summaryRows)
    XLSX.utils.book_append_sheet(wb, ws3, "Xülasə")

    XLSX.writeFile(wb, `${creditor.name}_hesabat.xlsx`)
  }

  if (!ready) return null

  const totalOwed = creditors.reduce((s, c) => {
    const stats = getCreditorStats(c.id, c.name)
    return s + Math.max(0, stats.totalDebt - stats.totalPaid)
  }, 0)

  const totalCredit = creditors.reduce((s, c) => {
    const stats = getCreditorStats(c.id, c.name)
    return s + Math.max(0, stats.totalPaid - stats.totalDebt)
  }, 0)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kreditorlar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vendor və təchizatçı idarəetməsi</p>
        </div>
        <button onClick={() => { setSelected(null); setModal("creditor") }}
          className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 shadow-sm">
          <Plus size={16} />
          Yeni kreditor
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-500 rounded-2xl p-5 text-white">
          <p className="text-sm opacity-90 mb-2">Ümumi borc</p>
          <p className="text-2xl font-bold">{formatCurrency(totalOwed)}</p>
          <p className="text-xs opacity-70 mt-1">Vendorlara ödənilməli</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-2">Kredit balansı</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCredit)}</p>
          <p className="text-xs text-gray-400 mt-1">Artıq ödənilmiş</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500 mb-2">Kreditorlar</p>
          <p className="text-2xl font-bold text-gray-900">{creditors.length}</p>
          <p className="text-xs text-gray-400 mt-1">Aktiv vendor</p>
        </div>
      </div>

      <div className="space-y-4">
        {creditors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <p>Hələ kreditor yoxdur</p>
          </div>
        ) : (
          creditors.map(creditor => {
            const stats = getCreditorStats(creditor.id, creditor.name)
            return (
              <div key={creditor.id} className="bg-white rounded-2xl border border-gray-100">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                        <span className="text-red-600 font-bold text-lg">{creditor.name[0]}</span>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{creditor.name}</h3>
                        {creditor.contact && <p className="text-sm text-gray-500">{creditor.contact}</p>}
                        {creditor.phone && <p className="text-xs text-gray-400">{creditor.phone}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => exportCreditorExcel(creditor)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100">
                        <Download size={14} />
                        Excel
                      </button>
                      <button onClick={() => { setSelected(creditor); setModal("payment") }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100">
                        <Plus size={14} />
                        Ödəniş
                      </button>
                      <button onClick={() => { setSelected(creditor); setModal("creditor") }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">✏️</button>
                      <button onClick={() => handleDelete(creditor.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Ümumi alış</p>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(stats.totalDebt)}</p>
                      <p className="text-xs text-gray-400">{stats.bookingsCount} sifariş</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xs text-blue-400 mb-1">Ödənilmiş</p>
                      <p className="text-sm font-bold text-blue-700">{formatCurrency(stats.totalPaid)}</p>
                    </div>
                    <div className={`rounded-xl p-3 ${stats.balance >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                      <p className={`text-xs mb-1 ${stats.balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {stats.balance >= 0 ? "Kredit balansı" : "Borc"}
                      </p>
                      <p className={`text-sm font-bold ${stats.balance >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {formatCurrency(Math.abs(stats.balance))}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Status</p>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        stats.balance >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                      }`}>
                        {stats.balance >= 0 ? "✓ Bağlı" : "⚠ Borc var"}
                      </span>
                    </div>
                  </div>

                  {stats.creditorPayments.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Son ödənişlər</p>
                      <div className="space-y-1">
                        {stats.creditorPayments.slice(0, 3).map(p => (
                          <div key={p.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                p.type === "payment" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                              }`}>
                                {p.type === "payment" ? "Ödəniş" : "Kredit"}
                              </span>
                              <span className="text-gray-600">{p.description}</span>
                              <span className="text-gray-400 text-xs">{p.date}</span>
                            </div>
                            <span className="font-semibold text-blue-600">{formatCurrency(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {modal === "creditor" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{selected ? "Redaktə et" : "Yeni kreditor"}</h2>
              <button onClick={() => { setModal(null); setSelected(null) }} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleAddCreditor} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
                <input name="name" defaultValue={selected?.name} required
                  placeholder="Məs: Amadeus, Go Global, IATA"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Əlaqə şəxsi</label>
                <input name="contact" defaultValue={selected?.contact}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input name="phone" defaultValue={selected?.phone}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input name="email" type="email" defaultValue={selected?.email}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qeydlər</label>
                <textarea name="notes" rows={2} defaultValue={selected?.notes}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => { setModal(null); setSelected(null) }}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Ləğv et</button>
                <button type="submit"
                  className="px-5 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium">
                  {selected ? "Yadda saxla" : "Əlavə et"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "payment" && selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{selected.name} — Ödəniş</h2>
              <button onClick={() => { setModal(null); setSelected(null) }} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Növ</label>
                <select name="type"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                  <option value="payment">Ödəniş (biz ödədik)</option>
                  <option value="credit">Kredit (vendor verdi)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Məbləğ (AZN) *</label>
                <input name="amount" type="number" step="0.01" min="0" required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıqlama</label>
                <input name="description" placeholder="Məs: Noyabr hesabı"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarix</label>
                <input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => { setModal(null); setSelected(null) }}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Ləğv et</button>
                <button type="submit"
                  className="px-5 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium">
                  Əlavə et
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}