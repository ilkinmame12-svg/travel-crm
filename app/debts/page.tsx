"use client"

import { useState, useEffect } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { supabase } from "@/lib/supabase"
import { formatCurrency, formatDate } from "@/lib/calculations"
import { Plus, Trash2, TrendingUp, TrendingDown, CheckCircle, FileText } from "lucide-react"

interface ManualDebt {
  id: string
  name: string
  amount: number
  direction: "they_owe" | "we_owe"
  description: string
  dueDate: string
  status: "pending" | "paid"
}

function exportToPDF(debts: any[], clientName: string, typeLabel: string) {
  const total = debts.reduce((s, b) => s + b.remaining, 0)
  const date = new Date().toLocaleDateString("az-AZ")

  const rows = debts.map((b, i) => `
    <tr style="border-bottom: 1px solid #f0f0f0;">
      <td style="padding: 10px 12px; color: #374151;">${i + 1}</td>
      <td style="padding: 10px 12px; color: #374151;">${b.destination || "—"}</td>
      <td style="padding: 10px 12px; color: #374151;">${formatDate(b.departureDate)}</td>
      <td style="padding: 10px 12px; text-align: right; color: #374151;">${formatCurrency(b.sellPrice)}</td>
      <td style="padding: 10px 12px; text-align: right; color: #16a34a;">${formatCurrency(b.paidAmount ?? 0)}</td>
      <td style="padding: 10px 12px; text-align: right; font-weight: bold; color: #dc2626;">${formatCurrency(b.remaining)}</td>
    </tr>
  `).join("")

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Borc Hesabatı - ${clientName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #1f2937; background: white; }
    .page { padding: 40px; max-width: 900px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #ef4444; }
    .logo { font-size: 28px; font-weight: bold; color: #ef4444; letter-spacing: -1px; }
    .logo span { color: #1f2937; }
    .logo-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .doc-info { text-align: right; }
    .doc-title { font-size: 13px; color: #6b7280; }
    .doc-date { font-size: 13px; font-weight: bold; color: #1f2937; }
    .client-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
    .client-label { font-size: 11px; color: #ef4444; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .client-name { font-size: 22px; font-weight: bold; color: #1f2937; }
    .client-type { font-size: 13px; color: #6b7280; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #1f2937; }
    thead th { padding: 12px; text-align: left; font-size: 11px; font-weight: bold; color: white; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th:last-child, thead th:nth-child(4), thead th:nth-child(5) { text-align: right; }
    tbody tr:hover { background: #f9fafb; }
    .total-box { background: #1f2937; border-radius: 12px; padding: 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .total-label { color: #d1d5db; font-size: 14px; }
    .total-amount { color: #ef4444; font-size: 28px; font-weight: bold; }
    .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo">its<span>tour</span></div>
      <div class="logo-sub">infinity tourism services by EL Art</div>
    </div>
    <div class="doc-info">
      <div class="doc-title">Borc Hesabatı</div>
      <div class="doc-date">${date}</div>
    </div>
  </div>

  <div class="client-box">
    <div class="client-label">Müştəri</div>
    <div class="client-name">${clientName}</div>
    <div class="client-type">${typeLabel} üzrə ödənilməmiş borclar</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>İstiqamət / Təsvir</th>
        <th>Tarix</th>
        <th style="text-align:right">Ümumi</th>
        <th style="text-align:right">Ödənilib</th>
        <th style="text-align:right">Qalıq Borc</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="total-box">
    <div class="total-label">Cəmi ödənilməmiş borc:</div>
    <div class="total-amount">${formatCurrency(total)}</div>
  </div>

  <div class="footer">
    <p>Bu sənəd itstour CRM sistemi tərəfindən avtomatik yaradılmışdır.</p>
    <p style="margin-top:4px">itstour.az | infinity tourism services</p>
  </div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  const win = window.open("", "_blank")
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

export default function DebtsPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const [payModal, setPayModal] = useState<any>(null)
  const [payAmount, setPayAmount] = useState("")
  const [manualDebts, setManualDebts] = useState<ManualDebt[]>([])
  const [modal, setModal] = useState(false)
  const [tab, setTab] = useState<"all" | "bookings" | "manual">("all")
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string[]>([])

  useEffect(() => { fetchBookings() }, [])

  const bookingDebts = bookings.filter(b =>
    b.paymentStatus === "unpaid" || b.paymentStatus === "partial"
  ).filter(b => {
    if (search && !b.clientName.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter.length > 0 && !typeFilter.includes(b.bookingType)) return false
    return true
  }).map(b => ({
    ...b,
    remaining: b.sellPrice - (b.paidAmount ?? 0)
  }))

  const theyOweFromBookings = bookingDebts.reduce((s, b) => s + b.remaining, 0)
  const theyOweManual = manualDebts.filter(d => d.direction === "they_owe" && d.status === "pending").reduce((s, d) => s + d.amount, 0)
  const weOweManual = manualDebts.filter(d => d.direction === "we_owe" && d.status === "pending").reduce((s, d) => s + d.amount, 0)
  const totalTheyOwe = theyOweFromBookings + theyOweManual
  const totalWeOwe = weOweManual

  async function handlePay() {
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) return
    const newPaid = (payModal.paidAmount ?? 0) + amount
    const newStatus = newPaid >= payModal.sellPrice ? "paid" : "partial"
    await supabase.from("bookings").update({ paid_amount: newPaid, payment_status: newStatus }).eq("id", payModal.id)
    await fetchBookings()
    setPayModal(null)
  }

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

  // Get type label for PDF
  const typeLabel = typeFilter.length === 0 ? "Bütün növlər" :
    typeFilter.map(t =>
      t === "bilet" ? "Aviabilet" : t === "otel" ? "Otel" : t === "tur" ? "Tur" : t === "transfer" ? "Transfer" : "Kruiz"
    ).join(", ")

  // Get client name for PDF (from search or first item)
  const pdfClientName = search || (bookingDebts[0]?.clientName ?? "Müştəri")

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Borclar</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">Borc idarəetməsi</p>
        </div>
        <div className="flex gap-2">
          {bookingDebts.length > 0 && (
            <button
              onClick={() => exportToPDF(bookingDebts, pdfClientName, typeLabel)}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
            >
              <FileText size={15} />
              <span className="hidden sm:inline">PDF</span>
            </button>
          )}
          <button onClick={() => setModal(true)}
            className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-red-600">
            <Plus size={15} />
            <span className="hidden sm:inline">Yeni borc</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-2">
        <input
          type="text"
          placeholder="Müştəri adı ilə axtar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "bilet", label: "✈️ Bilet" },
            { value: "otel", label: "🏨 Otel" },
            { value: "tur", label: "🏖️ Tur" },
            { value: "transfer", label: "🚗 Transfer" },
            { value: "kruiz", label: "🚢 Kruiz" },
          ].map(t => (
            <button key={t.value}
              onClick={() => setTypeFilter(prev =>
                prev.includes(t.value) ? prev.filter(x => x !== t.value) : [...prev, t.value]
              )}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                typeFilter.includes(t.value) ? "bg-red-500 text-white border-red-500" : "bg-white text-gray-600 border-gray-200 hover:border-red-300"
              }`}>
              {t.label}
            </button>
          ))}
          {(search || typeFilter.length > 0) && bookingDebts.length > 0 && (
            <button
              onClick={() => exportToPDF(bookingDebts, pdfClientName, typeLabel)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              <FileText size={14} />
              PDF yüklə ({bookingDebts.length} sifariş)
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} className="text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Bizə borclu</p>
            <p className="text-lg font-bold text-green-600 truncate">{formatCurrency(totalTheyOwe)}</p>
            <p className="text-xs text-gray-400">{bookingDebts.length} sifariş</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <TrendingDown size={18} className="text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Biz borcluq</p>
            <p className="text-lg font-bold text-red-500 truncate">{formatCurrency(totalWeOwe)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        {[
          { value: "all", label: "Hamısı" },
          { value: "bookings", label: `📋 (${bookingDebts.length})` },
          { value: "manual", label: `✏️ (${manualDebts.length})` },
        ].map(t => (
          <button key={t.value} onClick={() => setTab(t.value as any)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              tab === t.value ? "bg-red-500 text-white" : "text-gray-500 bg-white border border-gray-200"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Booking debts */}
      {(tab === "all" || tab === "bookings") && bookingDebts.length > 0 && (
        <div className="mb-4">
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {bookingDebts.map(b => (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{b.clientName}</p>
                    <p className="text-xs text-gray-500 truncate">{b.destination}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0 ${
                    b.bookingType === "bilet" ? "bg-blue-100 text-blue-700" :
                    b.bookingType === "otel" ? "bg-purple-100 text-purple-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {b.bookingType === "bilet" ? "✈️" : b.bookingType === "otel" ? "🏨" : b.bookingType === "tur" ? "🏖️" : "🚗"}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-gray-400">{formatDate(b.departureDate)}</p>
                    <p className="text-xs text-gray-500">{b.manager}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-500">{formatCurrency(b.remaining)}</p>
                    <p className="text-xs text-gray-400">Ödənilib: {formatCurrency(b.paidAmount ?? 0)}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setPayModal(b); setPayAmount(String(b.remaining)) }}
                  className="w-full flex items-center justify-center gap-1.5 text-sm bg-green-50 text-green-700 px-3 py-2 rounded-xl hover:bg-green-100 font-medium">
                  <CheckCircle size={14} />
                  Ödəniş qeyd et
                </button>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Müştəri", "İstiqamət", "Növ", "Uçuş tarixi", "Ümumi", "Ödənilib", "Qalıq borc", "Menecer", ""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookingDebts.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 border-b border-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{b.clientName}</p>
                      <p className="text-xs text-gray-400">{b.clientPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{b.destination}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        b.bookingType === "bilet" ? "bg-blue-100 text-blue-700" :
                        b.bookingType === "otel" ? "bg-purple-100 text-purple-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {b.bookingType === "bilet" ? "✈️ Bilet" : b.bookingType === "otel" ? "🏨 Otel" : b.bookingType === "tur" ? "🏖️ Tur" : "🚗 Transfer"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(b.departureDate)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(b.sellPrice)}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(b.paidAmount ?? 0)}</td>
                    <td className="px-4 py-3"><span className="font-bold text-red-500">{formatCurrency(b.remaining)}</span></td>
                    <td className="px-4 py-3 text-gray-600">{b.manager}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setPayModal(b); setPayAmount(String(b.remaining)) }}
                        className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg hover:bg-green-100 font-medium">
                        <CheckCircle size={13} />
                        Ödə
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual debts */}
      {(tab === "all" || tab === "manual") && manualDebts.length > 0 && (
        <div className="space-y-2">
          {manualDebts.map(d => (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{d.name}</p>
                  <p className="text-xs text-gray-500">{d.description}</p>
                  <p className="text-xs text-gray-400">{d.dueDate}</p>
                </div>
                <div className="flex flex-col items-end gap-2 ml-3">
                  <p className={`font-bold ${d.direction === "they_owe" ? "text-green-600" : "text-red-500"}`}>
                    {formatCurrency(d.amount)}
                  </p>
                  <div className="flex gap-1.5">
                    <button onClick={() => setManualDebts(prev => prev.map(x => x.id === d.id ? { ...x, status: x.status === "pending" ? "paid" : "pending" } : x))}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.status === "paid" ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700"}`}>
                      {d.status === "paid" ? "Ödənilib" : "Gözləyir"}
                    </button>
                    <button onClick={() => setManualDebts(prev => prev.filter(x => x.id !== d.id))}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {bookingDebts.length === 0 && manualDebts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm font-medium">Borc tapılmadı</p>
        </div>
      )}

      {/* Pay modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Ödəniş qeyd et</h2>
              <button onClick={() => setPayModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Müştəri</p>
                <p className="font-semibold text-gray-900">{payModal.clientName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Qalıq borc</p>
                <p className="font-bold text-red-500 text-xl">{formatCurrency(payModal.remaining)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ödəniş məbləği (AZN)</label>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="flex gap-2">
                <button onClick={handlePay}
                  className="flex-1 bg-green-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-green-600">
                  Ödənişi qeyd et
                </button>
                <button onClick={() => setPayModal(null)}
                  className="flex-1 border border-gray-200 py-3 rounded-xl text-sm font-medium">
                  Ləğv et
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add manual debt modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Yeni borc</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
                <input name="name" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Məbləğ (AZN) *</label>
                <input name="amount" type="number" step="0.01" min="0" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Növ *</label>
                <select name="direction" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="they_owe">Bizə borclu</option>
                  <option value="we_owe">Biz borcluq</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıqlama</label>
                <input name="description" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Son tarix</label>
                <input name="dueDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div className="flex gap-3 pt-2 border-t">
                <button type="button" onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Ləğv et</button>
                <button type="submit" className="flex-1 px-4 py-2.5 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium">Əlavə et</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
