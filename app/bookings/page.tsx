"use client"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { useState, useMemo, useEffect, useCallback } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { supabase } from "@/lib/supabase"
import type { Booking, BookingFilters, BookingFormData, BookingType, IATAPeriod } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/calculations"
import {
  Plus, Search, Plane, Hotel, Palmtree, Ship, Car, Luggage,
  Armchair, Star, Shield, TrendingUp, TrendingDown, DollarSign,
  Filter, X, ChevronDown, CheckCircle2, Clock, XCircle, AlertCircle,
  Edit3, Trash2, MoreHorizontal, SlidersHorizontal, ArrowUpRight, FileText, Eye, Calendar, User, Phone, Mail, MapPin, CreditCard, Hash
} from "lucide-react"

const MANAGERS = ["Miraslan Abbasov", "Rehime Qasimli", "Ayxan Elxanli", "Gunes Abdullazade", "Gunay Qurbanova", "Mircemil Abbasov", "Meryem Eliyeva"]

const BOOKING_TYPES = [
  { value: "bilet",     label: "Aviabilet", Icon: Plane,    color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  { value: "otel",      label: "Otel",       Icon: Hotel,    color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  { value: "tur",       label: "Tur",        Icon: Palmtree, color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  { value: "kruiz",     label: "Kruiz",      Icon: Ship,     color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  { value: "transfer",  label: "Transfer",   Icon: Car,      color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  { value: "bagaj",     label: "Bagaj",      Icon: Luggage,  color: "#eab308", bg: "rgba(234,179,8,0.12)" },
  { value: "yer_secimi",label: "Yer seçimi", Icon: Armchair, color: "#ec4899", bg: "rgba(236,72,153,0.12)" },
  { value: "cip",       label: "CIP",        Icon: Star,     color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  { value: "sigorta",   label: "Sığorta",    Icon: Shield,   color: "#14b8a6", bg: "rgba(20,184,166,0.12)" },
  { value: "viza", label: "Viza", Icon: CreditCard, color: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
]

const EMPTY_FILTERS: BookingFilters = {
  search: "", status: "all", manager: "", iataPeriod: "all", bookingType: "all", dateFrom: "", dateTo: ""
}

function getTypeInfo(value: string) {
  return BOOKING_TYPES.find(t => t.value === value) ?? BOOKING_TYPES[0]
}

function SkeletonRow() {
  return (
    <tr className="border-b" style={{ borderColor: "var(--border-color)" }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 rounded-lg animate-pulse" style={{ background: "var(--bg-glass)", width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
    confirmed: { label: "Təsdiqlənib", color: "#22c55e", bg: "rgba(34,197,94,0.12)", Icon: CheckCircle2 },
    pending:   { label: "Gözləyir",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)", Icon: Clock },
    completed: { label: "Tamamlandı",  color: "#6366f1", bg: "rgba(99,102,241,0.12)", Icon: CheckCircle2 },
    cancelled: { label: "Ləğv edildi", color: "#6b7280", bg: "var(--bg-glass)",        Icon: XCircle },
  }
  const s = map[status] ?? map.pending
  const Icon = s.Icon
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      <Icon size={10} />{s.label}
    </span>
  )
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    paid:    { label: "Ödənilib",    color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    partial: { label: "Qismən",      color: "#f97316", bg: "rgba(249,115,22,0.12)" },
    unpaid:  { label: "Ödənilməyib", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  }
  const s = map[status] ?? map.unpaid
  return (
    <span className="inline-flex text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color }}>{s.label}</span>
  )
}

function EmptyState({ onAdd, isManager }: { onAdd: () => void; isManager: boolean }) {
  return (
    <tr><td colSpan={14}>
      <div className="flex flex-col items-center justify-center py-24 px-6">
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
          style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.15))" }}>
          <Plane size={28} style={{ color: "#ef4444" }} />
        </div>
        <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Sifariş tapılmadı</h3>
        <p className="text-sm mb-6 text-center max-w-xs" style={{ color: "var(--text-muted)" }}>Filtrləri dəyişin və ya yeni sifariş əlavə edin</p>
        <button onClick={onAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", boxShadow: "0 4px 20px rgba(239,68,68,0.35)" }}>
          <Plus size={15} />{isManager ? "Sifariş göndər" : "Yeni sifariş"}
        </button>
      </div>
    </td></tr>
  )
}

function KpiCard({ label, value, sub, gradient, icon: Icon, trend }: any) {
  if (gradient) return (
    <div className="relative p-5 rounded-3xl text-white overflow-hidden"
      style={{ background: gradient, boxShadow: "0 8px 32px rgba(239,68,68,0.25)" }}>
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-15" style={{ background: "white" }} />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full opacity-10" style={{ background: "white" }} />
      <div className="relative">
        <p className="text-xs font-medium opacity-75 mb-3 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold mb-1 tabular-nums">{value}</p>
        {sub && <p className="text-xs opacity-60">{sub}</p>}
      </div>
    </div>
  )
  return (
    <div className="p-5 rounded-3xl transition-all hover:scale-[1.01]"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(20px)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
        {Icon && <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-glass)" }}>
          <Icon size={14} style={{ color: "var(--text-secondary)" }} />
        </div>}
      </div>
      <p className="text-xl font-bold tabular-nums" style={{ color: trend === "up" ? "#22c55e" : trend === "down" ? "#ef4444" : "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  )
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
function exportToPDF(bookings: any[], clientBalances: Record<string, number>) {
  const date = new Date().toLocaleDateString("az-AZ", { day: "numeric", month: "long", year: "numeric" })
  const typeLabels: Record<string, string> = {
    bilet:"Aviabilet",otel:"Otel",tur:"Tur",kruiz:"Kruiz",
    transfer:"Transfer",bagaj:"Bagaj",yer_secimi:"Yer seçimi",cip:"CIP",sigorta:"Sığorta",viza:"Viza"
  }

  const uniqueClients = [...new Set(bookings.map((b: any) => b.clientName))]

  const clientSections = uniqueClients.map((clientName: any) => {
    const cb = bookings.filter((b: any) => b.clientName === clientName)
    const totalSell = cb.reduce((s: number, b: any) => s + b.sellPrice, 0)
    const totalPaid = cb.reduce((s: number, b: any) => s + (b.paidAmount ?? 0), 0)
    const totalDebt = cb
  .filter((b: any) => b.paymentStatus !== "paid")
  .reduce((s: number, b: any) => s + Math.max(0, b.sellPrice - (b.paidAmount ?? 0)), 0)
const isFullyPaid = totalDebt <= 0 && totalSell > 0 && cb.every((b: any) => b.paymentStatus === "paid")

    const rows = cb.map((b: any, i: number) => {
      const paid = b.paidAmount ?? 0
      const debt = Math.max(0, b.sellPrice - paid)
      const isPaid = b.paymentStatus === "paid"
      const isPartial = b.paymentStatus === "partial"

      const payBadge = isPaid
        ? `<span style="background:#dcfce7;color:#16a34a;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">✓ Ödənilib</span>`
        : isPartial
        ? `<span style="background:#fff7ed;color:#ea580c;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">⚡ Qismən (${paid.toFixed(2)} AZN)</span>`
        : `<span style="background:#fef2f2;color:#dc2626;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">✗ Ödənilməyib</span>`

      return `
      <tr style="border-bottom:1px solid #f0f0f0;background:${i%2===0?'white':'#fafafa'}">
        <td style="padding:10px 14px;font-size:13px;color:#374151">
          <div style="font-weight:600">${b.destination || "—"}</div>
          ${b.ticketNumber ? `<div style="font-size:11px;color:#6366f1;margin-top:2px;font-family:monospace">✈ ${b.ticketNumber}</div>` : ""}
          ${b.pnr ? `<div style="font-size:11px;color:#9ca3af;margin-top:1px">PNR: ${b.pnr}</div>` : ""}
        </td>
        <td style="padding:10px 14px">
          <span style="background:#eff6ff;color:#3b82f6;padding:2px 8px;border-radius:6px;font-size:11px">
            ${typeLabels[b.bookingType]??b.bookingType}
          </span>
        </td>
        <td style="padding:10px 14px;font-size:12px;color:#6b7280">${b.departureDate || "—"}</td>
        <td style="padding:10px 14px;font-size:14px;font-weight:700;text-align:right;color:#1f2937">${b.sellPrice.toFixed(2)} AZN</td>
        <td style="padding:10px 14px;text-align:center">${payBadge}</td>
        <td style="padding:10px 14px;text-align:right;font-weight:700;font-size:13px;color:${isPaid?'#16a34a':'#dc2626'}">
          ${isPaid ? `0.00 AZN` : `${debt.toFixed(2)} AZN`}
        </td>
      </tr>`
    }).join("")

    return `
      <div style="margin-bottom:28px;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;page-break-inside:avoid">
        <div style="background:#f8fafc;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e5e7eb">
          <div>
            <div style="font-size:16px;font-weight:700;color:#1f2937">${clientName}</div>
            ${cb[0]?.clientPhone ? `<div style="font-size:12px;color:#9ca3af;margin-top:2px">📞 ${cb[0].clientPhone}</div>` : ""}
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Ödəniş statusu</div>
            ${isFullyPaid
              ? `<div style="font-size:15px;font-weight:800;color:#16a34a;background:#dcfce7;padding:6px 14px;border-radius:10px">✓ Tam ödənilib</div>`
              : `<div style="font-size:15px;font-weight:800;color:#dc2626;background:#fef2f2;padding:6px 14px;border-radius:10px">✗ Borc: ${totalDebt.toFixed(2)} AZN</div>`
            }
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#1f2937">
              <th style="padding:10px 14px;text-align:left;color:white;font-size:11px;font-weight:600;text-transform:uppercase">Xidmət / Bilet №</th>
              <th style="padding:10px 14px;text-align:left;color:white;font-size:11px;font-weight:600;text-transform:uppercase">Növ</th>
              <th style="padding:10px 14px;text-align:left;color:white;font-size:11px;font-weight:600;text-transform:uppercase">Tarix</th>
              <th style="padding:10px 14px;text-align:right;color:white;font-size:11px;font-weight:600;text-transform:uppercase">Qiymət</th>
              <th style="padding:10px 14px;text-align:center;color:white;font-size:11px;font-weight:600;text-transform:uppercase">Status</th>
              <th style="padding:10px 14px;text-align:right;color:white;font-size:11px;font-weight:600;text-transform:uppercase">Borc</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background:#f8fafc;border-top:2px solid #e5e7eb">
              <td colspan="3" style="padding:12px 14px;font-size:13px;font-weight:600;color:#374151">Cəmi</td>
              <td style="padding:12px 14px;text-align:right;font-size:15px;font-weight:800;color:#1f2937">${totalSell.toFixed(2)} AZN</td>
              <td style="padding:12px 14px;text-align:center;font-size:13px;font-weight:700;color:#16a34a">${totalPaid.toFixed(2)} AZN ödənilib</td>
              <td style="padding:12px 14px;text-align:right;font-size:15px;font-weight:800;color:${isFullyPaid?'#16a34a':'#dc2626'}">${isFullyPaid?'0.00':totalDebt.toFixed(2)} AZN</td>
            </tr>
          </tfoot>
        </table>
      </div>`
  }).join("")

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Hesabat — itstour</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;color:#1f2937;background:white}
    .page{padding:40px;max-width:960px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:24px;border-bottom:3px solid #ef4444}
    .logo{font-size:32px;font-weight:bold;color:#ef4444}
    .logo span{color:#1f2937}
    .footer{margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af}
    @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo">its<span>tour</span></div>
      <div style="font-size:11px;color:#9ca3af;margin-top:3px">infinity tourism services</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:13px;color:#6b7280">Xidmətlər Hesabatı</div>
      <div style="font-size:20px;font-weight:bold;color:#1f2937;margin:4px 0">${date}</div>
      <div style="font-size:12px;color:#9ca3af">${bookings.length} sifariş · ${uniqueClients.length} müştəri</div>
    </div>
  </div>

  ${clientSections}

  <div class="footer">
    <p>itstour CRM • infinity tourism services • ${date}</p>
    <p style="margin-top:4px;color:#d1d5db">Powered by VARK TECHNOLOGIES</p>
  </div>
</div>
<script>
  window.onload = function() {
    // Download as PDF instead of print dialog
    const filename = "itstour-hesabat-${new Date().toISOString().slice(0,10)}.pdf"
    // Try to use print to PDF
    document.title = filename
    window.print()
  }
</script>
</body>
</html>`

  // Create blob and download directly
  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `itstour-hesabat-${new Date().toISOString().slice(0,10)}.html`
  a.click()
  URL.revokeObjectURL(url)

  // Also open in new tab for print/preview
  const win = window.open("","_blank")
  if(win){win.document.write(html);win.document.close()}
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SifarislerPage() {
  const { profile, canDelete } = useUserRole()
  const isReadOnly = profile?.role === "boss"
  const isManager = profile?.role === "menecer"
  const isBiletMenecer = profile?.role === "bilet_menecer"
  const { bookings, loading, fetchBookings, addBooking, updateBooking, deleteBooking } = useBookingsStore()
  const [modal, setModal] = useState<"create" | "edit" | null>(null)
  const [selected, setSelected] = useState<Booking | null>(null)
  const [filters, setFilters] = useState<BookingFilters>(EMPTY_FILTERS)
  const [activeTab, setActiveTab] = useState<BookingType | "all">("all")
  const [paymentStatus, setPaymentStatus] = useState("unpaid")
  const [paidAmount, setPaidAmount] = useState(0)
  const [isIata, setIsIata] = useState(false)
  const [ready, setReady] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [actionMenu, setActionMenu] = useState<string | null>(null)
  const [clientBalances, setClientBalances] = useState<Record<string, number>>({})
  const [viewModal, setViewModal] = useState<Booking | null>(null)

  useEffect(() => {
    fetchBookings()
    setReady(true)
    // Load client balances for PDF
    supabase.from("client_balances").select("client_name, balance").then(({ data }) => {
      if (data) {
        const map: Record<string, number> = {}
        data.forEach((b: any) => { map[b.client_name.toLowerCase()] = b.balance })
        setClientBalances(map)
      }
    })
  }, [])

  useEffect(() => {
    if (modal) {
      setPaymentStatus(selected?.paymentStatus ?? "unpaid")
      setPaidAmount(selected?.paidAmount ?? 0)
      setIsIata(selected?.isIata ?? false)
    }
  }, [modal, selected])


  // ─── Flight reminder notifications ───────────────────────────────────────
  useEffect(() => {
    if (!ready || !profile) return
    const canReceive = ["it_admin", "boss", "direktor", "menecer", "bilet_menecer"].includes(profile.role)
    if (!canReceive) return

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }

    function checkFlights() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
      const in5days = new Date(today); in5days.setDate(today.getDate() + 5)
      const tomorrowStr = tomorrow.toISOString().split("T")[0]
      const in5daysStr = in5days.toISOString().split("T")[0]

      const myBookings = bookings.filter(b =>
        b.status !== "cancelled" &&
        (profile?.role === "menecer" || profile?.role === "bilet_menecer"
          ? b.manager === profile?.fullName
          : true)
      )

      const tomorrow1 = myBookings.filter(b => b.departureDate === tomorrowStr)
      const in5days1 = myBookings.filter(b => b.departureDate === in5daysStr)

      function playAlert() {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination)
          osc.frequency.setValueAtTime(880, ctx.currentTime)
          osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15)
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3)
          gain.gain.setValueAtTime(0.3, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
        } catch {}
      }

      if (tomorrow1.length > 0) {
        const shown = sessionStorage.getItem(`notif_1d_${tomorrowStr}`)
        if (!shown) {
          playAlert()
          if (Notification.permission === "granted") {
            new Notification("🚨 Sabah uçuş!", {
              body: `${tomorrow1.length} müştərinin sabah uçuşu var: ${tomorrow1.slice(0,3).map(b => b.clientName).join(", ")}`,
              icon: "/favicon.ico"
            })
          }
          sessionStorage.setItem(`notif_1d_${tomorrowStr}`, "1")
        }
      }

      if (in5days1.length > 0) {
        const shown = sessionStorage.getItem(`notif_5d_${in5daysStr}`)
        if (!shown) {
          if (Notification.permission === "granted") {
            new Notification("⏰ 5 gün sonra uçuş", {
              body: `${in5days1.length} müştərinin 5 gün sonra uçuşu var: ${in5days1.slice(0,3).map(b => b.clientName).join(", ")}`,
              icon: "/favicon.ico"
            })
          }
          sessionStorage.setItem(`notif_5d_${in5daysStr}`, "1")
        }
      }
    }

    if (bookings.length > 0) checkFlights()
    const interval = setInterval(checkFlights, 60 * 60 * 1000) // check every hour
    return () => clearInterval(interval)
  }, [bookings, ready, profile])

  // ─── Flights tomorrow banner data ────────────────────────────────────────
  const flightsTomorrow = useMemo(() => {
    if (!profile) return []
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split("T")[0]
    return bookings.filter(b =>
      b.departureDate === tomorrowStr &&
      b.status !== "cancelled" &&
      (["menecer","bilet_menecer"].includes(profile.role) ? b.manager === profile.fullName : true)
    )
  }, [bookings, profile])

  const filtered = useMemo(() => bookings.filter(b => {
    if (isManager && b.manager !== profile?.fullName) return false
    if (isBiletMenecer && b.manager !== profile?.fullName) return false
    if (isBiletMenecer && b.bookingType !== "bilet") return false
    if (activeTab !== "all" && b.bookingType !== activeTab) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!b.clientName.toLowerCase().includes(q) && !b.destination.toLowerCase().includes(q) &&
        !(b.vendor ?? "").toLowerCase().includes(q) && !(b.ticketNumber ?? "").toLowerCase().includes(q) &&
        !(b.pnr ?? "").toLowerCase().includes(q)) return false
    }
    if (filters.status !== "all" && b.status !== filters.status) return false
    if (filters.manager && b.manager !== filters.manager) return false
    if (filters.iataPeriod !== "all" && b.iataPeriod !== filters.iataPeriod) return false
    if (filters.dateFrom && !b.departureDate.startsWith(filters.dateFrom)) return false
    return true
  }), [bookings, filters, activeTab, isManager, isBiletMenecer, profile])

  const totalRevenue = filtered.reduce((s, b) => s + b.sellPrice, 0)
  const totalProfit  = filtered.reduce((s, b) => s + b.profit, 0)
  const totalCost    = filtered.reduce((s, b) => s + b.buyPrice, 0)
  const paidCount    = filtered.filter(b => b.paymentStatus === "paid").length

  const typeCounts = BOOKING_TYPES.map(t => ({
    ...t,
    count: bookings.filter(b => b.bookingType === t.value && (!isManager || b.manager === profile?.fullName) && (!isBiletMenecer || b.manager === profile?.fullName)).length
  }))

  const activeFiltersCount = [
    filters.search, filters.status !== "all", filters.manager,
    filters.iataPeriod !== "all", filters.dateFrom
  ].filter(Boolean).length

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
      status: fd.get("status") as any,
      paymentStatus: paymentStatus as any,
      notes: fd.get("notes") as string,
      ticketNumber: fd.get("ticketNumber") as string,
      bookingReference: fd.get("bookingReference") as string,
      pnr: fd.get("pnr") as string,
      orderDate: fd.get("orderDate") as string,
      updated_by: profile?.fullName ?? "Admin",
      updated_by_role: profile?.role ?? "",
    }

    if (modal === "edit" && selected) {
      await updateBooking(selected.id, data)
    } else if (isManager || isBiletMenecer) {
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

  if (!ready || !profile) return (
    <div className="min-h-screen p-7" style={{ background: "var(--bg-primary)" }}>
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-xl animate-pulse" style={{ background: "var(--bg-glass)" }} />
          <div className="h-4 w-24 rounded-lg animate-pulse" style={{ background: "var(--bg-glass)" }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[1,2,3].map(i => <div key={i} className="h-24 rounded-3xl animate-pulse" style={{ background: "var(--bg-glass)" }} />)}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}
      onClick={() => actionMenu && setActionMenu(null)}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Sifarişlər</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{filtered.length}</span>
            <span> / {bookings.filter(b => !isManager || b.manager === profile.fullName).length} sifariş</span>
            {activeFiltersCount > 0 && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                {activeFiltersCount} filtr aktiv
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToPDF(filtered, clientBalances)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}>
            <FileText size={15} />
            ⬇ PDF / Çap et
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: showFilters ? "rgba(239,68,68,0.1)" : "var(--bg-card)", border: `1px solid ${showFilters ? "rgba(239,68,68,0.3)" : "var(--border-color)"}`, color: showFilters ? "#ef4444" : "var(--text-secondary)" }}>
            <SlidersHorizontal size={15} />
            Filtrlər
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                style={{ background: "#ef4444" }}>{activeFiltersCount}</span>
            )}
          </button>
          {!isReadOnly && (
            <button
              onClick={() => { setSelected(null); setModal("create") }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", boxShadow: "0 4px 20px rgba(239,68,68,0.3)" }}>
              <Plus size={15} />
              {isManager ? "Sifariş göndər" : "Yeni sifariş"}
            </button>
          )}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Ümumi gəlir" value={formatCurrency(totalRevenue)} sub={`${filtered.length} sifariş`}
          gradient="linear-gradient(135deg, #ef4444 0%, #f97316 100%)" />
        <KpiCard label="Alış xərci" value={formatCurrency(totalCost)} icon={TrendingDown} />
        <KpiCard label="Mənfəət" value={formatCurrency(totalProfit)} icon={TrendingUp}
          trend={totalProfit >= 0 ? "up" : "down"} />
        <KpiCard label="Ödənilib" value={`${paidCount}/${filtered.length}`}
          sub={`${filtered.length > 0 ? Math.round((paidCount/filtered.length)*100) : 0}% ödəniş`}
          icon={DollarSign} />
      </div>

      {/* Main Card */}
      <div className="rounded-3xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(20px)" }}>

        {/* Type tabs */}
        <div className="px-5 pt-4 pb-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="flex gap-1 overflow-x-auto pb-3 scrollbar-hide">
            <button onClick={() => setActiveTab("all")}
              className="flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-medium transition-all"
              style={{ background: activeTab === "all" ? "linear-gradient(135deg, #ef4444, #f97316)" : "transparent", color: activeTab === "all" ? "white" : "var(--text-secondary)", boxShadow: activeTab === "all" ? "0 4px 12px rgba(239,68,68,0.3)" : "none" }}>
              Hamısı ({bookings.filter(b => !isManager || b.manager === profile.fullName).length})
            </button>
            {typeCounts.map(t => {
              const Icon = t.Icon
              const active = activeTab === t.value
              return (
                <button key={t.value} onClick={() => setActiveTab(t.value as BookingType)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-medium transition-all"
                  style={{ background: active ? t.bg : "transparent", color: active ? t.color : "var(--text-secondary)", border: active ? `1px solid ${t.color}30` : "1px solid transparent" }}>
                  <Icon size={13} />{t.label}<span className="text-xs opacity-70">({t.count})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="relative">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input type="text" placeholder="Ad, bilet №, PNR, istiqamət axtar..."
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full py-2.5 pl-11 pr-4 text-sm rounded-2xl focus:outline-none transition-all"
              style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            {filters.search && (
              <button onClick={() => setFilters(f => ({ ...f, search: "" }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="px-5 py-4 flex flex-wrap gap-3" style={{ borderBottom: "1px solid var(--border-color)", background: "var(--bg-glass)" }}>
            {[
              { value: filters.status, onChange: (v: string) => setFilters(f => ({ ...f, status: v as any })), options: [{ v: "all", l: "Bütün statuslar" }, { v: "pending", l: "Gözləyir" }, { v: "confirmed", l: "Təsdiqlənib" }, { v: "completed", l: "Tamamlandı" }, { v: "cancelled", l: "Ləğv edildi" }] },
              { value: filters.iataPeriod, onChange: (v: string) => setFilters(f => ({ ...f, iataPeriod: v as any })), options: [{ v: "all", l: "Bütün periodlar" }, { v: "1-7", l: "1-7" }, { v: "8-15", l: "8-15" }, { v: "16-23", l: "16-23" }, { v: "24-31", l: "24-31" }] },
            ].map((sel, i) => (
              <select key={i} value={sel.value} onChange={e => sel.onChange(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl focus:outline-none"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                {sel.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            ))}
            <input type="month" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              className="px-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            {activeFiltersCount > 0 && (
              <button onClick={() => { setFilters(EMPTY_FILTERS); setShowFilters(false) }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl font-medium"
                style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                <X size={13} /> Təmizlə
              </button>
            )}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1300px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                {["Növ", "Müştəri", "İstiqamət", "Vendor", "Tarix", "Menecer", "Satış", "Qalıq", "Mənfəət", "Status", "Ödəniş", ""].map(h => (
                  <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3.5"
                    style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
              {!loading && filtered.length === 0 && <EmptyState onAdd={() => setModal("create")} isManager={isManager} />}
              {!loading && filtered.map(b => {
                const ti = getTypeInfo(b.bookingType)
                const Icon = ti.Icon
                const remaining = b.sellPrice - (b.paidAmount ?? 0)
                return (
                  <tr key={b.id} className="group transition-all" style={{ borderBottom: "1px solid var(--border-color)" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl w-fit" style={{ background: ti.bg, color: ti.color }}>
                          <Icon size={11} />{ti.label}
                        </span>
                        {b.isIata && <span className="text-xs font-bold px-2 py-0.5 rounded-lg w-fit text-white" style={{ background: "#3b82f6", fontSize: "10px" }}>IATA</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{b.clientName}</p>
                      {b.clientPhone && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{b.clientPhone}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium" style={{ color: "var(--text-primary)" }}>{b.destination}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{b.travelers} nəfər</p>
                    </td>
                    <td className="px-4 py-3.5">
                      {b.vendor ? <span className="text-xs font-medium px-2.5 py-1 rounded-xl" style={{ background: "var(--bg-glass)", color: "var(--text-secondary)" }}>{b.vendor}</span>
                        : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{formatDate(b.departureDate)}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>→ {formatDate(b.returnDate)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{b.manager?.split(" ")[0]}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{formatCurrency(b.sellPrice)}</p>
                      <p className="text-xs mt-0.5 tabular-nums text-green-500">{formatCurrency(b.paidAmount ?? 0)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {remaining > 0 ? <span className="font-semibold tabular-nums text-red-500">{formatCurrency(remaining)}</span>
                        : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-semibold tabular-nums ${b.profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {b.profit >= 0 ? "+" : ""}{formatCurrency(b.profit)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3.5"><PaymentBadge status={b.paymentStatus} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => setViewModal(b)}
                          className="p-2 rounded-xl transition-all hover:scale-110"
                          style={{ color: "#6366f1", background: "rgba(99,102,241,0.1)" }}>
                          <Eye size={13} />
                        </button>
                        {!isReadOnly && (
                          <button onClick={() => { setSelected(b); setModal("edit") }}
                            className="p-2 rounded-xl transition-all hover:scale-110"
                            style={{ color: "var(--text-muted)", background: "var(--bg-glass)" }}>
                            <Edit3 size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => { if (confirm("Silinsin?")) deleteBooking(b.id) }}
                            className="p-2 rounded-xl transition-all hover:scale-110"
                            style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}>
                            <Trash2 size={13} />
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

        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid var(--border-color)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{filtered.length} sifariş · Cəmi {formatCurrency(totalRevenue)}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Mənfəət: <span className={totalProfit >= 0 ? "text-green-500 font-semibold" : "text-red-500 font-semibold"}>{formatCurrency(totalProfit)}</span>
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", animation: "modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div className="flex items-center justify-between px-7 py-5" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  {modal === "edit" ? "Sifarişi redaktə et" : "Yeni sifariş"}
                </h2>
                {isManager && modal === "create" && (
                  <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: "#f59e0b" }}>
                    <Clock size={11} /> Sifariş təsdiq üçün göndəriləcək
                  </p>
                )}
              </div>
              <button onClick={() => { setModal(null); setSelected(null) }}
                className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:scale-110"
                style={{ background: "var(--bg-glass)", color: "var(--text-secondary)" }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-7 grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Sifariş növü *</label>
                <div className="grid grid-cols-5 gap-2">
                  {BOOKING_TYPES.map(t => {
                    const Icon = t.Icon
                    return (
                      <label key={t.value} className="cursor-pointer">
                        <input type="radio" name="bookingType" value={t.value}
                          defaultChecked={selected ? selected.bookingType === t.value : t.value === "bilet"}
                          className="sr-only peer" />
                        <div className="border-2 rounded-2xl p-3 text-center transition-all peer-checked:scale-[1.03]"
                          style={{ borderColor: "var(--border-color)", background: "var(--bg-glass)" }}>
                          <Icon size={18} className="mx-auto mb-1.5" style={{ color: t.color }} />
                          <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{t.label}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Vendor</label>
                <input name="vendor" defaultValue={selected?.vendor ?? ""} placeholder="Amadeus, Booking.com..."
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 cursor-pointer" onClick={() => setIsIata(!isIata)}>
                  <div className="relative w-11 h-6 rounded-full transition-all" style={{ background: isIata ? "#3b82f6" : "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
                    <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" style={{ transform: isIata ? "translateX(22px)" : "translateX(2px)" }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>IATA bileti</span>
                </label>
              </div>
              <div className="col-span-2 pt-2"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Müştəri məlumatları</p></div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Ad *</label>
                <ClientAutocomplete defaultValue={selected?.clientName ?? ""} bookings={bookings} ready={ready} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Telefon *</label>
                <input name="clientPhone" defaultValue={selected?.clientPhone} required
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>İstiqamət *</label>
                <input name="destination" defaultValue={selected?.destination} required
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Başlanğıc tarixi *</label>
                <input name="departureDate" type="date" required defaultValue={selected?.departureDate ?? new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Son tarix</label>
                <input name="returnDate" type="date" defaultValue={selected?.returnDate ?? new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Sifariş tarixi * (müştəri uçuş tarixi)</label>
                <input name="orderDate" type="date" required defaultValue={(selected as any)?.orderDate ?? new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--text-primary)" }} />
              </div>
              <div className="col-span-2 pt-2"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Maliyyə</p></div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Satış qiyməti (AZN) *</label>
                <input name="sellPrice" type="number" step="0.01" min="-99999" defaultValue={selected?.sellPrice ?? 0} required
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none font-semibold"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Alış qiyməti (AZN) *</label>
                <input name="buyPrice" type="number" step="0.01" min="-99999" defaultValue={selected?.buyPrice ?? 0} required
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Komissiya (%)</label>
                <input name="commissionPercent" type="number" step="0.1" min="0" max="100" defaultValue={selected?.commissionPercent ?? 5}
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Ödəniş statusu</label>
                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                  <option value="unpaid">Ödənilməyib</option>
                  <option value="partial">Qismən ödənilib</option>
                  <option value="paid">Tam ödənilib</option>
                </select>
              </div>
              {paymentStatus === "partial" && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#f97316" }}>Ödənilən məbləğ</label>
                  <input type="number" step="0.01" min="0" value={paidAmount} onChange={e => setPaidAmount(Number(e.target.value))}
                    className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                    style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.4)", color: "var(--text-primary)" }} />
                </div>
              )}
              <div className="col-span-2 pt-2"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>İdarəetmə</p></div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Menecer</label>
                <select name="manager" defaultValue={selected?.manager ?? MANAGERS[0]}
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                  {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>IATA period</label>
                <select name="iataPeriod" defaultValue={selected?.iataPeriod ?? "1-7"}
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                  {["1-7","8-15","16-23","24-31"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Status</label>
                <select name="status" defaultValue={selected?.status ?? "pending"}
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                  <option value="pending">Gözləyir</option>
                  <option value="confirmed">Təsdiqlənib</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="cancelled">Ləğv edildi</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Turistlər</label>
                <input name="travelers" type="number" min="1" defaultValue={selected?.travelers ?? 1}
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
              <div className="col-span-2 pt-2"><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Referans</p></div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Bilet №</label>
                <input name="ticketNumber" defaultValue={selected?.ticketNumber ?? ""} placeholder="157-1234567890"
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>PNR</label>
                <input name="pnr" defaultValue={selected?.pnr ?? ""} placeholder="XYZABC"
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Bron №</label>
                <input name="bookingReference" defaultValue={selected?.bookingReference ?? ""} placeholder="ABC123"
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
                <input name="clientEmail" type="email" defaultValue={selected?.clientEmail}
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Qeydlər</label>
                <textarea name="notes" rows={2} defaultValue={selected?.notes}
                  className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none resize-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
              </div>
              <div className="col-span-2 flex justify-end gap-3 pt-4" style={{ borderTop: "1px solid var(--border-color)" }}>
                <button type="button" onClick={() => { setModal(null); setSelected(null) }}
                  className="px-5 py-2.5 rounded-2xl text-sm font-medium transition-all hover:scale-[1.02]"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                  Ləğv et
                </button>
                <button type="submit"
                  className="px-6 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", boxShadow: "0 4px 16px rgba(239,68,68,0.3)" }}>
                  {modal === "edit" ? "Yadda saxla" : isManager ? "Təsdiqə göndər" : "Yarat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {viewModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          onClick={e => { if (e.target === e.currentTarget) setViewModal(null) }}>
          <div className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl mb-8"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: "1px solid var(--border-color)", background: `linear-gradient(135deg, ${getTypeInfo(viewModal.bookingType).bg}, transparent)` }}>
              <div className="flex items-center gap-3">
                {(() => { const ti = getTypeInfo(viewModal.bookingType); const Icon = ti.Icon; return <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: ti.bg }}><Icon size={18} style={{ color: ti.color }} /></div> })()}
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{viewModal.clientName}</h2>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{viewModal.destination}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isReadOnly && (
                  <button onClick={() => { setSelected(viewModal); setViewModal(null); setModal("edit") }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                    style={{ background: "var(--bg-glass)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
                    <Edit3 size={13} />Redaktə
                  </button>
                )}
                <button onClick={() => setViewModal(null)}
                  className="w-9 h-9 rounded-2xl flex items-center justify-center"
                  style={{ background: "var(--bg-glass)", color: "var(--text-secondary)" }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Status badges */}
              <div className="flex gap-2 flex-wrap">
                <StatusBadge status={viewModal.status} />
                <PaymentBadge status={viewModal.paymentStatus} />
                {viewModal.isIata && <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: "#3b82f6" }}>IATA</span>}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Calendar, label: "Sifariş tarixi", value: (viewModal as any).orderDate ? formatDate((viewModal as any).orderDate) : formatDate(viewModal.createdAt?.slice(0,10) ?? "") },
                  { icon: Calendar, label: "Uçuş tarixi", value: formatDate(viewModal.departureDate) },
                  { icon: Calendar, label: "Qayıdış tarixi", value: formatDate(viewModal.returnDate) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="p-3 rounded-2xl" style={{ background: "var(--bg-glass)" }}>
                    <div className="flex items-center gap-1.5 mb-1"><Icon size={12} style={{ color: "var(--text-muted)" }} /><p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p></div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{value || "—"}</p>
                  </div>
                ))}
              </div>

              {/* Client info */}
              <div className="p-4 rounded-2xl space-y-3" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Müştəri məlumatları</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: User, label: "Ad", value: viewModal.clientName },
                    { icon: Phone, label: "Telefon", value: viewModal.clientPhone || "—" },
                    { icon: Mail, label: "Email", value: viewModal.clientEmail || "—" },
                    { icon: MapPin, label: "İstiqamət", value: viewModal.destination },
                    { icon: User, label: "Menecer", value: viewModal.manager },
                    { icon: User, label: "Vendor", value: viewModal.vendor || "—" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-2">
                      <Icon size={13} className="mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                      <div><p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p><p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{value}</p></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial info */}
              <div className="p-4 rounded-2xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Maliyyə</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Satış", value: formatCurrency(viewModal.sellPrice), color: "var(--text-primary)" },
                    { label: "Alış", value: formatCurrency(viewModal.buyPrice), color: "#ef4444" },
                    { label: "Ödənilib", value: formatCurrency(viewModal.paidAmount ?? 0), color: "#22c55e" },
                    { label: "Mənfəət", value: formatCurrency(viewModal.profit), color: viewModal.profit >= 0 ? "#22c55e" : "#ef4444" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="p-3 rounded-xl text-center" style={{ background: "var(--bg-secondary)" }}>
                      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
                      <p className="text-sm font-bold tabular-nums" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reference info */}
              {(viewModal.ticketNumber || viewModal.pnr || viewModal.bookingReference) && (
                <div className="p-4 rounded-2xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Referans</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Bilet №", value: viewModal.ticketNumber },
                      { label: "PNR", value: viewModal.pnr },
                      { label: "Bron №", value: viewModal.bookingReference },
                    ].filter(r => r.value).map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
                        <p className="text-sm font-mono font-semibold" style={{ color: "var(--text-primary)" }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewModal.notes && (
                <div className="p-4 rounded-2xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Qeydlər</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{viewModal.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ClientAutocomplete({ defaultValue, bookings, ready }: { defaultValue: string, bookings: any[], ready: boolean }) {
  const [value, setValue] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [show, setShow] = useState(false)
  const uniqueClients = useMemo(() => [...new Set(bookings.map(b => b.clientName))].filter(Boolean), [bookings])

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
        onBlur={() => setTimeout(() => setShow(false), 150)} required
        className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
        style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
      {show && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1.5 py-1 rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
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