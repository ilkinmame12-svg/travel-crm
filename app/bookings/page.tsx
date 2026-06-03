"use client"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { useState, useMemo, useEffect } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { supabase } from "@/lib/supabase"
import type { Booking, BookingFilters, BookingFormData, BookingType, IATAPeriod } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/calculations"
import { Plus, Search, Plane, Hotel, Palmtree, Ship, Car, Luggage, Armchair, Star, Shield } from "lucide-react"

const MANAGERS = ["Miraslan Abbasov", "Rehime Qasimli", "Ayxan Elxanli", "Gunes Abdullazade", "Gunay Qurbanova", "Mircemil Abbasov", "Meryem Eliyeva"]

const BOOKING_TYPES = [
  { value: "bilet", label: "Aviabilet", Icon: Plane, color: "blue" },
  { value: "otel", label: "Otel", Icon: Hotel, color: "purple" },
  { value: "tur", label: "Tur paketi", Icon: Palmtree, color: "green" },
  { value: "kruiz", label: "Kruiz", Icon: Ship, color: "cyan" },
  { value: "transfer", label: "Transfer", Icon: Car, color: "orange" },
  { value: "bagaj", label: "Bagaj", Icon: Luggage, color: "yellow" },
  { value: "yer_secimi", label: "Yer seçimi", Icon: Armchair, color: "pink" },
  { value: "cip", label: "CIP xidmət", Icon: Star, color: "gold" },
  { value: "sigorta", label: "Sığorta", Icon: Shield, color: "teal" },
]

const EMPTY_FILTERS: BookingFilters = {
  search: "", status: "all", manager: "", iataPeriod: "all", bookingType: "all", dateFrom: "", dateTo: ""
}

const TYPE_COLORS: Record<string, { bg: string, color: string }> = {
  blue:   { bg: "rgba(59,130,246,0.1)",  color: "#3b82f6" },
  purple: { bg: "rgba(139,92,246,0.1)",  color: "#8b5cf6" },
  green:  { bg: "rgba(34,197,94,0.1)",   color: "#22c55e" },
  cyan:   { bg: "rgba(6,182,212,0.1)",   color: "#06b6d4" },
  orange: { bg: "rgba(249,115,22,0.1)",  color: "#f97316" },
  yellow: { bg: "rgba(234,179,8,0.1)",   color: "#eab308" },
  pink:   { bg: "rgba(236,72,153,0.1)",  color: "#ec4899" },
  gold:   { bg: "rgba(245,158,11,0.1)",  color: "#f59e0b" },
  teal:   { bg: "rgba(20,184,166,0.1)",  color: "#14b8a6" },
}

function getTypeInfo(value: string) {
  return BOOKING_TYPES.find(t => t.value === value) ?? BOOKING_TYPES[0]
}

const card = { background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(20px)", borderRadius: "24px" }
const modalCard = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "24px" }
const inputStyle = { background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: "12px", padding: "8px 14px", fontSize: "14px", outline: "none", width: "100%" }

export default function SifarislerPage() {
  const { profile, canDelete } = useUserRole()
  const isReadOnly = profile?.role === "boss"
  const { bookings, loading, fetchBookings, addBooking, updateBooking, deleteBooking } = useBookingsStore()
  const [modal, setModal] = useState<"create" | "edit" | null>(null)
  const [selected, setSelected] = useState<Booking | null>(null)
  const [filters, setFilters] = useState<BookingFilters>(EMPTY_FILTERS)
  const [activeTab, setActiveTab] = useState<BookingType | "all">("all")
  const [paymentStatus, setPaymentStatus] = useState("unpaid")
  const [paidAmount, setPaidAmount] = useState(0)
  const [isIata, setIsIata] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => { fetchBookings(); setReady(true) }, [])
  useEffect(() => {
    if (modal) {
      setPaymentStatus(selected?.paymentStatus ?? "unpaid")
      setPaidAmount(selected?.paidAmount ?? 0)
      setIsIata(selected?.isIata ?? false)
    }
  }, [modal, selected])

  const filtered = useMemo(() => bookings.filter(b => {
    if (profile?.role === "menecer" && b.manager !== profile.fullName) return false
    if (activeTab !== "all" && b.bookingType !== activeTab) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!b.clientName.toLowerCase().includes(q) && !b.destination.toLowerCase().includes(q) &&
        !(b.vendor ?? "").toLowerCase().includes(q) && !(b.ticketNumber ?? "").toLowerCase().includes(q) &&
        !(b.bookingReference ?? "").toLowerCase().includes(q) && !(b.pnr ?? "").toLowerCase().includes(q) &&
        !(b.notes ?? "").toLowerCase().includes(q)) return false
    }
    if (filters.status !== "all" && b.status !== filters.status) return false
    if (filters.manager && b.manager !== filters.manager) return false
    if (filters.iataPeriod !== "all" && b.iataPeriod !== filters.iataPeriod) return false
    if (filters.dateFrom && !b.departureDate.startsWith(filters.dateFrom)) return false
    return true
  }), [bookings, filters, activeTab])

  const totalRevenue = filtered.reduce((s, b) => s + b.sellPrice, 0)
  const totalProfit = filtered.reduce((s, b) => s + b.profit, 0)
  const totalCost = filtered.reduce((s, b) => s + b.buyPrice, 0)
  const typeCounts = BOOKING_TYPES.map(t => ({ ...t, count: bookings.filter(b => b.bookingType === t.value).length }))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const sellPrice = Number(fd.get("sellPrice"))
    const buyPrice = Number(fd.get("buyPrice"))
    const commissionPercent = Number(fd.get("commissionPercent"))
    const commissionAmount = Math.round(sellPrice * commissionPercent) / 100
    const profit = sellPrice - buyPrice - commissionAmount
    const paid = paymentStatus === "paid" ? sellPrice : paymentStatus === "partial" ? paidAmount : 0

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
      vendor: fd.get("vendor") as string,
      isIata, buyPrice, sellPrice, commissionPercent,
      paidAmount: paid,
      manager: fd.get("manager") as string,
      iataPeriod: fd.get("iataPeriod") as IATAPeriod,
      status: fd.get("status") as "pending" | "confirmed" | "completed" | "cancelled",
      paymentStatus: paymentStatus as "unpaid" | "partial" | "paid",
      notes: fd.get("notes") as string,
      ticketNumber: fd.get("ticketNumber") as string,
      bookingReference: fd.get("bookingReference") as string,
      pnr: fd.get("pnr") as string,
      updated_by: profile?.fullName ?? "Admin",
      updated_by_role: profile?.role ?? "",
    }

    if (modal === "edit" && selected) {
      await updateBooking(selected.id, data)
    } else if (profile?.role === "menecer") {
      await supabase.from("booking_drafts").insert({
        client_name: data.clientName, client_phone: data.clientPhone,
        destination: data.destination, departure_date: data.departureDate,
        return_date: data.returnDate, travelers: data.travelers,
        booking_type: data.bookingType, description: data.description,
        vendor: data.vendor, is_iata: data.isIata,
        buy_price: data.buyPrice, sell_price: data.sellPrice,
        commission_percent: data.commissionPercent, commission_amount: commissionAmount,
        profit, paid_amount: data.paidAmount, manager: data.manager,
        iata_period: data.iataPeriod, status: data.status, payment_status: data.paymentStatus,
        notes: data.notes, ticket_number: data.ticketNumber,
        booking_reference: data.bookingReference, pnr: data.pnr,
        submitted_by: profile?.fullName ?? "", submitted_by_role: profile?.role ?? "",
        review_status: "pending",
      })
      alert("✅ Sifariş təsdiq üçün göndərildi!")
    } else {
      await addBooking(data)
    }
    setModal(null); setSelected(null)
  }

  if (!ready || !profile) return null

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Sifarişlər</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{filtered.length} / {bookings.length} sifariş</p>
        </div>
        {!isReadOnly && (
          <button onClick={() => { setSelected(null); setModal("create") }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
            <Plus size={16} />
            {profile?.role === "menecer" ? "Sifariş göndər" : "Yeni sifariş"}
          </button>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="p-5 rounded-3xl text-white" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
          <p className="text-sm opacity-80 mb-2">Ümumi gəlir</p>
          <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="p-5 rounded-3xl" style={card}>
          <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Ümumi xərc</p>
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{formatCurrency(totalCost)}</p>
        </div>
        <div className="p-5 rounded-3xl" style={card}>
          <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Mənfəət</p>
          <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-500" : "text-red-500"}`}>{formatCurrency(totalProfit)}</p>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-3xl overflow-hidden" style={card}>
        {/* Tabs + Filters */}
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="flex gap-1.5 flex-wrap mb-3">
            <button onClick={() => setActiveTab("all")}
              className="px-3 py-1.5 rounded-2xl text-sm font-medium transition-all"
              style={{ background: activeTab === "all" ? "linear-gradient(135deg, #ef4444, #f97316)" : "var(--bg-glass)", color: activeTab === "all" ? "white" : "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
              Hamısı ({bookings.filter(b => profile?.role !== "menecer" || b.manager === profile.fullName).length})
            </button>
            {typeCounts.map(t => {
              const Icon = t.Icon
              const tc = TYPE_COLORS[t.color]
              const active = activeTab === t.value
              return (
                <button key={t.value} onClick={() => setActiveTab(t.value as BookingType)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm font-medium transition-all"
                  style={{ background: active ? tc.bg : "var(--bg-glass)", color: active ? tc.color : "var(--text-secondary)", border: `1px solid ${active ? tc.color + "40" : "var(--border-color)"}` }}>
                  <Icon size={13} />
                  {t.label} ({t.count})
                </button>
              )
            })}
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input type="text" placeholder="Axtar (ad, bilet №, PNR...)"
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                className="w-full focus:outline-none text-sm"
                style={{ ...inputStyle, paddingLeft: "32px" }} />
            </div>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value as any }))}
              style={inputStyle} className="focus:outline-none" >
              <option value="all">Bütün statuslar</option>
              <option value="pending">Gözləyir</option>
              <option value="confirmed">Təsdiqlənib</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">Ləğv edildi</option>
            </select>
            <select value={filters.iataPeriod} onChange={e => setFilters(f => ({ ...f, iataPeriod: e.target.value as any }))}
              style={inputStyle} className="focus:outline-none">
              <option value="all">Bütün periodlar</option>
              <option value="1-7">1-7</option>
              <option value="8-15">8-15</option>
              <option value="16-23">16-23</option>
              <option value="24-31">24-31</option>
            </select>
            <input type="month" value={filters.dateFrom}
              onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              style={inputStyle} className="focus:outline-none" />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>Yüklənir...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1400px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  {["Növ", "Müştəri", "İstiqamət", "Vendor", "Tarixlər", "Menecer", "Satış", "Ödənilib", "Qalıq", "Mənfəət", "Status", "Ödəniş", "IATA", ""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-3 py-3"
                      style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={14} className="text-center py-16" style={{ color: "var(--text-muted)" }}>Sifariş tapılmadı</td></tr>
                )}
                {filtered.map(b => {
                  const typeInfo = getTypeInfo(b.bookingType)
                  const Icon = typeInfo.Icon
                  const tc = TYPE_COLORS[typeInfo.color]
                  const remaining = b.sellPrice - (b.paidAmount ?? 0)
                  return (
                    <tr key={b.id} className="group transition-all" style={{ borderBottom: "1px solid var(--border-color)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl font-medium w-fit"
                          style={{ background: tc.bg, color: tc.color }}>
                          <Icon size={11} />{typeInfo.label}
                        </div>
                        {b.isIata && <span className="text-xs px-1.5 py-0.5 rounded-lg mt-1 block w-fit text-white" style={{ background: "#3b82f6", fontSize: "10px" }}>IATA</span>}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{b.clientName}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{b.clientPhone}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p style={{ color: "var(--text-primary)" }}>{b.destination}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{b.travelers} nəfər</p>
                      </td>
                      <td className="px-3 py-3">
                        {b.vendor
                          ? <span className="text-xs px-2 py-1 rounded-xl" style={{ background: "var(--bg-glass)", color: "var(--text-secondary)" }}>{b.vendor}</span>
                          : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p style={{ color: "var(--text-primary)" }}>{formatDate(b.departureDate)}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>→ {formatDate(b.returnDate)}</p>
                      </td>
                      <td className="px-3 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>{b.manager}</td>
                      <td className="px-3 py-3 text-right font-semibold" style={{ color: "var(--text-primary)" }}>{formatCurrency(b.sellPrice)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-green-500">{formatCurrency(b.paidAmount ?? 0)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={remaining > 0 ? "font-semibold text-red-500" : ""} style={remaining <= 0 ? { color: "var(--text-muted)" } : {}}>
                          {remaining > 0 ? formatCurrency(remaining) : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={`font-semibold ${b.profit >= 0 ? "text-green-500" : "text-red-500"}`}>{formatCurrency(b.profit)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs px-2.5 py-1 rounded-xl font-medium" style={{
                          background: b.status === "confirmed" ? "rgba(34,197,94,0.1)" : b.status === "pending" ? "rgba(245,158,11,0.1)" : b.status === "completed" ? "rgba(99,102,241,0.1)" : "var(--bg-glass)",
                          color: b.status === "confirmed" ? "#22c55e" : b.status === "pending" ? "#f59e0b" : b.status === "completed" ? "#6366f1" : "var(--text-muted)"
                        }}>
                          {b.status === "confirmed" ? "Təsdiqlənib" : b.status === "pending" ? "Gözləyir" : b.status === "completed" ? "Tamamlandı" : "Ləğv edildi"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs px-2.5 py-1 rounded-xl font-medium" style={{
                          background: b.paymentStatus === "paid" ? "rgba(34,197,94,0.1)" : b.paymentStatus === "partial" ? "rgba(249,115,22,0.1)" : "rgba(239,68,68,0.1)",
                          color: b.paymentStatus === "paid" ? "#22c55e" : b.paymentStatus === "partial" ? "#f97316" : "#ef4444"
                        }}>
                          {b.paymentStatus === "paid" ? "Ödənilib" : b.paymentStatus === "partial" ? "Qismən" : "Ödənilməyib"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-medium px-2 py-1 rounded-xl" style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>{b.iataPeriod}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          {!isReadOnly && (
                            <button onClick={() => { setSelected(b); setModal("edit") }}
                              className="p-1.5 rounded-xl text-sm transition-all"
                              style={{ color: "var(--text-muted)" }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#6366f1"}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}>✏️</button>
                          )}
                          {canDelete && (
                            <button onClick={() => { if (confirm("Silinsin?")) deleteBooking(b.id) }}
                              className="p-1.5 rounded-xl text-sm transition-all"
                              style={{ color: "var(--text-muted)" }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#ef4444"}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}>🗑️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4 pt-8">
          <div className="w-full max-w-2xl" style={modalCard}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{modal === "edit" ? "Redaktə et" : "Yeni sifariş"}</h2>
                {profile?.role === "menecer" && modal === "create" && (
                  <p className="text-xs mt-0.5" style={{ color: "#f59e0b" }}>⏳ Sifariş təsdiq üçün göndəriləcək</p>
                )}
              </div>
              <button onClick={() => { setModal(null); setSelected(null) }} style={{ color: "var(--text-muted)" }} className="text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Sifariş növü *</label>
                <div className="grid grid-cols-5 gap-2">
                  {BOOKING_TYPES.map(t => {
                    const Icon = t.Icon
                    const tc = TYPE_COLORS[t.color]
                    return (
                      <label key={t.value} className="cursor-pointer">
                        <input type="radio" name="bookingType" value={t.value}
                          defaultChecked={selected ? selected.bookingType === t.value : t.value === "bilet"}
                          className="sr-only peer" />
                        <div className="border-2 rounded-2xl p-3 text-center transition-all peer-checked:border-red-500"
                          style={{ borderColor: "var(--border-color)", background: "var(--bg-glass)" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = tc.color}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)"}>
                          <Icon size={18} className="mx-auto mb-1" style={{ color: tc.color }} />
                          <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{t.label}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Vendor</label>
                  <input name="vendor" defaultValue={selected?.vendor ?? ""} placeholder="Amadeus, Booking.com..." style={inputStyle} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-3 cursor-pointer" onClick={() => setIsIata(!isIata)}>
                    <div className="w-11 h-6 rounded-full transition-colors relative" style={{ background: isIata ? "#3b82f6" : "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
                      <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" style={{ transform: isIata ? "translateX(22px)" : "translateX(2px)" }} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>IATA biletidir</span>
                    {isIata && <span className="text-xs px-2 py-0.5 rounded-lg text-white" style={{ background: "#3b82f6" }}>IATA</span>}
                  </label>
                </div>
              </div>

              <div className="col-span-2"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Müştəri</p></div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Ad *</label>
                <ClientAutocomplete defaultValue={selected?.clientName ?? ""} bookings={bookings} ready={ready} inputStyle={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Telefon</label>
                <input name="clientPhone" defaultValue={selected?.clientPhone} style={inputStyle} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Email</label>
                <input name="clientEmail" type="email" defaultValue={selected?.clientEmail} style={inputStyle} />
              </div>

              <div className="col-span-2 mt-2"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Səfər</p></div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>İstiqamət *</label>
                <input name="destination" defaultValue={selected?.destination} required style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Tarix (başlanğıc) *</label>
                <input name="departureDate" type="date" defaultValue={selected?.departureDate ?? new Date().toISOString().split("T")[0]} required style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Tarix (son)</label>
                <input name="returnDate" type="date" defaultValue={selected?.returnDate ?? new Date().toISOString().split("T")[0]} style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Turistlər</label>
                <input name="travelers" type="number" min="1" defaultValue={selected?.travelers ?? 1} style={inputStyle} />
              </div>

              <div className="col-span-2 mt-2"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Maliyyə</p></div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Satış qiyməti (AZN) *</label>
                <input name="sellPrice" type="number" step="0.01" min="-99999" defaultValue={selected?.sellPrice ?? 0} required style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Alış qiyməti (AZN) *</label>
                <input name="buyPrice" type="number" step="0.01" min="-99999" defaultValue={selected?.buyPrice ?? 0} required style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Komissiya (%)</label>
                <input name="commissionPercent" type="number" step="0.1" min="0" max="100" defaultValue={selected?.commissionPercent ?? 5} style={inputStyle} />
              </div>

              <div className="col-span-2 mt-2"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>İdarəetmə</p></div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Menecer</label>
                <select name="manager" defaultValue={selected?.manager ?? MANAGERS[0]} style={inputStyle}>
                  {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>IATA period</label>
                <select name="iataPeriod" defaultValue={selected?.iataPeriod ?? "1-7"} style={inputStyle}>
                  <option value="1-7">1-7</option>
                  <option value="8-15">8-15</option>
                  <option value="16-23">16-23</option>
                  <option value="24-31">24-31</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Status</label>
                <select name="status" defaultValue={selected?.status ?? "pending"} style={inputStyle}>
                  <option value="pending">Gözləyir</option>
                  <option value="confirmed">Təsdiqlənib</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="cancelled">Ləğv edildi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Ödəniş statusu</label>
                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} style={inputStyle}>
                  <option value="unpaid">Ödənilməyib</option>
                  <option value="partial">Qismən ödənilib</option>
                  <option value="paid">Tam ödənilib</option>
                </select>
              </div>
              {paymentStatus === "partial" && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Ödənilən məbləğ (AZN)</label>
                  <input type="number" step="0.01" min="0" value={paidAmount} onChange={e => setPaidAmount(Number(e.target.value))}
                    style={{ ...inputStyle, border: "1px solid #f97316" }} />
                </div>
              )}

              <div className="col-span-2 mt-2"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Referans nömrələri</p></div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Bilet nömrəsi</label>
                <input name="ticketNumber" defaultValue={selected?.ticketNumber ?? ""} placeholder="157-1234567890" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Bron nömrəsi</label>
                <input name="bookingReference" defaultValue={selected?.bookingReference ?? ""} placeholder="ABC123" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>PNR</label>
                <input name="pnr" defaultValue={selected?.pnr ?? ""} placeholder="XYZABC" style={inputStyle} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Qeydlər</label>
                <textarea name="notes" rows={2} defaultValue={selected?.notes}
                  style={{ ...inputStyle, resize: "none" }} />
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-3" style={{ borderTop: "1px solid var(--border-color)" }}>
                <button type="button" onClick={() => { setModal(null); setSelected(null) }}
                  className="px-4 py-2.5 rounded-2xl text-sm"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                  Ləğv et
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-2xl text-sm font-medium text-white"
                  style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
                  {modal === "edit" ? "Yadda saxla" : profile?.role === "menecer" ? "Təsdiqə göndər" : "Yarat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ClientAutocomplete({ defaultValue, bookings, ready, inputStyle }: { defaultValue: string, bookings: any[], ready: boolean, inputStyle: any }) {
  const [value, setValue] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [show, setShow] = useState(false)
  const uniqueClients = [...new Set(bookings.map(b => b.clientName))].filter(Boolean)

  function handleChange(v: string) {
    setValue(v)
    if (v.length > 0) {
      setSuggestions(uniqueClients.filter(c => c.toLowerCase().includes(v.toLowerCase())).slice(0, 6))
      setShow(true)
    } else setShow(false)
  }

  if (!ready) return null

  return (
    <div className="relative">
      <input name="clientName" value={value} onChange={e => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setShow(false), 150)} required style={inputStyle} />
      {show && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 py-1 rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
          {suggestions.map(s => (
            <button key={s} type="button" onClick={() => { setValue(s); setShow(false) }}
              className="w-full text-left px-4 py-2.5 text-sm transition-all"
              style={{ color: "var(--text-primary)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}