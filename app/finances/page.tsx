"use client"
import { supabase } from "@/lib/supabase"
import { useState, useEffect, useMemo } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { usePaymentsStore } from "@/lib/store/paymentsStore"
import { formatCurrency } from "@/lib/calculations"
import {
  TrendingUp, TrendingDown, DollarSign, Plus, Trash2,
  Wallet, ArrowUpRight, X, Receipt, CreditCard, BarChart3,
  CheckCircle2, Clock, AlertCircle
} from "lucide-react"

interface Expense { id: string; name: string; amount: number; category: string; date: string }

// ─── Design tokens ────────────────────────────────────────────────────────
const card = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-color)",
  backdropFilter: "blur(24px)",
  borderRadius: "24px",
}
const modalStyle = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border-color)",
  borderRadius: "28px",
}
const input = {
  background: "var(--bg-glass)",
  border: "1px solid var(--border-color)",
  color: "var(--text-primary)",
  borderRadius: "14px",
  padding: "11px 16px",
  fontSize: "14px",
  outline: "none",
  width: "100%",
  transition: "border-color 0.2s",
}

const EXPENSE_CATEGORIES = ["Ofis", "Kommunal", "Marketing", "Maaş", "Digər"]

// ─── Skeleton ─────────────────────────────────────────────────────────────
function Skeleton({ style = {} }: { style?: any }) {
  return <div className="animate-pulse rounded-2xl" style={{ background: "var(--bg-glass)", ...style }} />
}

// ─── Tab Button ────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all hover:scale-[1.02]"
      style={{
        background: active ? "linear-gradient(135deg, #ef4444, #f97316)" : "transparent",
        color: active ? "white" : "var(--text-secondary)",
        boxShadow: active ? "0 4px 12px rgba(239,68,68,0.25)" : "none",
      }}>
      {children}
    </button>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, label, action, onAction }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-14 h-14 rounded-3xl flex items-center justify-center"
        style={{ background: "var(--bg-glass)" }}>
        <Icon size={24} style={{ color: "var(--text-muted)" }} />
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
      {action && (
        <button onClick={onAction}
          className="text-xs font-medium px-3 py-1.5 rounded-xl"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
          {action}
        </button>
      )}
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function FinancesPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const { payments, fetchPayments, addPayment, deletePayment } = usePaymentsStore()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [modal, setModal] = useState<"expense" | "income" | null>(null)
  const [tab, setTab] = useState<"overview" | "income" | "expense" | "kassa">("overview")
  const [selectedBookingId, setSelectedBookingId] = useState("")
  const [cashAZN, setCashAZN] = useState(0)
  const [cashUSD, setCashUSD] = useState(0)
  const [cashModal, setCashModal] = useState(false)
  const [cashInput, setCashInput] = useState("")
  const [cashReason, setCashReason] = useState("")
  const [cashOperation, setCashOperation] = useState<"add" | "subtract">("add")
  const [cashCurrency, setCashCurrency] = useState<"AZN" | "USD">("AZN")
  const [cashHistory, setCashHistory] = useState<any[]>([])
  const [ready, setReady] = useState(false)

  async function loadCash() {
    const { data: balances } = await supabase.from("cash_balance").select("*")
    if (balances) {
      setCashAZN(balances.find((c: any) => c.currency === "AZN")?.amount ?? 0)
      setCashUSD(balances.find((c: any) => c.currency === "USD")?.amount ?? 0)
    }
    const { data: history } = await supabase.from("cash_transactions").select("*").order("created_at", { ascending: false }).limit(50)
    setCashHistory(history ?? [])
  }

  useEffect(() => { fetchBookings(); fetchPayments(); loadCash(); setReady(true) }, [])

  const totalBookingRevenue = bookings.reduce((s, b) => s + b.sellPrice, 0)
  const totalBookingCost    = bookings.reduce((s, b) => s + b.buyPrice, 0)
  const totalExpenses       = expenses.reduce((s, e) => s + e.amount, 0)
  const totalManualIncome   = payments.reduce((s, p) => s + p.amount, 0)
  const totalProfit         = bookings.reduce((s, b) => s + b.profit, 0) - totalExpenses + totalManualIncome
  const margin              = totalBookingRevenue > 0 ? Math.round((totalProfit / totalBookingRevenue) * 100) : 0
  const unpaidBookings      = bookings.filter(b => b.paymentStatus !== "paid")

  const cashAznIn  = useMemo(() => cashHistory.filter(t => t.currency === "AZN" && t.operation === "add").reduce((s, t) => s + t.amount, 0), [cashHistory])
  const cashAznOut = useMemo(() => cashHistory.filter(t => t.currency === "AZN" && t.operation === "subtract").reduce((s, t) => s + t.amount, 0), [cashHistory])

  if (!ready) return (
    <div className="min-h-screen p-7" style={{ background: "var(--bg-primary)" }}>
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[1,2,3,4,5].map(i => <Skeleton key={i} style={{ height: 110 }} />)}
      </div>
      <Skeleton style={{ height: 400 }} />
    </div>
  )

  async function handleAddIncome(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const clientName = fd.get("name") as string
    let remaining = Number(fd.get("amount"))
    const date = fd.get("date") as string
    const description = fd.get("description") as string

    if (selectedBookingId) {
      const booking = bookings.find(b => b.id === selectedBookingId)
      if (booking) {
        const debt = booking.sellPrice - (booking.paidAmount ?? 0)
        const toPay = Math.min(remaining, debt)
        await addPayment({ clientName, amount: toPay, description, date, bookingId: selectedBookingId })
        remaining -= toPay
      }
    }
    if (remaining > 0) {
      const unpaid = bookings.filter(b => b.clientName.toLowerCase() === clientName.toLowerCase() && b.paymentStatus !== "paid" && b.id !== selectedBookingId).sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime())
      for (const booking of unpaid) {
        if (remaining <= 0) break
        const debt = booking.sellPrice - (booking.paidAmount ?? 0)
        if (debt <= 0) continue
        const toPay = Math.min(remaining, debt)
        await addPayment({ clientName, amount: toPay, description: `Auto: ${description}`, date, bookingId: booking.id })
        remaining -= toPay
      }
    }
    if (remaining > 0) {
      const { data: eb } = await supabase.from("client_balances").select("*").ilike("client_name", clientName).single()
      if (eb) await supabase.from("client_balances").update({ balance: eb.balance + remaining }).eq("id", eb.id)
      else await supabase.from("client_balances").insert({ client_name: clientName, balance: remaining })
      await supabase.from("client_balance_transactions").insert({ client_name: clientName, amount: remaining, type: "credit", description: `Artıq ödəniş: ${description}` })
    }
    await fetchBookings(); setSelectedBookingId(""); setModal(null)
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

  async function handleCashSubmit() {
    const amount = parseFloat(cashInput)
    if (!amount || amount <= 0) return
    if (cashCurrency === "AZN") {
      const nv = cashOperation === "add" ? cashAZN + amount : Math.max(0, cashAZN - amount)
      setCashAZN(nv)
      await supabase.from("cash_balance").update({ amount: nv, updated_at: new Date().toISOString() }).eq("currency", "AZN")
      await supabase.from("cash_transactions").insert({ currency: "AZN", operation: cashOperation, amount, reason: cashReason || null, balance_after: nv })
    } else {
      const nv = cashOperation === "add" ? cashUSD + amount : Math.max(0, cashUSD - amount)
      setCashUSD(nv)
      await supabase.from("cash_balance").update({ amount: nv, updated_at: new Date().toISOString() }).eq("currency", "USD")
      await supabase.from("cash_transactions").insert({ currency: "USD", operation: cashOperation, amount, reason: cashReason || null, balance_after: nv })
    }
    setCashInput(""); setCashReason("")
    await loadCash(); setCashModal(false)
  }

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Maliyyə</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Maliyyə hesabatı və idarəetmə</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal("income")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: "linear-gradient(135deg, #10b981, #34d399)", boxShadow: "0 4px 16px rgba(16,185,129,0.3)" }}>
            <Plus size={15} />Gəlir
          </button>
          <button onClick={() => setModal("expense")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", boxShadow: "0 4px 16px rgba(239,68,68,0.3)" }}>
            <Plus size={15} />Xərc
          </button>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Revenue hero */}
        <div className="col-span-2 lg:col-span-1 p-5 rounded-3xl text-white relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #10b981, #34d399)", boxShadow: "0 8px 24px rgba(16,185,129,0.3)" }}>
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-15" style={{ background: "white" }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold opacity-75 uppercase tracking-wider">Ümumi gəlir</p>
              <TrendingUp size={15} className="opacity-70" />
            </div>
            <p className="text-2xl font-bold tabular-nums mb-1">{formatCurrency(totalBookingRevenue + totalManualIncome)}</p>
            <p className="text-xs opacity-65">Sifarişlər + ödənişlər</p>
          </div>
        </div>

        {[
          { label: "Alış xərci",        value: formatCurrency(totalBookingCost), sub: "Bilet və tur",   Icon: TrendingDown, color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
          { label: "Əməliyyat xərcləri",value: formatCurrency(totalExpenses),    sub: `${expenses.length} qeyd`,   Icon: Receipt,     color: "#f97316", bg: "rgba(249,115,22,0.12)" },
          { label: "Xalis mənfəət",     value: formatCurrency(totalProfit),      sub: `Marja: ${margin}%`, Icon: BarChart3, color: totalProfit >= 0 ? "#22c55e" : "#ef4444", bg: totalProfit >= 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)" },
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

        {/* Kassa card */}
        <div className="p-5 rounded-3xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ ...card, borderColor: "rgba(99,102,241,0.25)", boxShadow: "0 0 0 1px rgba(99,102,241,0.1)" }}
          onClick={() => setCashModal(true)}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Kassa</p>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)" }}>
              <Wallet size={14} style={{ color: "#6366f1" }} />
            </div>
          </div>
          <p className="text-xl font-bold tabular-nums mb-0.5" style={{ color: "#6366f1" }}>{formatCurrency(cashAZN)}</p>
          <p className="text-sm font-semibold text-green-500 tabular-nums">${cashUSD.toFixed(2)}</p>
          <div className="flex items-center gap-1 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Nağd · Klikla idarə et</p>
          </div>
        </div>
      </div>

      {/* ── Tabs + Content ── */}
      <div className="rounded-3xl overflow-hidden" style={card}>
        <div className="flex gap-1 px-5 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>
            <BarChart3 size={14} /> Ümumi baxış
          </TabBtn>
          <TabBtn active={tab === "income"} onClick={() => setTab("income")}>
            <TrendingUp size={14} />
            Gəlirlər
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)", fontSize: "11px" }}>{payments.length}</span>
          </TabBtn>
          <TabBtn active={tab === "expense"} onClick={() => setTab("expense")}>
            <TrendingDown size={14} />
            Xərclər
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)", fontSize: "11px" }}>{expenses.length}</span>
          </TabBtn>
          <TabBtn active={tab === "kassa"} onClick={() => setTab("kassa")}>
            <Wallet size={14} />
            Kassa
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)", fontSize: "11px" }}>{cashHistory.length}</span>
          </TabBtn>
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x" style={{ borderColor: "var(--border-color)" }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Son ödənişlər</h3>
                <span className="text-xs font-bold text-green-500">{formatCurrency(totalManualIncome)}</span>
              </div>
              {payments.length === 0 ? <EmptyState icon={DollarSign} label="Hələ ödəniş yoxdur" action="Gəlir əlavə et" onAction={() => setModal("income")} /> : (
                <div className="space-y-1">
                  {payments.slice(0, 6).map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all"
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(34,197,94,0.12)" }}>
                        <TrendingUp size={13} className="text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{p.clientName}</p>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{p.description || "—"}</p>
                      </div>
                      <p className="text-sm font-bold text-green-500 tabular-nums flex-shrink-0">{formatCurrency(p.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Son xərclər</h3>
                <span className="text-xs font-bold text-red-500">{formatCurrency(totalExpenses)}</span>
              </div>
              {expenses.length === 0 ? <EmptyState icon={Receipt} label="Xərc qeydi yoxdur" action="Xərc əlavə et" onAction={() => setModal("expense")} /> : (
                <div className="space-y-1">
                  {expenses.slice(0, 6).map(e => (
                    <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all"
                      onMouseEnter={el => (el.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
                      onMouseLeave={el => (el.currentTarget as HTMLElement).style.background = "transparent"}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.12)" }}>
                        <TrendingDown size={13} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{e.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>{e.category}</span>
                      </div>
                      <p className="text-sm font-bold text-red-500 tabular-nums flex-shrink-0">{formatCurrency(e.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Income tab */}
        {tab === "income" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Daxil olan ödənişlər</h3>
              <p className="text-sm font-bold text-green-500 tabular-nums">Cəmi: {formatCurrency(totalManualIncome)}</p>
            </div>
            {payments.length === 0 ? <EmptyState icon={DollarSign} label="Hələ ödəniş yoxdur" action="İlk ödənişi əlavə et" onAction={() => setModal("income")} /> : (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--bg-glass)", borderBottom: "1px solid var(--border-color)" }}>
                      {["Müştəri", "Açıqlama", "Tarix", "Məbləğ", "Sifariş", ""].map(h => (
                        <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3" style={{ color: "var(--text-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => {
                      const booking = bookings.find(b => b.id === p.bookingId)
                      return (
                        <tr key={p.id} className="group transition-all" style={{ borderBottom: "1px solid var(--border-color)" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                          <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>{p.clientName}</td>
                          <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{p.description || "—"}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{p.date}</td>
                          <td className="px-4 py-3 font-bold text-green-500 tabular-nums">{formatCurrency(p.amount)}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{booking ? booking.destination : "—"}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => deletePayment(p.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl transition-all hover:scale-110"
                              style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}>
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Expense tab */}
        {tab === "expense" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Əməliyyat xərcləri</h3>
              <p className="text-sm font-bold text-red-500 tabular-nums">Cəmi: {formatCurrency(totalExpenses)}</p>
            </div>
            {expenses.length === 0 ? <EmptyState icon={Receipt} label="Xərc qeydi yoxdur" action="İlk xərci əlavə et" onAction={() => setModal("expense")} /> : (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--bg-glass)", borderBottom: "1px solid var(--border-color)" }}>
                      {["Ad", "Kateqoriya", "Tarix", "Məbləğ", ""].map(h => (
                        <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3" style={{ color: "var(--text-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id} className="group transition-all" style={{ borderBottom: "1px solid var(--border-color)" }}
                        onMouseEnter={el => (el.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
                        onMouseLeave={el => (el.currentTarget as HTMLElement).style.background = "transparent"}>
                        <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>{e.name}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2.5 py-1 rounded-xl font-medium" style={{ background: "var(--bg-glass)", color: "var(--text-secondary)" }}>{e.category}</span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{e.date}</td>
                        <td className="px-4 py-3 font-bold text-red-500 tabular-nums">{formatCurrency(e.amount)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => setExpenses(prev => prev.filter(x => x.id !== e.id))}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl transition-all hover:scale-110"
                            style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Kassa tab */}
        {tab === "kassa" && (
          <div className="p-6">
            {/* Kassa summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {[
                { label: "AZN Balansı", value: formatCurrency(cashAZN), color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
                { label: "USD Balansı", value: `$${cashUSD.toFixed(2)}`, color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
                { label: "AZN Giriş", value: formatCurrency(cashAznIn), color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
                { label: "AZN Çıxış", value: formatCurrency(cashAznOut), color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className="p-4 rounded-2xl" style={{ background: bg }}>
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
                  <p className="text-lg font-bold tabular-nums" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Kassa əməliyyatları</h3>
              <button onClick={() => setCashModal(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all hover:scale-[1.03]"
                style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
                <Plus size={12} /> Əməliyyat
              </button>
            </div>

            {cashHistory.length === 0 ? <EmptyState icon={Wallet} label="Hələ əməliyyat yoxdur" /> : (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--bg-glass)", borderBottom: "1px solid var(--border-color)" }}>
                      {["Tarix", "Valyuta", "Növ", "Məbləğ", "Səbəb", "Qalıq"].map(h => (
                        <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3" style={{ color: "var(--text-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cashHistory.map((t: any) => (
                      <tr key={t.id} className="transition-all" style={{ borderBottom: "1px solid var(--border-color)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                          {new Date(t.created_at).toLocaleDateString("az-AZ")} {new Date(t.created_at).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 rounded-xl font-medium"
                            style={{ background: t.currency === "AZN" ? "rgba(99,102,241,0.12)" : "rgba(34,197,94,0.12)", color: t.currency === "AZN" ? "#6366f1" : "#22c55e" }}>
                            {t.currency}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 rounded-xl font-medium"
                            style={{ background: t.operation === "add" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: t.operation === "add" ? "#22c55e" : "#ef4444" }}>
                            {t.operation === "add" ? "↑ Giriş" : "↓ Çıxış"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold tabular-nums" style={{ color: t.operation === "add" ? "#22c55e" : "#ef4444" }}>
                          {t.operation === "add" ? "+" : "−"}{t.amount} {t.currency}
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{t.reason || "—"}</td>
                        <td className="px-4 py-3 font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{t.balance_after} {t.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Cash Modal ── */}
      {cashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto" style={modalStyle}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)" }}>
                  <Wallet size={15} style={{ color: "#6366f1" }} />
                </div>
                <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Kassa idarəetməsi</h2>
              </div>
              <button onClick={() => setCashModal(false)} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>
                <X size={15} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Balance display */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl text-center" style={{ background: "rgba(99,102,241,0.1)" }}>
                  <p className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>AZN</p>
                  <p className="text-xl font-bold tabular-nums" style={{ color: "#6366f1" }}>{formatCurrency(cashAZN)}</p>
                </div>
                <div className="p-4 rounded-2xl text-center" style={{ background: "rgba(34,197,94,0.1)" }}>
                  <p className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>USD</p>
                  <p className="text-xl font-bold tabular-nums text-green-500">${cashUSD.toFixed(2)}</p>
                </div>
              </div>

              {/* Operation type */}
              <div className="grid grid-cols-2 gap-2">
                {[{ v: "add", l: "↑ Giriş", color: "#22c55e", bg: "rgba(34,197,94,0.15)" }, { v: "subtract", l: "↓ Çıxış", color: "#ef4444", bg: "rgba(239,68,68,0.15)" }].map(op => (
                  <button key={op.v} onClick={() => setCashOperation(op.v as any)}
                    className="py-2.5 rounded-2xl text-sm font-semibold transition-all"
                    style={{
                      background: cashOperation === op.v ? op.bg : "var(--bg-glass)",
                      border: `1px solid ${cashOperation === op.v ? op.color + "40" : "var(--border-color)"}`,
                      color: cashOperation === op.v ? op.color : "var(--text-secondary)",
                    }}>
                    {op.l}
                  </button>
                ))}
              </div>

              {/* Currency */}
              <div className="grid grid-cols-2 gap-2">
                {["AZN", "USD"].map(cur => (
                  <button key={cur} onClick={() => setCashCurrency(cur as any)}
                    className="py-2.5 rounded-2xl text-sm font-semibold transition-all"
                    style={{
                      background: cashCurrency === cur ? "rgba(99,102,241,0.15)" : "var(--bg-glass)",
                      border: `1px solid ${cashCurrency === cur ? "rgba(99,102,241,0.4)" : "var(--border-color)"}`,
                      color: cashCurrency === cur ? "#6366f1" : "var(--text-secondary)",
                    }}>
                    {cur}
                  </button>
                ))}
              </div>

              <input type="number" value={cashInput} onChange={e => setCashInput(e.target.value)}
                placeholder={`Məbləğ (${cashCurrency})`} style={input} />
              <input type="text" value={cashReason} onChange={e => setCashReason(e.target.value)}
                placeholder="Səbəb (məs: Müştəri ödənişi)" style={input} />

              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleCashSubmit}
                  className="py-3 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}>
                  Təsdiq et
                </button>
                <button onClick={() => setCashModal(false)}
                  className="py-3 rounded-2xl text-sm font-medium transition-all"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                  Ləğv et
                </button>
              </div>

              {/* History in modal */}
              {cashHistory.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider px-4 py-2.5" style={{ background: "var(--bg-glass)", color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)" }}>
                    Son əməliyyatlar
                  </p>
                  <div className="max-h-52 overflow-y-auto">
                    {cashHistory.slice(0, 10).map((t: any) => (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                          style={{ background: t.operation === "add" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: t.operation === "add" ? "#22c55e" : "#ef4444" }}>
                          {t.operation === "add" ? "↑" : "↓"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{t.reason || "Səbəb yoxdur"}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(t.created_at).toLocaleDateString("az-AZ")} · {t.currency}</p>
                        </div>
                        <p className={`text-sm font-bold tabular-nums flex-shrink-0 ${t.operation === "add" ? "text-green-500" : "text-red-500"}`}>
                          {t.operation === "add" ? "+" : "−"}{t.amount}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Income Modal ── */}
      {modal === "income" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md" style={modalStyle}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)" }}>
                  <TrendingUp size={14} className="text-green-500" />
                </div>
                <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Yeni gəlir qeydi</h2>
              </div>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleAddIncome} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Müştəri / Şirkət *</label>
                <input name="name" required placeholder="Məs: Leyla Mammadova" style={input} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Sifariş (istəyə görə)</label>
                <select value={selectedBookingId} onChange={e => setSelectedBookingId(e.target.value)} style={input}>
                  <option value="">— Seçin —</option>
                  {unpaidBookings.map(b => <option key={b.id} value={b.id}>{b.clientName} — {b.destination} — {formatCurrency(b.sellPrice - (b.paidAmount ?? 0))}</option>)}
                </select>
                {selectedBookingId && <p className="text-xs mt-1.5 text-green-500">✓ Bu sifariş borcundan çıxılacaq</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Məbləğ (AZN) *</label>
                  <input name="amount" type="number" step="0.01" min="0" required style={input} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Tarix</label>
                  <input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} style={input} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Açıqlama</label>
                <input name="description" placeholder="Noyabr borcu..." style={input} />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3" style={{ borderTop: "1px solid var(--border-color)" }}>
                <button type="button" onClick={() => setModal(null)}
                  className="py-2.5 rounded-2xl text-sm font-medium transition-all"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                  Ləğv et
                </button>
                <button type="submit"
                  className="py-2.5 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #10b981, #34d399)", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}>
                  Yadda saxla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Expense Modal ── */}
      {modal === "expense" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm" style={modalStyle}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)" }}>
                  <TrendingDown size={14} className="text-red-500" />
                </div>
                <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Yeni xərc qeydi</h2>
              </div>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Ad *</label>
                <input name="name" required style={input} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Məbləğ (AZN) *</label>
                  <input name="amount" type="number" step="0.01" min="0" required style={input} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Tarix</label>
                  <input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} style={input} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Kateqoriya</label>
                <div className="grid grid-cols-3 gap-2">
                  {EXPENSE_CATEGORIES.map(cat => (
                    <label key={cat} className="cursor-pointer">
                      <input type="radio" name="category" value={cat} defaultChecked={cat === "Ofis"} className="sr-only peer" />
                      <div className="text-center py-2 rounded-xl text-xs font-medium border-2 transition-all peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:text-red-600"
                        style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
                        {cat}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3" style={{ borderTop: "1px solid var(--border-color)" }}>
                <button type="button" onClick={() => setModal(null)}
                  className="py-2.5 rounded-2xl text-sm font-medium transition-all"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                  Ləğv et
                </button>
                <button type="submit"
                  className="py-2.5 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", boxShadow: "0 4px 12px rgba(239,68,68,0.3)" }}>
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