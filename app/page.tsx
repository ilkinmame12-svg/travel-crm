"use client"

import { useEffect, useState, useMemo } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { usePaymentsStore } from "@/lib/store/paymentsStore"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { supabase } from "@/lib/supabase"
import { formatCurrency } from "@/lib/calculations"
import {
  TrendingUp, TrendingDown, DollarSign, Users, Clock,
  ArrowUpRight, Trophy, AlertCircle, CheckCircle2, Star,
  Sparkles, Wallet, ArrowRight, Activity
} from "lucide-react"

// ─── Design tokens ─────────────────────────────────────────────────────────
const card = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-color)",
  backdropFilter: "blur(24px)",
  borderRadius: "24px",
}

const MEDAL_GRADIENTS = [
  "linear-gradient(135deg, #f59e0b, #fbbf24)",
  "linear-gradient(135deg, #94a3b8, #e2e8f0)",
  "linear-gradient(135deg, #b45309, #d97706)",
]

const CLIENT_GRADIENTS = [
  "linear-gradient(135deg, #3b82f6, #06b6d4)",
  "linear-gradient(135deg, #8b5cf6, #6366f1)",
  "linear-gradient(135deg, #10b981, #34d399)",
]

// ─── Skeleton ───────────────────────────────────────────────────────────────
function Skeleton({ className = "", style = {} }: { className?: string; style?: any }) {
  return (
    <div className={`animate-pulse rounded-2xl ${className}`}
      style={{ background: "var(--bg-glass)", ...style }} />
  )
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>
      <div className="mb-7 space-y-2">
        <Skeleton style={{ height: 28, width: 200 }} />
        <Skeleton style={{ height: 16, width: 160 }} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[1,2,3,4].map(i => <Skeleton key={i} style={{ height: 110 }} />)}
      </div>
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[1,2,3].map(i => <Skeleton key={i} style={{ height: 88 }} />)}
      </div>
      <div className="grid grid-cols-2 gap-5 mb-5">
        {[1,2].map(i => <Skeleton key={i} style={{ height: 280 }} />)}
      </div>
      <Skeleton style={{ height: 320 }} />
    </div>
  )
}

// ─── Reusable widgets ───────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, href, hrefLabel = "Hamısı →", iconColor = "#6366f1", iconBg = "rgba(99,102,241,0.1)" }: any) {
  return (
    <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={14} style={{ color: iconColor }} />
        </div>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
      </div>
      {href && (
        <a href={href} className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-xl transition-all hover:scale-[1.03]"
          style={{ background: "var(--bg-glass)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
          {hrefLabel} <ArrowRight size={11} />
        </a>
      )}
    </div>
  )
}

function RankRow({ item, index, gradients, valueKey = "revenue", subKey = "count", subSuffix = " sifariş", formatVal = true }: any) {
  const val = item[valueKey]
  const sub = item[subKey]
  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-2xl transition-all hover:scale-[1.01]"
      style={{ background: "transparent" }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
      <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: index < 3 ? gradients[index] : "var(--bg-glass)", color: index < 3 ? "white" : "var(--text-secondary)" }}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{item.name}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sub}{subSuffix}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
          {formatVal ? formatCurrency(val) : val}
        </p>
        {item.profit !== undefined && (
          <p className="text-xs tabular-nums" style={{ color: "#22c55e" }}>{formatCurrency(item.profit)}</p>
        )}
      </div>
    </div>
  )
}

function CashRow({ t }: { t: any }) {
  const isAdd = t.operation === "add"
  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-2xl transition-all"
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
      <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg font-bold"
        style={{ background: isAdd ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: isAdd ? "#22c55e" : "#ef4444" }}>
        {isAdd ? "↑" : "↓"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{t.reason || "Səbəb yoxdur"}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {new Date(t.created_at).toLocaleDateString("az-AZ", { day: "numeric", month: "short" })} · {t.currency}
        </p>
      </div>
      <p className={`text-sm font-bold tabular-nums flex-shrink-0 ${isAdd ? "text-green-500" : "text-red-500"}`}>
        {isAdd ? "+" : "−"}{t.amount} {t.currency}
      </p>
    </div>
  )
}

function DebtRow({ b, i }: { b: any; i: number }) {
  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-2xl transition-all"
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
      <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
        style={{ background: `rgba(239,68,68,${0.15 - i * 0.02})`, color: "#ef4444" }}>
        {i + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{b.clientName}</p>
        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{b.destination}</p>
      </div>
      <p className="text-sm font-bold tabular-nums text-red-500 flex-shrink-0">{formatCurrency(b.remaining)}</p>
    </div>
  )
}


// ─── Flight Alert Overlay ────────────────────────────────────────────────────
function FlightAlertOverlay({ flights, onClose }: { flights: any[]; onClose: () => void }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Play dramatic sound
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const notes = [523, 659, 784, 1047, 784, 659, 523]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = "sine"
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.2)
        osc.start(ctx.currentTime + i * 0.12)
        osc.stop(ctx.currentTime + i * 0.12 + 0.25)
      })
    } catch {}

    // Auto close after 8 seconds
    const t = setTimeout(() => { setVisible(false); setTimeout(onClose, 500) }, 8000)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const dateStr = tomorrow.toLocaleDateString("az-AZ", { day: "numeric", month: "long" })

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", animation: "fadeIn 0.3s ease" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes planeFly { 0% { transform: translateX(-100px) translateY(20px) rotate(-5deg); opacity: 0 } 30% { opacity: 1 } 100% { transform: translateX(calc(100vw + 100px)) translateY(-20px) rotate(5deg); opacity: 0 } }
        @keyframes pulse-red { 0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.6) } 50% { box-shadow: 0 0 0 30px rgba(239,68,68,0) } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes countDown { from { width: 100% } to { width: 0% } }
      `}</style>

      {/* Animated plane flying across */}
      <div style={{ position: "absolute", top: "20%", animation: "planeFly 3s ease-in-out infinite", fontSize: "60px", pointerEvents: "none" }}>✈️</div>

      {/* Main alert card */}
      <div style={{ animation: "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)", maxWidth: 480, width: "90%", position: "relative" }}>
        <div className="rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1a0000, #2d0000)", border: "2px solid rgba(239,68,68,0.5)", animation: "pulse-red 2s ease infinite" }}>

          {/* Header */}
          <div className="p-6 text-center" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.3), rgba(249,115,22,0.2))" }}>
            <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 8 }}>🚨</div>
            <h1 style={{ color: "white", fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px", textShadow: "0 0 20px rgba(239,68,68,0.8)" }}>
              TƏCİLİ XATIRLATMA!
            </h1>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 4 }}>
              Sabah — {dateStr} — {flights.length} müştərinin uçuşu var
            </p>
          </div>

          {/* Flight list */}
          <div className="p-5 space-y-3">
            {flights.slice(0, 4).map((b: any, i: number) => (
              <div key={b.id} className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", animation: `slideUp ${0.4 + i * 0.1}s cubic-bezier(0.34,1.56,0.64,1)` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: "rgba(239,68,68,0.2)" }}>✈</div>
                <div className="flex-1 min-w-0">
                  <p style={{ color: "white", fontWeight: 700, fontSize: 14 }}>{b.clientName}</p>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{b.destination} · {b.manager?.split(" ")[0]}</p>
                </div>
                <div className="text-right">
                  <p style={{ color: b.paymentStatus === "paid" ? "#4ade80" : "#fbbf24", fontSize: 11, fontWeight: 600 }}>
                    {b.paymentStatus === "paid" ? "✓ Ödənilib" : "⚠ Ödənilməyib"}
                  </p>
                </div>
              </div>
            ))}
            {flights.length > 4 && (
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center" }}>
                +{flights.length - 4} daha müştəri
              </p>
            )}
          </div>

          {/* Countdown bar + close */}
          <div className="px-5 pb-5">
            <div style={{ height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 9999, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg, #ef4444, #f97316)", borderRadius: 9999, animation: "countDown 8s linear forwards" }} />
            </div>
            <div className="flex gap-2">
              <a href="/bookings"
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white text-center transition-all hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", boxShadow: "0 4px 20px rgba(239,68,68,0.5)" }}>
                Sifarişlərə bax →
              </a>
              <button onClick={() => { setVisible(false); setTimeout(onClose, 300) }}
                className="px-4 py-3 rounded-2xl text-sm font-medium"
                style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Bağla
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Flight Widget (Dashboard card) ─────────────────────────────────────────
function FlightWidget({ bookings, profile }: { bookings: any[]; profile: any }) {
  const [showAlert, setShowAlert] = useState(false)
  const [alertShown, setAlertShown] = useState(false)

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split("T")[0]
  const in5days = new Date(); in5days.setDate(in5days.getDate() + 5)
  const in5daysStr = in5days.toISOString().split("T")[0]
  const todayStr = new Date().toISOString().split("T")[0]

  const flightsTomorrow = bookings.filter(b =>
    b.departureDate === tomorrowStr && b.status !== "cancelled" &&
    (["menecer","bilet_menecer"].includes(profile?.role) ? b.manager === profile?.fullName : true)
  )
  const flightsIn5Days = bookings.filter(b =>
    b.departureDate === in5daysStr && b.status !== "cancelled" &&
    (["menecer","bilet_menecer"].includes(profile?.role) ? b.manager === profile?.fullName : true)
  )
  const flightsToday = bookings.filter(b =>
    b.departureDate === todayStr && b.status !== "cancelled" &&
    (["menecer","bilet_menecer"].includes(profile?.role) ? b.manager === profile?.fullName : true)
  )

  useEffect(() => {
    if (flightsTomorrow.length > 0 && !alertShown) {
      const key = `alert_shown_${tomorrowStr}`
      if (!sessionStorage.getItem(key)) {
        setTimeout(() => { setShowAlert(true); setAlertShown(true) }, 1500)
        sessionStorage.setItem(key, "1")
      }
    }
  }, [flightsTomorrow.length])

  if (flightsTomorrow.length === 0 && flightsIn5Days.length === 0 && flightsToday.length === 0) return null

  return (
    <>
      {showAlert && flightsTomorrow.length > 0 && (
        <FlightAlertOverlay flights={flightsTomorrow} onClose={() => setShowAlert(false)} />
      )}

      <div className="mb-5 rounded-3xl overflow-hidden" style={{ border: "2px solid rgba(239,68,68,0.3)", background: "var(--bg-card)" }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(249,115,22,0.08))", borderBottom: "1px solid rgba(239,68,68,0.15)" }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 24 }}>✈️</span>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Uçuş Xatırlatmaları</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Yaxınlaşan uçuşlar</p>
            </div>
          </div>
          {flightsTomorrow.length > 0 && (
            <button onClick={() => setShowAlert(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", boxShadow: "0 4px 12px rgba(239,68,68,0.4)" }}>
              🚨 {flightsTomorrow.length} sabah
            </button>
          )}
        </div>

        <div className="p-4 space-y-2">
          {flightsToday.length > 0 && (
            <div className="p-3 rounded-2xl flex items-center gap-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <span className="text-xl">🔴</span>
              <div className="flex-1">
                <p className="text-xs font-bold" style={{ color: "#ef4444" }}>BU GÜN UÇUŞ — {flightsToday.length} müştəri</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{flightsToday.slice(0,3).map((b:any) => b.clientName).join(" · ")}</p>
              </div>
            </div>
          )}
          {flightsTomorrow.length > 0 && (
            <div className="p-3 rounded-2xl flex items-center gap-3" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)" }}>
              <span className="text-xl">🟠</span>
              <div className="flex-1">
                <p className="text-xs font-bold" style={{ color: "#f97316" }}>SABAH UÇUŞ — {flightsTomorrow.length} müştəri</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{flightsTomorrow.slice(0,3).map((b:any) => b.clientName).join(" · ")}</p>
              </div>
            </div>
          )}
          {flightsIn5Days.length > 0 && (
            <div className="p-3 rounded-2xl flex items-center gap-3" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
              <span className="text-xl">🟡</span>
              <div className="flex-1">
                <p className="text-xs font-bold" style={{ color: "#f59e0b" }}>5 GÜN SONRA — {flightsIn5Days.length} müştəri</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{flightsIn5Days.slice(0,3).map((b:any) => b.clientName).join(" · ")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Manager Dashboard ──────────────────────────────────────────────────────
function ManagerDashboard({ bookings, profile }: { bookings: any[]; profile: any }) {
  const myBookings = bookings.filter(b => b.manager === profile?.fullName)
  const myRevenue    = myBookings.reduce((s, b) => s + b.sellPrice, 0)
  const myProfit     = myBookings.reduce((s, b) => s + b.profit, 0)
  const myCommission = myBookings.reduce((s, b) => s + b.commissionAmount, 0)
  const myPending    = myBookings.filter(b => b.status === "pending").length
  const myUnpaid     = myBookings.filter(b => b.paymentStatus !== "paid").length
  const myConfirmed  = myBookings.filter(b => b.status === "confirmed").length
  const recent       = [...myBookings].slice(0, 8)

  const topClients = useMemo(() => {
    const stats = myBookings.reduce((acc: any, b) => {
      if (!acc[b.clientName]) acc[b.clientName] = { revenue: 0, count: 0 }
      acc[b.clientName].revenue += b.sellPrice; acc[b.clientName].count++
      return acc
    }, {})
    return Object.entries(stats).map(([name, s]: any) => ({ name, ...s })).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5)
  }, [myBookings])

  const myDebts = useMemo(() =>
    myBookings.filter(b => b.paymentStatus !== "paid" && b.sellPrice - (b.paidAmount ?? 0) > 0)
      .map(b => ({ ...b, remaining: b.sellPrice - (b.paidAmount ?? 0) }))
      .sort((a: any, b: any) => b.remaining - a.remaining).slice(0, 5),
    [myBookings])

  const firstName = profile?.fullName?.split(" ")[0]
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? "Sabahınız xeyir" : hour < 18 ? "Günortanız xeyir" : "Axşamınız xeyir"

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>

      {/* Header */}
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} style={{ color: "#f59e0b" }} />
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {greeting}, {firstName}! 👋
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {/* Hero card */}
        <div className="col-span-2 lg:col-span-1 p-6 text-white relative overflow-hidden rounded-3xl"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 8px 32px rgba(99,102,241,0.3)" }}>
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-15" style={{ background: "white" }} />
          <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full opacity-10" style={{ background: "white" }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold opacity-75 uppercase tracking-wider">Mənim sifarişlərim</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                <Star size={14} />
              </div>
            </div>
            <p className="text-4xl font-bold mb-1 tabular-nums">{myBookings.length}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <CheckCircle2 size={12} className="opacity-70" />
              <p className="text-xs opacity-70">{myConfirmed} təsdiqlənib</p>
            </div>
          </div>
        </div>

        {[
          { label: "Satış həcmim", value: formatCurrency(myRevenue), sub: "Ümumi satış", Icon: TrendingUp, color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
          { label: "Komissiyam", value: formatCurrency(myCommission), sub: "Cəmi qazanc", Icon: DollarSign, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
          { label: "Mənfəət", value: formatCurrency(myProfit), sub: "Şirkət üçün", Icon: ArrowUpRight, color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
        ].map(({ label, value, sub, Icon, color, bg }) => (
          <div key={label} className="p-5 rounded-3xl transition-all hover:scale-[1.01]" style={card}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <p className="text-xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Gözləyir", value: myPending, Icon: Clock, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
          { label: "Təsdiqlənib", value: myConfirmed, Icon: CheckCircle2, color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
          { label: "Ödənilməyib", value: myUnpaid, Icon: AlertCircle, color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
        ].map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="p-5 rounded-3xl flex items-center gap-4 transition-all hover:scale-[1.01]" style={card}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="rounded-3xl overflow-hidden" style={card}>
          <SectionHeader icon={Users} title="Mənim Müştərilərim" iconColor="#3b82f6" iconBg="rgba(59,130,246,0.12)" />
          <div className="p-4 space-y-1">
            {topClients.length === 0
              ? <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>Hələ müştəri yoxdur</p>
              : topClients.map((c: any, i: number) => <RankRow key={c.name} item={c} index={i} gradients={CLIENT_GRADIENTS} />)
            }
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden" style={card}>
          <SectionHeader icon={AlertCircle} title="Mənim Borclarım" href="/debts"
            iconColor="#ef4444" iconBg="rgba(239,68,68,0.12)" />
          <div className="p-4 space-y-1">
            {myDebts.length === 0
              ? <div className="flex flex-col items-center py-6 gap-2"><CheckCircle2 size={24} className="text-green-500" /><p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Borc yoxdur 🎉</p></div>
              : myDebts.map((b: any, i: number) => <DebtRow key={b.id} b={b} i={i} />)
            }
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="rounded-3xl overflow-hidden" style={card}>
        <SectionHeader icon={Activity} title="Son Sifarişlərim" href="/bookings"
          iconColor="#ef4444" iconBg="rgba(239,68,68,0.12)" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                {["Müştəri", "İstiqamət", "Tarix", "Ödəniş", "Status"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-6 py-3.5" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((b: any) => (
                <tr key={b.id} className="transition-all" style={{ borderBottom: "1px solid var(--border-color)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <td className="px-6 py-3.5">
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{b.clientName}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{b.clientPhone}</p>
                  </td>
                  <td className="px-6 py-3.5 max-w-xs truncate" style={{ color: "var(--text-secondary)" }}>{b.destination}</td>
                  <td className="px-6 py-3.5 text-xs" style={{ color: "var(--text-secondary)" }}>{b.departureDate}</td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
                      background: b.paymentStatus === "paid" ? "rgba(34,197,94,0.12)" : b.paymentStatus === "partial" ? "rgba(249,115,22,0.12)" : "rgba(239,68,68,0.12)",
                      color: b.paymentStatus === "paid" ? "#22c55e" : b.paymentStatus === "partial" ? "#f97316" : "#ef4444"
                    }}>
                      {b.paymentStatus === "paid" ? "Ödənilib" : b.paymentStatus === "partial" ? "Qismən" : "Ödənilməyib"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
                      background: b.status === "confirmed" ? "rgba(34,197,94,0.12)" : b.status === "pending" ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.12)",
                      color: b.status === "confirmed" ? "#22c55e" : b.status === "pending" ? "#f59e0b" : "#6366f1"
                    }}>
                      {b.status === "confirmed" ? "Təsdiqlənib" : b.status === "pending" ? "Gözləyir" : "Tamamlandı"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Admin Dashboard ────────────────────────────────────────────────────────
function AdminDashboard({ bookings, payments, cashHistory, profile }: { bookings: any[]; payments: any[]; cashHistory: any[]; profile?: any }) {
  const [managerPeriod, setManagerPeriod] = useState<"week" | "month" | "year">("month")

  const totalRevenue    = bookings.reduce((s, b) => s + b.sellPrice, 0)
  const totalCost       = bookings.reduce((s, b) => s + b.buyPrice, 0)
  const totalProfit     = bookings.reduce((s, b) => s + b.profit, 0)
  const totalCommission = bookings.reduce((s, b) => s + b.commissionAmount, 0)
  const pending         = bookings.filter(b => b.status === "pending").length
  const unpaid          = bookings.filter(b => b.paymentStatus !== "paid").length
  const margin          = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0
  const recent          = [...bookings].slice(0, 8)

  const now = new Date()

  const filteredByPeriod = useMemo(() => bookings.filter(b => {
    const d = new Date(b.departureDate)
    if (managerPeriod === "week") {
      const wa = new Date(now); wa.setDate(now.getDate() - 7)
      return d >= wa
    }
    if (managerPeriod === "month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }
    return d.getFullYear() === now.getFullYear()
  }), [bookings, managerPeriod])

  const topManagers = useMemo(() => {
    const stats = filteredByPeriod.reduce((acc: any, b) => {
      if (!b.manager) return acc
      if (!acc[b.manager]) acc[b.manager] = { revenue: 0, profit: 0, count: 0 }
      acc[b.manager].revenue += b.sellPrice; acc[b.manager].profit += b.profit; acc[b.manager].count++
      return acc
    }, {})
    return Object.entries(stats).map(([name, s]: any) => ({ name, ...s })).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5)
  }, [filteredByPeriod])

  const topClients = useMemo(() => {
    const stats = bookings.reduce((acc: any, b) => {
      if (!acc[b.clientName]) acc[b.clientName] = { revenue: 0, count: 0 }
      acc[b.clientName].revenue += b.sellPrice; acc[b.clientName].count++
      return acc
    }, {})
    return Object.entries(stats).map(([name, s]: any) => ({ name, ...s })).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5)
  }, [bookings])

  const topDebts = useMemo(() =>
    bookings.filter(b => b.paymentStatus !== "paid" && b.sellPrice - (b.paidAmount ?? 0) > 0)
      .map(b => ({ ...b, remaining: b.sellPrice - (b.paidAmount ?? 0) }))
      .sort((a: any, b: any) => b.remaining - a.remaining).slice(0, 5),
    [bookings])

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={card}>
          <Activity size={14} style={{ color: "#22c55e" }} />
          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{bookings.length} sifariş</span>
        </div>
      </div>

      <FlightWidget bookings={bookings} profile={profile} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="col-span-2 lg:col-span-1 p-6 text-white relative overflow-hidden rounded-3xl"
          style={{ background: "linear-gradient(135deg, #11998e, #38ef7d)", boxShadow: "0 8px 32px rgba(17,153,142,0.3)" }}>
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-15" style={{ background: "white" }} />
          <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full opacity-10" style={{ background: "white" }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold opacity-75 uppercase tracking-wider">Ümumi gəlir</p>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                <ArrowUpRight size={13} />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums mb-1">{formatCurrency(totalRevenue)}</p>
            <div className="flex items-center gap-1 mt-2 opacity-75">
              <TrendingUp size={11} />
              <p className="text-xs">Marja: {margin}%</p>
            </div>
          </div>
        </div>

        {[
          { label: "Alış xərci", value: formatCurrency(totalCost), sub: "Bilet və tur", Icon: TrendingDown, color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
          { label: "Mənfəət", value: formatCurrency(totalProfit), sub: `${margin}% marja`, Icon: TrendingUp, color: totalProfit >= 0 ? "#22c55e" : "#ef4444", bg: totalProfit >= 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)" },
          { label: "Komissiya", value: formatCurrency(totalCommission), sub: "Cəmi", Icon: DollarSign, color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
        ].map(({ label, value, sub, Icon, color, bg }) => (
          <div key={label} className="p-5 rounded-3xl transition-all hover:scale-[1.01]" style={card}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <p className="text-xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Cəmi sifarişlər", value: bookings.length, Icon: Users, color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
          { label: "Gözləyir", value: pending, Icon: Clock, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
          { label: "Ödənilməyib", value: unpaid, Icon: AlertCircle, color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
        ].map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="p-5 rounded-3xl flex items-center gap-4 transition-all hover:scale-[1.01]" style={card}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top Managers + Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Top Managers with period filter */}
        <div className="rounded-3xl overflow-hidden" style={card}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)" }}>
                <Trophy size={14} style={{ color: "#f59e0b" }} />
              </div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Top Menecerlər</h2>
            </div>
            <div className="flex gap-1">
              {[{ v: "week", l: "Həftə" }, { v: "month", l: "Ay" }, { v: "year", l: "İl" }].map(p => (
                <button key={p.v} onClick={() => setManagerPeriod(p.v as any)}
                  className="px-2.5 py-1 rounded-xl text-xs font-medium transition-all hover:scale-[1.03]"
                  style={{
                    background: managerPeriod === p.v ? "linear-gradient(135deg, #ef4444, #f97316)" : "var(--bg-glass)",
                    color: managerPeriod === p.v ? "white" : "var(--text-secondary)",
                    border: "1px solid var(--border-color)",
                    boxShadow: managerPeriod === p.v ? "0 2px 8px rgba(239,68,68,0.3)" : "none",
                  }}>
                  {p.l}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 space-y-1">
            {topManagers.length === 0
              ? <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>Bu dövrdə sifariş yoxdur</p>
              : topManagers.map((m: any, i: number) => <RankRow key={m.name} item={m} index={i} gradients={MEDAL_GRADIENTS} />)
            }
          </div>
        </div>

        {/* Top Clients */}
        <div className="rounded-3xl overflow-hidden" style={card}>
          <SectionHeader icon={Users} title="Top Müştərilər" iconColor="#3b82f6" iconBg="rgba(59,130,246,0.12)" />
          <div className="p-4 space-y-1">
            {topClients.map((c: any, i: number) => <RankRow key={c.name} item={c} index={i} gradients={CLIENT_GRADIENTS} />)}
          </div>
        </div>
      </div>

      {/* Cash + Debts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="rounded-3xl overflow-hidden" style={card}>
          <SectionHeader icon={Wallet} title="Son Kassa Əməliyyatları" href="/finances" hrefLabel="Maliyyə →"
            iconColor="#6366f1" iconBg="rgba(99,102,241,0.12)" />
          <div className="p-4 space-y-1">
            {cashHistory.length === 0
              ? <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>Əməliyyat yoxdur</p>
              : cashHistory.map((t: any) => <CashRow key={t.id} t={t} />)
            }
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden" style={card}>
          <SectionHeader icon={AlertCircle} title="Ən Böyük Borclar" href="/debts"
            iconColor="#ef4444" iconBg="rgba(239,68,68,0.12)" />
          <div className="p-4 space-y-1">
            {topDebts.length === 0
              ? <div className="flex flex-col items-center py-6 gap-2"><CheckCircle2 size={24} className="text-green-500" /><p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Borc yoxdur 🎉</p></div>
              : topDebts.map((b: any, i: number) => <DebtRow key={b.id} b={b} i={i} />)
            }
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="rounded-3xl overflow-hidden" style={card}>
        <SectionHeader icon={Activity} title="Son Sifarişlər" href="/bookings"
          iconColor="#ef4444" iconBg="rgba(239,68,68,0.12)" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                {["Müştəri", "İstiqamət", "Satış", "Mənfəət", "Ödəniş", "Status"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-6 py-3.5"
                    style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((b: any) => (
                <tr key={b.id} className="transition-all" style={{ borderBottom: "1px solid var(--border-color)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <td className="px-6 py-3.5">
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{b.clientName}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{b.clientPhone}</p>
                  </td>
                  <td className="px-6 py-3.5 max-w-xs truncate" style={{ color: "var(--text-secondary)" }}>{b.destination}</td>
                  <td className="px-6 py-3.5 font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{formatCurrency(b.sellPrice)}</td>
                  <td className="px-6 py-3.5">
                    <span className={`font-semibold tabular-nums ${b.profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {b.profit >= 0 ? "+" : ""}{formatCurrency(b.profit)}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
                      background: b.paymentStatus === "paid" ? "rgba(34,197,94,0.12)" : b.paymentStatus === "partial" ? "rgba(249,115,22,0.12)" : "rgba(239,68,68,0.12)",
                      color: b.paymentStatus === "paid" ? "#22c55e" : b.paymentStatus === "partial" ? "#f97316" : "#ef4444"
                    }}>
                      {b.paymentStatus === "paid" ? "Ödənilib" : b.paymentStatus === "partial" ? "Qismən" : "Ödənilməyib"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{
                      background: b.status === "confirmed" ? "rgba(34,197,94,0.12)" : b.status === "pending" ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.12)",
                      color: b.status === "confirmed" ? "#22c55e" : b.status === "pending" ? "#f59e0b" : "#6366f1"
                    }}>
                      {b.status === "confirmed" ? "Təsdiqlənib" : b.status === "pending" ? "Gözləyir" : "Tamamlandı"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recent.length > 0 && (
          <div className="px-6 py-3 flex justify-center" style={{ borderTop: "1px solid var(--border-color)" }}>
            <a href="/bookings" className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-xl transition-all hover:scale-[1.02]"
              style={{ color: "var(--text-secondary)", background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
              Bütün sifarişlərə bax <ArrowRight size={12} />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Root ───────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const { payments, fetchPayments } = usePaymentsStore()
  const { profile } = useUserRole()
  const [cashHistory, setCashHistory] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchBookings()
    fetchPayments()
    supabase.from("cash_transactions").select("*").order("created_at", { ascending: false }).limit(5)
      .then(({ data }) => { setCashHistory(data ?? []); setLoaded(true) })
  }, [])

  if (!profile) return <DashboardSkeleton />

  if (profile.role === "menecer" || profile.role === "bilet_menecer") {
    return <ManagerDashboard bookings={bookings} profile={profile} />
  }

  return <AdminDashboard bookings={bookings} payments={payments} cashHistory={cashHistory} profile={profile} />
}