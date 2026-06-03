"use client"
import { supabase } from "@/lib/supabase"
import { useState, useEffect } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { usePaymentsStore } from "@/lib/store/paymentsStore"
import { formatCurrency } from "@/lib/calculations"
import { TrendingUp, TrendingDown, DollarSign, Plus, Trash2 } from "lucide-react"

interface Expense { id: string; name: string; amount: number; category: string; date: string }

const card = { background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(20px)", borderRadius: "24px" }
const modalCard = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "24px" }
const inputStyle = { background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: "12px", padding: "10px 16px", fontSize: "14px", outline: "none", width: "100%" }

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
    if (balances) { setCashAZN(balances.find((c: any) => c.currency === "AZN")?.amount ?? 0); setCashUSD(balances.find((c: any) => c.currency === "USD")?.amount ?? 0) }
    const { data: history } = await supabase.from("cash_transactions").select("*").order("created_at", { ascending: false }).limit(20)
    setCashHistory(history ?? [])
  }

  useEffect(() => { fetchBookings(); fetchPayments(); loadCash(); setReady(true) }, [])

  const totalBookingRevenue = bookings.reduce((s, b) => s + b.sellPrice, 0)
  const totalBookingCost = bookings.reduce((s, b) => s + b.buyPrice, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalManualIncome = payments.reduce((s, p) => s + p.amount, 0)
  const totalProfit = bookings.reduce((s, b) => s + b.profit, 0) - totalExpenses + totalManualIncome
  const margin = totalBookingRevenue > 0 ? Math.round((totalProfit / totalBookingRevenue) * 100) : 0
  const unpaidBookings = bookings.filter(b => b.paymentStatus !== "paid")

  if (!ready) return null

  async function handleAddIncome(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const clientName = fd.get("name") as string
    let remaining = Number(fd.get("amount"))
    const date = fd.get("date") as string
    const description = fd.get("description") as string
    if (selectedBookingId) {
      const booking = bookings.find(b => b.id === selectedBookingId)
      if (booking) { const debt = booking.sellPrice - (booking.paidAmount ?? 0); const toPay = Math.min(remaining, debt); await addPayment({ clientName, amount: toPay, description, date, bookingId: selectedBookingId }); remaining -= toPay }
    }
    if (remaining > 0) {
      const unpaid = bookings.filter(b => b.clientName.toLowerCase() === clientName.toLowerCase() && b.paymentStatus !== "paid" && b.id !== selectedBookingId).sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime())
      for (const booking of unpaid) { if (remaining <= 0) break; const debt = booking.sellPrice - (booking.paidAmount ?? 0); if (debt <= 0) continue; const toPay = Math.min(remaining, debt); await addPayment({ clientName, amount: toPay, description: `Auto: ${description}`, date, bookingId: booking.id }); remaining -= toPay }
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
    setExpenses(prev => [...prev, { id: Date.now().toString(), name: fd.get("name") as string, amount: Number(fd.get("amount")), category: fd.get("category") as string, date: fd.get("date") as string }])
    setModal(null)
  }

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Maliyyə</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Maliyyə hesabatı</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setModal("income")} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}><Plus size={16} />Gəlir əlavə et</button>
          <button onClick={() => setModal("expense")} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}><Plus size={16} />Xərc əlavə et</button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="p-6 text-white rounded-3xl col-span-1" style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}>
          <div className="flex items-center justify-between mb-3"><p className="text-sm opacity-80">Ümumi gəlir</p><TrendingUp size={18} className="opacity-70" /></div>
          <p className="text-2xl font-bold">{formatCurrency(totalBookingRevenue + totalManualIncome)}</p>
          <p className="text-xs opacity-70 mt-1">Sifarişlər + ödənişlər</p>
        </div>
        {[
          { label: "Alış xərci", value: formatCurrency(totalBookingCost), icon: TrendingDown, color: "#ef4444", bg: "rgba(239,68,68,0.1)", sub: "Bilet və tur" },
          { label: "Əməliyyat xərcləri", value: formatCurrency(totalExpenses), icon: TrendingDown, color: "#f97316", bg: "rgba(249,115,22,0.1)", sub: `${expenses.length} xərc` },
          { label: "Xalis mənfəət", value: formatCurrency(totalProfit), icon: DollarSign, color: "#22c55e", bg: "rgba(34,197,94,0.1)", sub: `Marja: ${margin}%` },
        ].map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="p-5 rounded-3xl" style={card}>
            <div className="flex items-center justify-between mb-3"><p className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</p><div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}><Icon size={14} style={{ color }} /></div></div>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>
          </div>
        ))}
        <div className="p-5 rounded-3xl cursor-pointer transition-all hover:scale-[1.02]" style={{ ...card, borderColor: "rgba(99,102,241,0.3)" }} onClick={() => setCashModal(true)}>
          <div className="flex items-center justify-between mb-3"><p className="text-xs" style={{ color: "var(--text-secondary)" }}>Kassa (Nağd)</p><span className="text-lg">💵</span></div>
          <p className="text-xl font-bold" style={{ color: "#6366f1" }}>{formatCurrency(cashAZN)}</p>
          <p className="text-sm font-semibold text-green-500">${cashUSD.toFixed(2)}</p>
        </div>
      </div>

      <div className="rounded-3xl overflow-hidden" style={card}>
        <div className="flex gap-2 px-6 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
          {[{ value: "overview", label: "Ümumi baxış" }, { value: "income", label: `💚 Gəlirlər (${payments.length})` }, { value: "expense", label: `🔴 Xərclər (${expenses.length})` }, { value: "kassa", label: `💵 Kassa (${cashHistory.length})` }].map(t => (
            <button key={t.value} onClick={() => setTab(t.value as any)} className="px-4 py-2 rounded-2xl text-sm font-medium transition-all"
              style={{ background: tab === t.value ? "linear-gradient(135deg, #ef4444, #f97316)" : "transparent", color: tab === t.value ? "white" : "var(--text-secondary)" }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid grid-cols-2 divide-x" style={{ borderColor: "var(--border-color)" }}>
            <div className="p-6">
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Son ödənişlər</h3>
              {payments.length === 0 ? <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Hələ ödəniş yoxdur</p> : (
                <table className="w-full text-sm">
                  <tbody>{payments.slice(0, 6).map(p => (<tr key={p.id} className="border-b" style={{ borderColor: "var(--border-color)" }}><td className="py-2 font-medium" style={{ color: "var(--text-primary)" }}>{p.clientName}</td><td className="py-2" style={{ color: "var(--text-secondary)" }}>{p.description}</td><td className="py-2 font-bold text-green-500">{formatCurrency(p.amount)}</td></tr>))}</tbody>
                </table>
              )}
            </div>
            <div className="p-6">
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Son xərclər</h3>
              <table className="w-full text-sm">
                <tbody>{expenses.slice(0, 6).map(e => (<tr key={e.id} className="border-b" style={{ borderColor: "var(--border-color)" }}><td className="py-2 font-medium" style={{ color: "var(--text-primary)" }}>{e.name}</td><td className="py-2"><span className="text-xs px-2 py-0.5 rounded-xl" style={{ background: "var(--bg-glass)", color: "var(--text-secondary)" }}>{e.category}</span></td><td className="py-2 font-semibold text-red-500">{formatCurrency(e.amount)}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "income" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Daxil olan ödənişlər</h3><p className="text-sm font-bold text-green-500">Cəmi: {formatCurrency(totalManualIncome)}</p></div>
            {payments.length === 0 ? <p className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>Hələ ödəniş yoxdur</p> : (
              <table className="w-full text-sm">
                <thead><tr style={{ borderBottom: "1px solid var(--border-color)" }}>{["Müştəri", "Açıqlama", "Tarix", "Məbləğ", "Sifariş", ""].map(h => <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider pb-3" style={{ color: "var(--text-muted)" }}>{h}</th>)}</tr></thead>
                <tbody>{payments.map(p => { const booking = bookings.find(b => b.id === p.bookingId); return (<tr key={p.id} className="group border-b" style={{ borderColor: "var(--border-color)" }}><td className="py-3 font-medium" style={{ color: "var(--text-primary)" }}>{p.clientName}</td><td className="py-3" style={{ color: "var(--text-secondary)" }}>{p.description}</td><td className="py-3" style={{ color: "var(--text-muted)" }}>{p.date}</td><td className="py-3 font-bold text-green-500">{formatCurrency(p.amount)}</td><td className="py-3 text-xs" style={{ color: "var(--text-muted)" }}>{booking ? booking.destination : "—"}</td><td className="py-3"><button onClick={() => deletePayment(p.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg" style={{ color: "var(--text-muted)" }}><Trash2 size={14} /></button></td></tr>) })}</tbody>
              </table>
            )}
          </div>
        )}

        {tab === "expense" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Əməliyyat xərcləri</h3><p className="text-sm font-bold text-red-500">Cəmi: {formatCurrency(totalExpenses)}</p></div>
            <table className="w-full text-sm">
              <thead><tr style={{ borderBottom: "1px solid var(--border-color)" }}>{["Ad", "Kateqoriya", "Tarix", "Məbləğ", ""].map(h => <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider pb-3" style={{ color: "var(--text-muted)" }}>{h}</th>)}</tr></thead>
              <tbody>{expenses.map(e => (<tr key={e.id} className="group border-b" style={{ borderColor: "var(--border-color)" }}><td className="py-3 font-medium" style={{ color: "var(--text-primary)" }}>{e.name}</td><td className="py-3"><span className="text-xs px-2 py-1 rounded-xl" style={{ background: "var(--bg-glass)", color: "var(--text-secondary)" }}>{e.category}</span></td><td className="py-3" style={{ color: "var(--text-muted)" }}>{e.date}</td><td className="py-3 font-semibold text-red-500">{formatCurrency(e.amount)}</td><td className="py-3"><button onClick={() => setExpenses(prev => prev.filter(x => x.id !== e.id))} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg" style={{ color: "var(--text-muted)" }}><Trash2 size={14} /></button></td></tr>))}</tbody>
            </table>
          </div>
        )}
        {tab === "kassa" && (
  <div className="p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Kassa əməliyyatları</h3>
      <div className="flex gap-4 text-sm">
        <span style={{ color: "var(--text-secondary)" }}>AZN: <span className="font-bold" style={{ color: "#6366f1" }}>{formatCurrency(cashAZN)}</span></span>
        <span style={{ color: "var(--text-secondary)" }}>USD: <span className="font-bold text-green-500">${cashUSD.toFixed(2)}</span></span>
      </div>
    </div>
    {cashHistory.length === 0 ? (
      <p className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>Hələ əməliyyat yoxdur</p>
    ) : (
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
            {["Tarix", "Valyuta", "Əməliyyat", "Məbləğ", "Səbəb", "Qalıq"].map(h => (
              <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider pb-3" style={{ color: "var(--text-muted)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cashHistory.map((t: any) => (
            <tr key={t.id} className="border-b" style={{ borderColor: "var(--border-color)" }}>
              <td className="py-3" style={{ color: "var(--text-muted)" }}>{new Date(t.created_at).toLocaleDateString("az-AZ")} {new Date(t.created_at).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })}</td>
              <td className="py-3"><span className="text-xs px-2 py-1 rounded-xl font-medium" style={{ background: t.currency === "AZN" ? "rgba(99,102,241,0.1)" : "rgba(34,197,94,0.1)", color: t.currency === "AZN" ? "#6366f1" : "#22c55e" }}>{t.currency}</span></td>
              <td className="py-3"><span className="text-xs px-2 py-1 rounded-xl font-medium" style={{ background: t.operation === "add" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: t.operation === "add" ? "#22c55e" : "#ef4444" }}>{t.operation === "add" ? "↑ Gəlir" : "↓ Xərc"}</span></td>
              <td className="py-3 font-bold" style={{ color: t.operation === "add" ? "#22c55e" : "#ef4444" }}>{t.operation === "add" ? "+" : "−"}{t.amount} {t.currency}</td>
              <td className="py-3" style={{ color: "var(--text-secondary)" }}>{t.reason || "—"}</td>
              <td className="py-3 font-semibold" style={{ color: "var(--text-primary)" }}>{t.balance_after} {t.currency}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}
      </div>

      {cashModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto" style={modalCard}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>💵 Kassa</h2><button onClick={() => setCashModal(false)} style={{ color: "var(--text-muted)" }} className="text-xl">✕</button></div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-2xl text-center" style={{ background: "rgba(99,102,241,0.1)" }}><p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>AZN</p><p className="text-xl font-bold" style={{ color: "#6366f1" }}>{formatCurrency(cashAZN)}</p></div>
              <div className="p-3 rounded-2xl text-center" style={{ background: "rgba(34,197,94,0.1)" }}><p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>USD</p><p className="text-xl font-bold text-green-500">${cashUSD.toFixed(2)}</p></div>
            </div>
            <div className="flex gap-2 mb-3">
              {["add", "subtract"].map(op => <button key={op} onClick={() => setCashOperation(op as any)} className="flex-1 py-2 rounded-2xl text-sm font-medium transition-all" style={{ background: cashOperation === op ? (op === "add" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)") : "var(--bg-glass)", border: "1px solid var(--border-color)", color: cashOperation === op ? (op === "add" ? "#22c55e" : "#ef4444") : "var(--text-secondary)" }}>{op === "add" ? "+ Gəlir" : "− Xərc"}</button>)}
            </div>
            <div className="flex gap-2 mb-3">
              {["AZN", "USD"].map(cur => <button key={cur} onClick={() => setCashCurrency(cur as any)} className="flex-1 py-2 rounded-2xl text-sm font-medium transition-all" style={{ background: cashCurrency === cur ? "rgba(99,102,241,0.2)" : "var(--bg-glass)", border: "1px solid var(--border-color)", color: cashCurrency === cur ? "#6366f1" : "var(--text-secondary)" }}>{cur}</button>)}
            </div>
            <input type="number" value={cashInput} onChange={e => setCashInput(e.target.value)} placeholder={`Məbləğ (${cashCurrency})`} style={{ ...inputStyle, marginBottom: "8px" }} />
            <input type="text" value={cashReason} onChange={e => setCashReason(e.target.value)} placeholder="Səbəb..." style={{ ...inputStyle, marginBottom: "12px" }} />
            <div className="flex gap-2 mb-4">
              <button onClick={async () => {
                const amount = parseFloat(cashInput); if (!amount || amount <= 0) return
                if (cashCurrency === "AZN") { const nv = cashOperation === "add" ? cashAZN + amount : Math.max(0, cashAZN - amount); setCashAZN(nv); await supabase.from("cash_balance").update({ amount: nv, updated_at: new Date().toISOString() }).eq("currency", "AZN"); await supabase.from("cash_transactions").insert({ currency: "AZN", operation: cashOperation, amount, reason: cashReason || null, balance_after: nv }) }
                else { const nv = cashOperation === "add" ? cashUSD + amount : Math.max(0, cashUSD - amount); setCashUSD(nv); await supabase.from("cash_balance").update({ amount: nv, updated_at: new Date().toISOString() }).eq("currency", "USD"); await supabase.from("cash_transactions").insert({ currency: "USD", operation: cashOperation, amount, reason: cashReason || null, balance_after: nv }) }
                setCashInput(""); setCashReason(""); await loadCash(); setCashModal(false)
              }} className="flex-1 py-2.5 rounded-2xl text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>Təsdiq et</button>
              <button onClick={() => setCashModal(false)} className="flex-1 py-2.5 rounded-2xl text-sm" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>Ləğv et</button>
            </div>
            {cashHistory.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider px-3 py-2" style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>Son əməliyyatlar</p>
                <div className="max-h-48 overflow-y-auto divide-y" style={{ borderColor: "var(--border-color)" }}>
                  {cashHistory.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2.5">
                      <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{t.reason || "Səbəb yoxdur"}</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(t.created_at).toLocaleDateString("az-AZ")}</p></div>
                      <p className={`text-sm font-bold ml-3 ${t.operation === "add" ? "text-green-500" : "text-red-500"}`}>{t.operation === "add" ? "+" : "−"}{t.amount} {t.currency}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {modal === "income" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6" style={modalCard}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Yeni ödəniş</h2><button onClick={() => setModal(null)} style={{ color: "var(--text-muted)" }} className="text-xl">✕</button></div>
            <form onSubmit={handleAddIncome} className="space-y-3">
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Müştəri / Şirkət adı *</label><input name="name" required placeholder="Məs: Leyla Mammadova" style={inputStyle} /></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Ödəniş sifarişə aiddir?</label>
                <select value={selectedBookingId} onChange={e => setSelectedBookingId(e.target.value)} style={inputStyle}>
                  <option value="">— Seçin —</option>
                  {unpaidBookings.map(b => <option key={b.id} value={b.id}>{b.clientName} — {b.destination} — {formatCurrency(b.sellPrice - (b.paidAmount ?? 0))}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Məbləğ (AZN) *</label><input name="amount" type="number" step="0.01" min="0" required style={inputStyle} /></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Açıqlama</label><input name="description" style={inputStyle} /></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Tarix</label><input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} style={inputStyle} /></div>
              <div className="flex gap-3 pt-3 border-t" style={{ borderColor: "var(--border-color)" }}>
                <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-2xl text-sm" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>Ləğv et</button>
                <button type="submit" className="flex-1 py-2.5 rounded-2xl text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}>Yadda saxla</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "expense" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6" style={modalCard}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Yeni xərc</h2><button onClick={() => setModal(null)} style={{ color: "var(--text-muted)" }} className="text-xl">✕</button></div>
            <form onSubmit={handleAddExpense} className="space-y-3">
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Ad *</label><input name="name" required style={inputStyle} /></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Məbləğ (AZN) *</label><input name="amount" type="number" step="0.01" min="0" required style={inputStyle} /></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Kateqoriya</label><select name="category" style={inputStyle}><option>Ofis</option><option>Kommunal</option><option>Marketing</option><option>Maaş</option><option>Digər</option></select></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Tarix</label><input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} style={inputStyle} /></div>
              <div className="flex gap-3 pt-3 border-t" style={{ borderColor: "var(--border-color)" }}>
                <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-2xl text-sm" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>Ləğv et</button>
                <button type="submit" className="flex-1 py-2.5 rounded-2xl text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>Əlavə et</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
