"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { formatCurrency } from "@/lib/calculations"
import { Plus, Trash2, TrendingDown, TrendingUp, X, AlertCircle } from "lucide-react"

interface Transaction {
  id: string
  amount: number
  type: "took" | "returned"
  description: string
  date: string
  createdAt: string
}

const card = { background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(24px)", borderRadius: "24px" }
const modalCard = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "28px" }
const inp = { background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: "12px", padding: "10px 16px", fontSize: "14px", outline: "none", width: "100%" }

export default function FounderPage() {
  const { profile } = useUserRole()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [modal, setModal] = useState(false)
  const [type, setType] = useState<"took" | "returned">("took")
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)

  // Only admins and boss can see this
  const canView = ["it_admin", "direktor", "boss", "muhasib"].includes(profile?.role ?? "")

  useEffect(() => { if (canView) { fetchTransactions(); setReady(true) } }, [profile])

  async function fetchTransactions() {
    const { data } = await supabase.from("founder_transactions").select("*").order("date", { ascending: false })
    if (data) setTransactions(data.map((t: any) => ({
      id: t.id, amount: t.amount, type: t.type,
      description: t.description ?? "", date: t.date, createdAt: t.created_at
    })))
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await supabase.from("founder_transactions").insert({
      amount: Number(fd.get("amount")),
      type,
      description: fd.get("description") as string,
      date: fd.get("date") as string,
    })
    await fetchTransactions()
    setModal(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Silinsin?")) return
    await supabase.from("founder_transactions").delete().eq("id", id)
    await fetchTransactions()
  }

  const totalTook = useMemo(() => transactions.filter(t => t.type === "took").reduce((s, t) => s + t.amount, 0), [transactions])
  const totalReturned = useMemo(() => transactions.filter(t => t.type === "returned").reduce((s, t) => s + t.amount, 0), [transactions])
  const netDebt = totalTook - totalReturned

  if (!canView) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
      <div className="text-center">
        <AlertCircle size={40} className="mx-auto mb-3 text-red-500" />
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Giriş icazəniz yoxdur</p>
      </div>
    </div>
  )

  if (!ready) return null

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Əsasçı Hesabı</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Elxan Hesenov — Şirkətlə maliyyə hərəkəti</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", boxShadow: "0 4px 16px rgba(239,68,68,0.3)" }}>
          <Plus size={16} />Əməliyyat
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7">
        {/* Net debt — hero */}
        <div className="p-6 rounded-3xl text-white relative overflow-hidden md:col-span-1"
          style={{
            background: netDebt > 0 ? "linear-gradient(135deg, #ef4444, #f97316)" : "linear-gradient(135deg, #10b981, #34d399)",
            boxShadow: netDebt > 0 ? "0 8px 24px rgba(239,68,68,0.3)" : "0 8px 24px rgba(16,185,129,0.3)"
          }}>
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-15" style={{ background: "white" }} />
          <p className="text-sm opacity-80 mb-3 font-medium">
            {netDebt > 0 ? "Elxan bəyin borcu" : "Elxan bəyin krediti"}
          </p>
          <p className="text-3xl font-bold tabular-nums mb-1">{formatCurrency(Math.abs(netDebt))}</p>
          <p className="text-xs opacity-65">
            {netDebt > 0 ? "Şirkətə borcludur" : "Şirkət borcludur"}
          </p>
        </div>

        <div className="p-5 rounded-3xl" style={card}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Cəmi Götürdü</p>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
              <TrendingDown size={14} style={{ color: "#ef4444" }} />
            </div>
          </div>
          <p className="text-xl font-bold tabular-nums text-red-500">{formatCurrency(totalTook)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {transactions.filter(t => t.type === "took").length} əməliyyat
          </p>
        </div>

        <div className="p-5 rounded-3xl" style={card}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Cəmi Qaytardı</p>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)" }}>
              <TrendingUp size={14} style={{ color: "#22c55e" }} />
            </div>
          </div>
          <p className="text-xl font-bold tabular-nums text-green-500">{formatCurrency(totalReturned)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {transactions.filter(t => t.type === "returned").length} əməliyyat
          </p>
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-3xl overflow-hidden" style={card}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Əməliyyatlar tarixi</h2>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "var(--bg-glass)" }} />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
            <p className="text-sm font-medium">Hələ əməliyyat yoxdur</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
            {transactions.map(t => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-4 transition-all group"
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>

                {/* Icon */}
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: t.type === "took" ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                    color: t.type === "took" ? "#ef4444" : "#22c55e"
                  }}>
                  {t.type === "took" ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {t.type === "took" ? "Şirkətdən götürdü" : "Şirkətə qaytardı"}
                  </p>
                  {t.description && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{t.description}</p>
                  )}
                </div>

                {/* Date */}
                <p className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  {new Date(t.date).toLocaleDateString("az-AZ", { day: "numeric", month: "short", year: "numeric" })}
                </p>

                {/* Amount */}
                <p className={`text-base font-bold tabular-nums flex-shrink-0 ${t.type === "took" ? "text-red-500" : "text-green-500"}`}>
                  {t.type === "took" ? "-" : "+"}{formatCurrency(t.amount)}
                </p>

                {/* Delete */}
                {["it_admin", "direktor"].includes(profile?.role ?? "") && (
                  <button onClick={() => handleDelete(t.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl transition-all flex-shrink-0"
                    style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer total */}
        {transactions.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: "1px solid var(--border-color)", background: "var(--bg-glass)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Xalis borc
            </p>
            <p className={`text-lg font-bold tabular-nums ${netDebt > 0 ? "text-red-500" : "text-green-500"}`}>
              {netDebt > 0 ? "" : "+"}{formatCurrency(-netDebt) !== formatCurrency(netDebt) ? (netDebt > 0 ? "-" : "+") : ""}{formatCurrency(Math.abs(netDebt))}
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm" style={modalCard}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Yeni əməliyyat</h2>
              <button onClick={() => setModal(false)} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Type selector */}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setType("took")}
                  className="py-3 rounded-2xl text-sm font-semibold transition-all"
                  style={{
                    background: type === "took" ? "rgba(239,68,68,0.15)" : "var(--bg-glass)",
                    color: type === "took" ? "#ef4444" : "var(--text-secondary)",
                    border: `2px solid ${type === "took" ? "rgba(239,68,68,0.4)" : "var(--border-color)"}`,
                  }}>
                  ↓ Götürdü
                </button>
                <button type="button" onClick={() => setType("returned")}
                  className="py-3 rounded-2xl text-sm font-semibold transition-all"
                  style={{
                    background: type === "returned" ? "rgba(34,197,94,0.15)" : "var(--bg-glass)",
                    color: type === "returned" ? "#22c55e" : "var(--text-secondary)",
                    border: `2px solid ${type === "returned" ? "rgba(34,197,94,0.4)" : "var(--border-color)"}`,
                  }}>
                  ↑ Qaytardı
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Məbləğ (AZN) *
                </label>
                <input name="amount" type="number" step="0.01" min="0" required style={inp} placeholder="0.00" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Tarix *
                </label>
                <input name="date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} style={inp} />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Açıqlama
                </label>
                <input name="description" placeholder="Məs: Ofis xərcləri üçün..." style={inp} />
              </div>

              <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid var(--border-color)" }}>
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 py-2.5 rounded-2xl text-sm"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                  Ləğv et
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white"
                  style={{ background: type === "took" ? "linear-gradient(135deg,#ef4444,#f97316)" : "linear-gradient(135deg,#10b981,#34d399)" }}>
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
