"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { formatCurrency } from "@/lib/calculations"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { Plus, TrendingUp, TrendingDown, Wallet, Download } from "lucide-react"
import * as XLSX from "xlsx"

interface ClientBalance { id: string; clientName: string; clientPhone: string; balance: number; notes: string }
interface Transaction { id: string; clientName: string; amount: number; type: "credit" | "debit"; bookingId: string | null; description: string; createdAt: string }

const card = { background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(20px)", borderRadius: "24px" }
const modalCard = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "24px" }
const inputStyle = { background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: "12px", padding: "10px 16px", fontSize: "14px", outline: "none", width: "100%" }

export default function BalancesPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const [balances, setBalances] = useState<ClientBalance[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selected, setSelected] = useState<ClientBalance | null>(null)
  const [modal, setModal] = useState<"add_balance" | "add_transaction" | null>(null)
  const [ready, setReady] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => { fetchBookings(); fetchBalances(); fetchTransactions(); setReady(true) }, [])

  async function fetchBalances() {
    const { data } = await supabase.from("client_balances").select("*").order("balance", { ascending: false })
    if (data) setBalances(data.map((b: any) => ({ id: b.id, clientName: b.client_name, clientPhone: b.client_phone ?? "", balance: b.balance, notes: b.notes ?? "" })))
  }

  async function fetchTransactions() {
    const { data } = await supabase.from("client_balance_transactions").select("*").order("created_at", { ascending: false })
    if (data) setTransactions(data.map((t: any) => ({ id: t.id, clientName: t.client_name, amount: t.amount, type: t.type, bookingId: t.booking_id, description: t.description ?? "", createdAt: t.created_at })))
  }

  async function handleAddBalance(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const clientName = fd.get("clientName") as string
    const initialBalance = Number(fd.get("initialBalance") ?? 0)
    const existing = balances.find(b => b.clientName.toLowerCase() === clientName.toLowerCase())
    if (existing) await supabase.from("client_balances").update({ balance: existing.balance + initialBalance }).eq("id", existing.id)
    else await supabase.from("client_balances").insert({ client_name: clientName, client_phone: fd.get("clientPhone") as string, balance: initialBalance })
    if (initialBalance > 0) await supabase.from("client_balance_transactions").insert({ client_name: clientName, amount: initialBalance, type: "credit", description: fd.get("description") as string || "Başlanğıc balans" })
    await fetchBalances(); await fetchTransactions(); setModal(null)
  }

  async function handleAddTransaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected) return
    const fd = new FormData(e.currentTarget)
    const amount = Number(fd.get("amount"))
    const type = fd.get("type") as "credit" | "debit"
    const newBalance = type === "credit" ? selected.balance + amount : selected.balance - amount
    await supabase.from("client_balances").update({ balance: newBalance }).eq("id", selected.id)
    await supabase.from("client_balance_transactions").insert({ client_name: selected.clientName, amount, type, description: fd.get("description") as string })
    await fetchBalances(); await fetchTransactions(); setModal(null); setSelected(null)
  }

  async function handleDelete(id: string) {
    if (confirm("Silinsin?")) { await supabase.from("client_balances").delete().eq("id", id); await fetchBalances() }
  }

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(balances.map(b => ({ "Müştəri": b.clientName, "Telefon": b.clientPhone, "Balans (AZN)": b.balance })))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Balanslar"); XLSX.writeFile(wb, "balanslar.xlsx")
  }

  if (!ready) return null

  const filtered = balances.filter(b => b.clientName.toLowerCase().includes(search.toLowerCase()) || b.clientPhone.includes(search))
  const totalCredit = balances.filter(b => b.balance > 0).reduce((s, b) => s + b.balance, 0)
  const totalDebt = balances.filter(b => b.balance < 0).reduce((s, b) => s + Math.abs(b.balance), 0)

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Müştəri Balansları</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Artıq ödənişlər və kredit idarəetməsi</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}>
            <Download size={16} />Excel
          </button>
          <button onClick={() => { setSelected(null); setModal("add_balance") }} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
            <Plus size={16} />Yeni balans
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-6 text-white rounded-3xl" style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}>
          <div className="flex items-center justify-between mb-2"><p className="text-sm opacity-80">Ümumi kredit</p><TrendingUp size={18} className="opacity-70" /></div>
          <p className="text-2xl font-bold">{formatCurrency(totalCredit)}</p>
          <p className="text-xs opacity-70 mt-1">{balances.filter(b => b.balance > 0).length} müştəri</p>
        </div>
        <div className="p-6 text-white rounded-3xl" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
          <div className="flex items-center justify-between mb-2"><p className="text-sm opacity-80">Ümumi borc</p><TrendingDown size={18} className="opacity-70" /></div>
          <p className="text-2xl font-bold">{formatCurrency(totalDebt)}</p>
        </div>
        <div className="p-5 rounded-3xl" style={card}>
          <div className="flex items-center justify-between mb-2"><p className="text-sm" style={{ color: "var(--text-secondary)" }}>Müştərilər</p><Wallet size={18} style={{ color: "var(--text-muted)" }} /></div>
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{balances.length}</p>
        </div>
      </div>

      <div className="rounded-3xl overflow-hidden" style={card}>
        <div className="p-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Müştəri adı və ya telefon..." style={{ ...inputStyle }} />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
            <Wallet size={32} className="mx-auto mb-3 opacity-40" /><p>Balans tapılmadı</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
            {filtered.map(client => {
              const clientTxns = transactions.filter(t => t.clientName === client.clientName)
              return (
                <div key={client.id} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
                        {client.clientName[0]}
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{client.clientName}</p>
                        {client.clientPhone && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{client.clientPhone}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-xl font-bold ${client.balance > 0 ? "text-green-500" : client.balance < 0 ? "text-red-500" : ""}`} style={client.balance === 0 ? { color: "var(--text-muted)" } : {}}>
                          {formatCurrency(client.balance)}
                        </p>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                          background: client.balance > 0 ? "rgba(34,197,94,0.1)" : client.balance < 0 ? "rgba(239,68,68,0.1)" : "var(--bg-glass)",
                          color: client.balance > 0 ? "#22c55e" : client.balance < 0 ? "#ef4444" : "var(--text-muted)"
                        }}>
                          {client.balance > 0 ? "Kredit" : client.balance < 0 ? "Borc" : "Sıfır"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setSelected(client); setModal("add_transaction") }} className="px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>+ Əməliyyat</button>
                        <button onClick={() => handleDelete(client.id)} className="p-1.5 rounded-xl text-sm" style={{ color: "var(--text-muted)" }}>🗑️</button>
                      </div>
                    </div>
                  </div>
                  {clientTxns.slice(0, 2).map(t => (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-xl mb-1" style={{ background: "var(--bg-glass)" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: t.type === "credit" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: t.type === "credit" ? "#22c55e" : "#ef4444" }}>{t.type === "credit" ? "+" : "−"}</span>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{t.description}</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(t.createdAt).toLocaleDateString("az-AZ")}</span>
                      </div>
                      <span className={`text-sm font-semibold ${t.type === "credit" ? "text-green-500" : "text-red-500"}`}>{t.type === "credit" ? "+" : "−"}{formatCurrency(t.amount)}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal === "add_balance" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6" style={modalCard}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Yeni müştəri balansı</h2><button onClick={() => setModal(null)} style={{ color: "var(--text-muted)" }} className="text-xl">✕</button></div>
            <form onSubmit={handleAddBalance} className="space-y-3">
              {[{ name: "clientName", label: "Müştəri adı *", required: true }, { name: "clientPhone", label: "Telefon" }].map(f => (
                <div key={f.name}><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{f.label}</label><input name={f.name} required={f.required} style={inputStyle} /></div>
              ))}
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Başlanğıc balans</label><input name="initialBalance" type="number" step="0.01" defaultValue={0} style={inputStyle} /></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Qeyd</label><input name="description" style={inputStyle} /></div>
              <div className="flex gap-3 pt-3"><button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-2xl text-sm" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>Ləğv et</button><button type="submit" className="flex-1 py-2.5 rounded-2xl text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>Əlavə et</button></div>
            </form>
          </div>
        </div>
      )}

      {modal === "add_transaction" && selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6" style={modalCard}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{selected.clientName} — Əməliyyat</h2><button onClick={() => { setModal(null); setSelected(null) }} style={{ color: "var(--text-muted)" }} className="text-xl">✕</button></div>
            <form onSubmit={handleAddTransaction} className="space-y-3">
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Növ</label><select name="type" style={inputStyle}><option value="credit">Kredit (+)</option><option value="debit">Debit (−)</option></select></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Məbləğ *</label><input name="amount" type="number" step="0.01" min="0" required style={inputStyle} /></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Açıqlama</label><input name="description" style={inputStyle} /></div>
              <div className="px-3 py-2 rounded-xl" style={{ background: "var(--bg-glass)" }}><p className="text-xs" style={{ color: "var(--text-muted)" }}>Cari balans: <span className={`font-bold ${selected.balance >= 0 ? "text-green-500" : "text-red-500"}`}>{formatCurrency(selected.balance)}</span></p></div>
              <div className="flex gap-3 pt-3"><button type="button" onClick={() => { setModal(null); setSelected(null) }} className="flex-1 py-2.5 rounded-2xl text-sm" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>Ləğv et</button><button type="submit" className="flex-1 py-2.5 rounded-2xl text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>Əlavə et</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
