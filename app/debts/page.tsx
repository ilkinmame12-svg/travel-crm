"use client"

import { useState, useEffect, useMemo } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { supabase } from "@/lib/supabase"
import { formatCurrency, formatDate } from "@/lib/calculations"
import { Plus, Trash2, TrendingUp, TrendingDown, CheckCircle, FileText, X } from "lucide-react"

interface ManualDebt { id: string; name: string; amount: number; direction: "they_owe" | "we_owe"; description: string; dueDate: string; status: "pending" | "paid" }

const card = { background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(20px)", borderRadius: "24px" }
const modalCard = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "24px" }
const inputStyle = { background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: "12px", padding: "10px 16px", fontSize: "14px", outline: "none", width: "100%" }

const TAB_COLORS = [
  "#ef4444", "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#f97316"
]

function exportToPDF(debts: any[], clientName: string, typeLabel: string) {
  const total = debts.reduce((s, b) => s + b.remaining, 0)
  const date = new Date().toLocaleDateString("az-AZ")
  const rows = debts.map((b, i) => `<tr style="border-bottom:1px solid #f0f0f0"><td style="padding:10px">${i+1}</td><td style="padding:10px">${b.destination||"—"}</td><td style="padding:10px">${formatDate(b.departureDate)}</td><td style="padding:10px;text-align:right">${formatCurrency(b.sellPrice)}</td><td style="padding:10px;text-align:right;color:#16a34a">${formatCurrency(b.paidAmount??0)}</td><td style="padding:10px;text-align:right;font-weight:bold;color:#dc2626">${formatCurrency(b.remaining)}</td></tr>`).join("")
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Borc - ${clientName}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1f2937}.page{padding:40px;max-width:900px;margin:0 auto}.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:40px;padding-bottom:20px;border-bottom:2px solid #ef4444}.logo{font-size:28px;font-weight:bold;color:#ef4444}.logo span{color:#1f2937}.client-box{background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:30px}table{width:100%;border-collapse:collapse;margin-bottom:24px}thead tr{background:#1f2937}thead th{padding:12px;text-align:left;color:white;font-size:11px}.total-box{background:#1f2937;border-radius:12px;padding:20px;display:flex;justify-content:space-between;align-items:center}.footer{text-align:center;padding-top:20px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:11px}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body><div class="page"><div class="header"><div><div class="logo">its<span>tour</span></div></div><div style="text-align:right"><div style="font-weight:bold">${date}</div></div></div><div class="client-box"><div style="font-size:11px;color:#ef4444;font-weight:bold;text-transform:uppercase;margin-bottom:6px">Müştəri</div><div style="font-size:22px;font-weight:bold">${clientName}</div></div><table><thead><tr><th>#</th><th>İstiqamət</th><th>Tarix</th><th style="text-align:right">Ümumi</th><th style="text-align:right">Ödənilib</th><th style="text-align:right">Qalıq</th></tr></thead><tbody>${rows}</tbody></table><div class="total-box"><div style="color:#d1d5db">Cəmi borc:</div><div style="color:#ef4444;font-size:28px;font-weight:bold">${formatCurrency(total)}</div></div></div><script>window.onload=()=>window.print()</script></body></html>`
  const win = window.open("", "_blank")
  if (win) { win.document.write(html); win.document.close() }
}

export default function DebtsPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const { profile } = useUserRole()
  const [payModal, setPayModal] = useState<any>(null)
  const [payAmount, setPayAmount] = useState("")
  const [manualDebts, setManualDebts] = useState<ManualDebt[]>([])
  const [modal, setModal] = useState(false)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [clientTabs, setClientTabs] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>("all")

  const canDelete = ["it_admin", "direktor", "muhasib"].includes(profile?.role ?? "")

  useEffect(() => { fetchBookings() }, [])

  const allDebts = useMemo(() =>
    bookings
      .filter(b => b.paymentStatus === "unpaid" || b.paymentStatus === "partial")
      .filter(b => {
        if (search && !b.clientName.toLowerCase().includes(search.toLowerCase())) return false
        if (typeFilter.length > 0 && !typeFilter.includes(b.bookingType)) return false
        return true
      })
      .map(b => ({ ...b, remaining: b.sellPrice - (b.paidAmount ?? 0) })),
    [bookings, search, typeFilter]
  )

  // Debts shown in current view
  const visibleDebts = useMemo(() => {
    if (activeTab === "all") return allDebts
    if (activeTab === "selected") {
      return allDebts.filter(b => clientTabs.includes(b.clientName))
    }
    return allDebts.filter(b => b.clientName === activeTab)
  }, [allDebts, activeTab, clientTabs])

  const theyOwe = allDebts.reduce((s, b) => s + b.remaining, 0)
    + manualDebts.filter(d => d.direction === "they_owe" && d.status === "pending").reduce((s, d) => s + d.amount, 0)
  const weOwe = manualDebts.filter(d => d.direction === "we_owe" && d.status === "pending").reduce((s, d) => s + d.amount, 0)

  function toggleClientTab(clientName: string) {
    setClientTabs(prev => {
      if (prev.includes(clientName)) {
        const next = prev.filter(n => n !== clientName)
        if (activeTab === clientName) setActiveTab(next.length > 0 ? "selected" : "all")
        return next
      } else {
        setActiveTab("selected")
        return [...prev, clientName]
      }
    })
  }

  function removeTab(clientName: string, e: React.MouseEvent) {
    e.stopPropagation()
    setClientTabs(prev => {
      const next = prev.filter(n => n !== clientName)
      if (activeTab === clientName || (activeTab === "selected" && next.length === 0)) {
        setActiveTab("all")
      }
      return next
    })
  }

  async function handlePay() {
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) return
    const newPaid = (payModal.paidAmount ?? 0) + amount
    const newStatus = newPaid >= payModal.sellPrice ? "paid" : "partial"
    await supabase.from("bookings").update({ paid_amount: newPaid, payment_status: newStatus }).eq("id", payModal.id)
    await fetchBookings()
    setPayModal(null)
  }

  async function handleDeleteDebt(bookingId: string, sellPrice: number) {
    if (!confirm("Bu borcu silmək istəyirsiniz?")) return
    await supabase.from("bookings").update({ payment_status: "paid", paid_amount: sellPrice }).eq("id", bookingId)
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
      status: "pending"
    }])
    setModal(false)
  }

  const typeLabel = typeFilter.length === 0 ? "Bütün növlər" : typeFilter.map(t => t === "bilet" ? "Aviabilet" : t === "otel" ? "Otel" : t === "tur" ? "Tur" : "Transfer").join(", ")
  const selectedTotal = allDebts.filter(b => clientTabs.includes(b.clientName)).reduce((s, b) => s + b.remaining, 0)

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Borclar</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Borc idarəetməsi</p>
        </div>
        <div className="flex gap-3">
          {visibleDebts.length > 0 && (
            <button onClick={() => exportToPDF(visibleDebts, activeTab === "all" ? "Hamısı" : activeTab === "selected" ? clientTabs.join(", ") : activeTab, typeLabel)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium text-white"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <FileText size={15} />PDF
            </button>
          )}
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
            <Plus size={16} />Yeni borc
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        <input type="text" placeholder="Müştəri adı ilə axtar..." value={search}
          onChange={e => setSearch(e.target.value)} className="w-full" style={inputStyle} />
        <div className="flex gap-2 flex-wrap">
          {[{ value: "bilet", label: "✈️ Bilet" }, { value: "otel", label: "🏨 Otel" }, { value: "tur", label: "🏖️ Tur" }, { value: "transfer", label: "🚗 Transfer" }, { value: "kruiz", label: "🚢 Kruiz" }].map(t => (
            <button key={t.value}
              onClick={() => setTypeFilter(prev => prev.includes(t.value) ? prev.filter(x => x !== t.value) : [...prev, t.value])}
              className="px-3 py-1.5 rounded-2xl text-sm font-medium transition-all"
              style={{ background: typeFilter.includes(t.value) ? "linear-gradient(135deg, #ef4444, #f97316)" : "var(--bg-card)", border: "1px solid var(--border-color)", color: typeFilter.includes(t.value) ? "white" : "var(--text-secondary)" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="p-5 rounded-3xl flex items-center gap-4" style={card}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)" }}>
            <TrendingUp size={20} className="text-green-500" />
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Bizə borclu</p>
            <p className="text-xl font-bold text-green-500">{formatCurrency(theyOwe)}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{allDebts.length} sifariş</p>
          </div>
        </div>
        <div className="p-5 rounded-3xl flex items-center gap-4" style={card}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
            <TrendingDown size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Biz borcluq</p>
            <p className="text-xl font-bold text-red-500">{formatCurrency(weOwe)}</p>
          </div>
        </div>
      </div>

      {/* Browser tabs */}
      {clientTabs.length > 0 && (
        <div className="mb-4 rounded-3xl overflow-hidden" style={card}>
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-3 pt-3 overflow-x-auto scrollbar-hide"
            style={{ borderBottom: "1px solid var(--border-color)" }}>

            {/* All tab */}
            <button onClick={() => setActiveTab("all")}
              className="flex-shrink-0 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all"
              style={{
                background: activeTab === "all" ? "var(--bg-primary)" : "transparent",
                color: activeTab === "all" ? "var(--text-primary)" : "var(--text-muted)",
                borderBottom: activeTab === "all" ? "2px solid #ef4444" : "2px solid transparent",
                marginBottom: "-1px",
              }}>
              🗂 Hamısı
            </button>

            {/* Selected tab */}
            <button onClick={() => setActiveTab("selected")}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all"
              style={{
                background: activeTab === "selected" ? "var(--bg-primary)" : "transparent",
                color: activeTab === "selected" ? "var(--text-primary)" : "var(--text-muted)",
                borderBottom: activeTab === "selected" ? "2px solid #6366f1" : "2px solid transparent",
                marginBottom: "-1px",
              }}>
              📋 Seçilmişlər
              <span className="text-xs px-1.5 py-0.5 rounded-lg font-bold"
                style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1" }}>
                {clientTabs.length}
              </span>
              <span className="text-xs font-bold" style={{ color: "#6366f1" }}>
                {formatCurrency(selectedTotal)}
              </span>
            </button>

            {/* Individual client tabs */}
            {clientTabs.map((name, idx) => {
              const tabTotal = allDebts.filter(b => b.clientName === name).reduce((s, b) => s + b.remaining, 0)
              const color = TAB_COLORS[idx % TAB_COLORS.length]
              return (
                <button key={name} onClick={() => setActiveTab(name)}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-t-xl text-sm font-medium transition-all group"
                  style={{
                    background: activeTab === name ? "var(--bg-primary)" : "transparent",
                    color: activeTab === name ? "var(--text-primary)" : "var(--text-muted)",
                    borderBottom: activeTab === name ? `2px solid ${color}` : "2px solid transparent",
                    marginBottom: "-1px",
                    maxWidth: "200px",
                  }}>
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: color, fontSize: "9px" }}>
                    {name[0]}
                  </div>
                  <span className="truncate max-w-[90px]">{name}</span>
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color }}>
                    {formatCurrency(tabTotal)}
                  </span>
                  <span onClick={e => removeTab(name, e)}
                    className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all cursor-pointer"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                    <X size={9} />
                  </span>
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          {activeTab !== "all" && (
            <div className="p-4">
              {visibleDebts.length === 0 ? (
                <p className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>Borc tapılmadı</p>
              ) : (
                <div className="space-y-3">
                  {/* Desktop table */}
                  <div className="hidden md:block rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: "var(--bg-glass)", borderBottom: "1px solid var(--border-color)" }}>
                          {["Müştəri", "İstiqamət", "Növ", "Tarix", "Ümumi", "Ödənilib", "Qalıq", "Menecer", ""].map(h => (
                            <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3"
                              style={{ color: "var(--text-muted)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleDebts.map(b => (
                          <tr key={b.id} className="border-b transition-all" style={{ borderColor: "var(--border-color)" }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{b.clientName}</p>
                              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{b.clientPhone}</p>
                            </td>
                            <td className="px-4 py-3 max-w-[180px] truncate" style={{ color: "var(--text-secondary)" }}>{b.destination}</td>
                            <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>{b.bookingType}</span></td>
                            <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{formatDate(b.departureDate)}</td>
                            <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>{formatCurrency(b.sellPrice)}</td>
                            <td className="px-4 py-3 font-semibold text-green-500">{formatCurrency(b.paidAmount ?? 0)}</td>
                            <td className="px-4 py-3 font-bold text-red-500">{formatCurrency(b.remaining)}</td>
                            <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>{b.manager?.split(" ")[0]}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1.5">
                                <button onClick={() => { setPayModal(b); setPayAmount(String(b.remaining)) }}
                                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-medium transition-all hover:scale-105"
                                  style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                                  <CheckCircle size={12} />Ödə
                                </button>
                                {canDelete && (
                                  <button onClick={() => handleDeleteDebt(b.id, b.sellPrice)}
                                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-medium transition-all hover:scale-105"
                                    style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                                    <Trash2 size={12} />Sil
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-2">
                    {visibleDebts.map(b => (
                      <div key={b.id} className="p-4 rounded-2xl" style={{ border: "1px solid var(--border-color)", background: "var(--bg-glass)" }}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{b.clientName}</p>
                            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{b.destination}</p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full ml-2" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>{b.bookingType}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(b.departureDate)}</p>
                          <p className="text-xl font-bold text-red-500">{formatCurrency(b.remaining)}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setPayModal(b); setPayAmount(String(b.remaining)) }}
                            className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-xl font-medium"
                            style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                            <CheckCircle size={14} />Ödə
                          </button>
                          {canDelete && (
                            <button onClick={() => handleDeleteDebt(b.id, b.sellPrice)}
                              className="px-3 py-2 rounded-xl"
                              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main list — always visible when activeTab === "all" */}
      {activeTab === "all" && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-3xl overflow-hidden mb-4" style={card}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  {["Müştəri", "İstiqamət", "Növ", "Tarix", "Ümumi", "Ödənilib", "Qalıq", "Menecer", ""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3"
                      style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allDebts.map(b => {
                  const isSelected = clientTabs.includes(b.clientName)
                  return (
                    <tr key={b.id} className="border-b transition-all" style={{ borderColor: "var(--border-color)", background: isSelected ? "rgba(99,102,241,0.05)" : "transparent" }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)" }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent" }}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleClientTab(b.clientName)} className="text-left group">
                          <p className="font-medium text-sm transition-all group-hover:underline"
                            style={{ color: isSelected ? "#6366f1" : "var(--text-primary)" }}>
                            {isSelected && <span className="mr-1">📌</span>}{b.clientName}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{b.clientPhone}</p>
                        </button>
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate" style={{ color: "var(--text-secondary)" }}>{b.destination}</td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>{b.bookingType}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{formatDate(b.departureDate)}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>{formatCurrency(b.sellPrice)}</td>
                      <td className="px-4 py-3 font-semibold text-green-500">{formatCurrency(b.paidAmount ?? 0)}</td>
                      <td className="px-4 py-3 font-bold text-red-500">{formatCurrency(b.remaining)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>{b.manager?.split(" ")[0]}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => { setPayModal(b); setPayAmount(String(b.remaining)) }}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-medium transition-all hover:scale-105"
                            style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                            <CheckCircle size={12} />Ödə
                          </button>
                          {canDelete && (
                            <button onClick={() => handleDeleteDebt(b.id, b.sellPrice)}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl font-medium transition-all hover:scale-105"
                              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                              <Trash2 size={12} />Sil
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3 mb-4">
            {allDebts.map(b => {
              const isSelected = clientTabs.includes(b.clientName)
              return (
                <div key={b.id} className="p-4 rounded-3xl" style={{ ...card, border: isSelected ? "2px solid #6366f1" : "1px solid var(--border-color)" }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <button onClick={() => toggleClientTab(b.clientName)} className="text-left">
                        <p className="font-semibold truncate" style={{ color: isSelected ? "#6366f1" : "var(--text-primary)" }}>
                          {isSelected && "📌 "}{b.clientName}
                        </p>
                      </button>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{b.destination}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full ml-2" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>{b.bookingType}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(b.departureDate)}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{b.manager?.split(" ")[0]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-500">{formatCurrency(b.remaining)}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Ödənilib: {formatCurrency(b.paidAmount ?? 0)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setPayModal(b); setPayAmount(String(b.remaining)) }}
                      className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-2xl font-medium"
                      style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                      <CheckCircle size={14} />Ödə
                    </button>
                    {canDelete && (
                      <button onClick={() => handleDeleteDebt(b.id, b.sellPrice)}
                        className="flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-2xl font-medium"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {allDebts.length === 0 && manualDebts.length === 0 && (
        <div className="text-center py-16 rounded-3xl" style={{ ...card, color: "var(--text-muted)" }}>
          <p className="text-sm font-medium">Borc tapılmadı</p>
        </div>
      )}

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4"
          style={{ backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm p-6" style={modalCard}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Ödəniş qeyd et</h2>
              <button onClick={() => setPayModal(null)} style={{ color: "var(--text-muted)" }} className="text-xl">✕</button>
            </div>
            <div className="space-y-3 mb-4">
              <div><p className="text-xs" style={{ color: "var(--text-muted)" }}>Müştəri</p><p className="font-semibold" style={{ color: "var(--text-primary)" }}>{payModal.clientName}</p></div>
              <div><p className="text-xs" style={{ color: "var(--text-muted)" }}>İstiqamət</p><p className="text-sm" style={{ color: "var(--text-secondary)" }}>{payModal.destination}</p></div>
              <div><p className="text-xs" style={{ color: "var(--text-muted)" }}>Qalıq borc</p><p className="text-xl font-bold text-red-500">{formatCurrency(payModal.remaining)}</p></div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Ödəniş məbləği</label>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePay} className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}>Ödənişi qeyd et</button>
              <button onClick={() => setPayModal(null)} className="flex-1 py-3 rounded-2xl text-sm"
                style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>Ləğv et</button>
            </div>
            {canDelete && (
              <button onClick={() => handleDeleteDebt(payModal.id, payModal.sellPrice)}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-medium"
                style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                <Trash2 size={14} />Borcu sil
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add Manual Debt Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4"
          style={{ backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md p-6" style={modalCard}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Yeni borc</h2>
              <button onClick={() => setModal(false)} style={{ color: "var(--text-muted)" }} className="text-xl">✕</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Ad *</label><input name="name" required style={inputStyle} /></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Məbləğ (AZN) *</label><input name="amount" type="number" step="0.01" min="0" required style={inputStyle} /></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Növ *</label><select name="direction" style={inputStyle}><option value="they_owe">Bizə borclu</option><option value="we_owe">Biz borcluq</option></select></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Açıqlama</label><input name="description" style={inputStyle} /></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Son tarix</label><input name="dueDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} style={inputStyle} /></div>
              <div className="flex gap-3 pt-3 border-t" style={{ borderColor: "var(--border-color)" }}>
                <button type="button" onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-2xl text-sm" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>Ləğv et</button>
                <button type="submit" className="flex-1 py-2.5 rounded-2xl text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>Əlavə et</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}