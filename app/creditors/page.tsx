"use client"

import { useState, useEffect } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { formatCurrency } from "@/lib/calculations"
import { supabase } from "@/lib/supabase"
import { Plus, Trash2, Download } from "lucide-react"
import * as XLSX from "xlsx"

interface Creditor {
  id: string; name: string; contact: string; phone: string; email: string; notes: string; status: string
}
interface CreditorPayment {
  id: string; creditorId: string; amount: number; description: string; date: string; type: string
}

const card = { background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(20px)", borderRadius: "24px" }
const modalCard = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "24px" }
const inputStyle = { background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: "12px", padding: "10px 16px", fontSize: "14px", outline: "none", width: "100%" }

export default function CreditorsPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const [creditors, setCreditors] = useState<Creditor[]>([])
  const [payments, setPayments] = useState<CreditorPayment[]>([])
  const [selected, setSelected] = useState<Creditor | null>(null)
  const [modal, setModal] = useState<"creditor" | "payment" | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => { fetchBookings(); fetchCreditors(); fetchPayments(); setReady(true) }, [])

  async function fetchCreditors() {
    const { data } = await supabase.from("creditors").select("*").order("name")
    if (data) setCreditors(data.map((c: any) => ({ id: c.id, name: c.name, contact: c.contact ?? "", phone: c.phone ?? "", email: c.email ?? "", notes: c.notes ?? "", status: c.status ?? "active" })))
  }
  async function fetchPayments() {
    const { data } = await supabase.from("creditor_payments").select("*").order("date", { ascending: false })
    if (data) setPayments(data.map((p: any) => ({ id: p.id, creditorId: p.creditor_id, amount: p.amount, description: p.description ?? "", date: p.date, type: p.type ?? "payment" })))
  }

  function getStats(creditorId: string, creditorName: string) {
    const cb = bookings.filter(b => (b.vendor ?? "").toLowerCase() === creditorName.toLowerCase())
    const totalDebt = cb.reduce((s, b) => s + b.buyPrice, 0)
    const cp = payments.filter(p => p.creditorId === creditorId)
    const totalPaid = cp.reduce((s, p) => s + p.amount, 0)
    return { totalDebt, totalPaid, balance: totalPaid - totalDebt, bookingsCount: cb.length, creditorBookings: cb, creditorPayments: cp }
  }

  async function handleAddCreditor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = { name: fd.get("name") as string, contact: fd.get("contact") as string, phone: fd.get("phone") as string, email: fd.get("email") as string, notes: fd.get("notes") as string, status: "active" }
    if (selected) await supabase.from("creditors").update(data).eq("id", selected.id)
    else await supabase.from("creditors").insert(data)
    await fetchCreditors(); setModal(null); setSelected(null)
  }

  async function handleAddPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await supabase.from("creditor_payments").insert({ creditor_id: selected?.id, amount: Number(fd.get("amount")), description: fd.get("description") as string, date: fd.get("date") as string, type: fd.get("type") as string })
    await fetchPayments(); setModal(null)
  }

  async function handleDelete(id: string) {
    if (confirm("Silinsin?")) { await supabase.from("creditors").delete().eq("id", id); await fetchCreditors() }
  }

  function exportExcel(creditor: Creditor) {
    const stats = getStats(creditor.id, creditor.name)
    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.json_to_sheet(stats.creditorBookings.map(b => ({ "Müştəri": b.clientName, "İstiqamət": b.destination, "Tarix": b.departureDate, "Alış": b.buyPrice, "Satış": b.sellPrice })))
    XLSX.utils.book_append_sheet(wb, ws1, "Sifarişlər")
    XLSX.writeFile(wb, `${creditor.name}_hesabat.xlsx`)
  }

  if (!ready) return null

  const totalOwed = creditors.reduce((s, c) => { const st = getStats(c.id, c.name); return s + Math.max(0, st.totalDebt - st.totalPaid) }, 0)
  const totalCredit = creditors.reduce((s, c) => { const st = getStats(c.id, c.name); return s + Math.max(0, st.totalPaid - st.totalDebt) }, 0)

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Kreditorlar</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Vendor və təchizatçı idarəetməsi</p>
        </div>
        <button onClick={() => { setSelected(null); setModal("creditor") }}
          className="flex items-center gap-2 text-white px-4 py-2.5 rounded-2xl text-sm font-medium"
          style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
          <Plus size={16} />Yeni kreditor
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-6 text-white rounded-3xl" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
          <p className="text-sm opacity-80 mb-2">Ümumi borc</p>
          <p className="text-2xl font-bold">{formatCurrency(totalOwed)}</p>
        </div>
        <div className="p-5 rounded-3xl" style={card}>
          <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Kredit balansı</p>
          <p className="text-2xl font-bold text-green-500">{formatCurrency(totalCredit)}</p>
        </div>
        <div className="p-5 rounded-3xl" style={card}>
          <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Kreditorlar</p>
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{creditors.length}</p>
        </div>
      </div>

      <div className="space-y-4">
        {creditors.map(creditor => {
          const stats = getStats(creditor.id, creditor.name)
          return (
            <div key={creditor.id} className="p-6" style={card}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
                    {creditor.name[0]}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{creditor.name}</h3>
                    {creditor.contact && <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{creditor.contact}</p>}
                    {creditor.phone && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{creditor.phone}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => exportExcel(creditor)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                    <Download size={13} />Excel
                  </button>
                  <button onClick={() => { setSelected(creditor); setModal("payment") }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
                    <Plus size={13} />Ödəniş
                  </button>
                  <button onClick={() => { setSelected(creditor); setModal("creditor") }} className="p-1.5 rounded-xl text-sm" style={{ color: "var(--text-muted)" }}>✏️</button>
                  <button onClick={() => handleDelete(creditor.id)} className="p-1.5 rounded-xl" style={{ color: "var(--text-muted)" }}><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Ümumi alış", value: formatCurrency(stats.totalDebt), color: "var(--text-primary)", bg: "var(--bg-glass)" },
                  { label: "Ödənilmiş", value: formatCurrency(stats.totalPaid), color: "#6366f1", bg: "rgba(99,102,241,0.08)" },
                  { label: stats.balance >= 0 ? "Kredit" : "Borc", value: formatCurrency(Math.abs(stats.balance)), color: stats.balance >= 0 ? "#22c55e" : "#ef4444", bg: stats.balance >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)" },
                  { label: "Sifarişlər", value: stats.bookingsCount, color: "var(--text-primary)", bg: "var(--bg-glass)" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className="p-3 rounded-2xl" style={{ background: bg }}>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
                    <p className="text-sm font-bold" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>

              {stats.creditorPayments.slice(0, 2).length > 0 && (
                <div className="mt-3 space-y-1">
                  {stats.creditorPayments.slice(0, 2).map(p => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: "var(--bg-glass)" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>{p.type === "payment" ? "Ödəniş" : "Kredit"}</span>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{p.description}</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{p.date}</span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: "#6366f1" }}>{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {modal === "creditor" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6" style={modalCard}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{selected ? "Redaktə et" : "Yeni kreditor"}</h2>
              <button onClick={() => { setModal(null); setSelected(null) }} style={{ color: "var(--text-muted)" }} className="text-xl">✕</button>
            </div>
            <form onSubmit={handleAddCreditor} className="space-y-3">
              {[{ name: "name", label: "Ad *", required: true, placeholder: "Məs: Amadeus" }, { name: "contact", label: "Əlaqə şəxsi", placeholder: "" }, { name: "phone", label: "Telefon", placeholder: "" }, { name: "email", label: "Email", placeholder: "" }].map(f => (
                <div key={f.name}>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{f.label}</label>
                  <input name={f.name} defaultValue={(selected as any)?.[f.name] ?? ""} required={f.required} placeholder={f.placeholder} style={inputStyle} />
                </div>
              ))}
              <div className="flex gap-3 pt-3 border-t" style={{ borderColor: "var(--border-color)" }}>
                <button type="button" onClick={() => { setModal(null); setSelected(null) }} className="flex-1 py-2.5 rounded-2xl text-sm font-medium" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>Ləğv et</button>
                <button type="submit" className="flex-1 py-2.5 rounded-2xl text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>{selected ? "Yadda saxla" : "Əlavə et"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "payment" && selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6" style={modalCard}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{selected.name} — Ödəniş</h2>
              <button onClick={() => { setModal(null); setSelected(null) }} style={{ color: "var(--text-muted)" }} className="text-xl">✕</button>
            </div>
            <form onSubmit={handleAddPayment} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Növ</label>
                <select name="type" style={inputStyle}>
                  <option value="payment">Ödəniş (biz ödədik)</option>
                  <option value="credit">Kredit (vendor verdi)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Məbləğ (AZN) *</label>
                <input name="amount" type="number" step="0.01" min="0" required style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Açıqlama</label>
                <input name="description" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Tarix</label>
                <input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} style={inputStyle} />
              </div>
              <div className="flex gap-3 pt-3 border-t" style={{ borderColor: "var(--border-color)" }}>
                <button type="button" onClick={() => { setModal(null); setSelected(null) }} className="flex-1 py-2.5 rounded-2xl text-sm font-medium" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>Ləğv et</button>
                <button type="submit" className="flex-1 py-2.5 rounded-2xl text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>Əlavə et</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
