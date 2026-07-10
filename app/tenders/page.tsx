"use client"
import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { formatCurrency } from "@/lib/calculations"
import {
  Plus, Search, X, Edit3, Trash2, Eye, CheckCircle2,
  Clock, XCircle, Trophy, ArrowLeft, DollarSign,
  TrendingUp, TrendingDown, Users, CreditCard, Package,
  ChevronRight, AlertCircle, Settings
} from "lucide-react"

const card = { background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "24px" }
const modalCard = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "24px" }
const inputStyle = { background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: "12px", padding: "10px 14px", fontSize: "14px", outline: "none", width: "100%" }

const STATUS_META: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  active:    { label: "Aktiv",      color: "#6366f1", bg: "rgba(99,102,241,0.12)", Icon: Clock },
  won:       { label: "Qazanıldı",  color: "#22c55e", bg: "rgba(34,197,94,0.12)",  Icon: CheckCircle2 },
  lost:      { label: "Uduldu",     color: "#ef4444", bg: "rgba(239,68,68,0.12)",  Icon: XCircle },
  completed: { label: "Tamamlandı", color: "#10b981", bg: "rgba(16,185,129,0.12)", Icon: Trophy },
  pending:   { label: "Gözləyir",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)", Icon: Clock },
}
function statusMeta(s: string) { return STATUS_META[s] ?? STATUS_META.active }
function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}
const ALLOWED_ROLES = ["it_admin", "boss", "direktor", "tender_menecer"]

// ─── Tender Project Detail ────────────────────────────────────────────────────
function TenderProject({ tender, onBack, canEdit, profile }: { tender: any; onBack: () => void; canEdit: boolean; profile: any }) {
  const [items, setItems] = useState<any[]>([])
  const [debtors, setDebtors] = useState<any[]>([])
  const [creditors, setCreditors] = useState<any[]>([])
  const [tab, setTab] = useState<"items" | "debtors" | "creditors">("items")
  const [modal, setModal] = useState<null | "item" | "debtor" | "creditor">(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])

  // Item form
  const [itemForm, setItemForm] = useState({ service_name: "", description: "", buy_price: "", sell_price: "", quantity: "1" })
  // Debtor/Creditor form
  const [partyForm, setPartyForm] = useState({ name: "", phone: "", amount: "", paid: "", due_date: "", notes: "" })

  async function load() {
    const [{ data: it }, { data: db }, { data: cr }, { data: sv }] = await Promise.all([
      supabase.from("tender_items").select("*").eq("tender_id", tender.id).order("created_at"),
      supabase.from("tender_debtors").select("*").eq("tender_id", tender.id).order("created_at"),
      supabase.from("tender_creditors").select("*").eq("tender_id", tender.id).order("created_at"),
      supabase.from("tender_services").select("*").order("name"),
    ])
    setItems(it ?? [])
    setDebtors(db ?? [])
    setCreditors(cr ?? [])
    setServices(sv ?? [])
  }
  useEffect(() => { load() }, [tender.id])

  // Stats
  const totalSell = items.reduce((s, i) => s + (i.sell_price * i.quantity), 0)
  const totalBuy  = items.reduce((s, i) => s + (i.buy_price  * i.quantity), 0)
  const profit    = totalSell - totalBuy
  const totalDebt = debtors.reduce((s, d) => s + (d.amount - d.paid), 0)
  const totalOwed = creditors.reduce((s, c) => s + (c.amount - c.paid), 0)

  // Save item
  async function saveItem() {
    const payload = {
      tender_id: tender.id,
      service_name: itemForm.service_name,
      description: itemForm.description,
      buy_price: Number(itemForm.buy_price) || 0,
      sell_price: Number(itemForm.sell_price) || 0,
      quantity: Number(itemForm.quantity) || 1,
    }
    if (editingItem) {
      await supabase.from("tender_items").update(payload).eq("id", editingItem.id)
    } else {
      await supabase.from("tender_items").insert(payload)
    }
    setModal(null); setEditingItem(null)
    setItemForm({ service_name: "", description: "", buy_price: "", sell_price: "", quantity: "1" })
    load()
  }

  // Save party (debtor/creditor)
  async function saveParty(type: "debtor" | "creditor") {
    const table = type === "debtor" ? "tender_debtors" : "tender_creditors"
    const payload = {
      tender_id: tender.id,
      name: partyForm.name,
      phone: partyForm.phone,
      amount: Number(partyForm.amount) || 0,
      paid: Number(partyForm.paid) || 0,
      due_date: partyForm.due_date || null,
      notes: partyForm.notes,
    }
    if (editingItem) {
      await supabase.from(table).update(payload).eq("id", editingItem.id)
    } else {
      await supabase.from(table).insert(payload)
    }
    setModal(null); setEditingItem(null)
    setPartyForm({ name: "", phone: "", amount: "", paid: "", due_date: "", notes: "" })
    load()
  }

  async function deleteRow(table: string, id: string) {
    if (!confirm("Silinsin?")) return
    await supabase.from(table).delete().eq("id", id)
    load()
  }

  function openItemModal(item?: any) {
    setEditingItem(item ?? null)
    setItemForm(item ? { service_name: item.service_name, description: item.description ?? "", buy_price: String(item.buy_price), sell_price: String(item.sell_price), quantity: String(item.quantity) } : { service_name: "", description: "", buy_price: "", sell_price: "", quantity: "1" })
    setModal("item")
  }

  function openPartyModal(type: "debtor" | "creditor", item?: any) {
    setEditingItem(item ?? null)
    setPartyForm(item ? { name: item.name, phone: item.phone ?? "", amount: String(item.amount), paid: String(item.paid), due_date: item.due_date ?? "", notes: item.notes ?? "" } : { name: "", phone: "", amount: "", paid: "", due_date: "", notes: "" })
    setModal(type)
  }

  const sm = statusMeta(tender.status)
  const StatusIcon = sm.Icon

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium mb-5 transition-all hover:scale-[1.02]"
        style={{ color: "var(--text-secondary)" }}>
        <ArrowLeft size={16} /> Geri
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{tender.title}</h1>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl"
              style={{ background: sm.bg, color: sm.color }}>
              <StatusIcon size={11} />{sm.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
            {tender.client_name && <span>👤 {tender.client_name}</span>}
            {tender.client_phone && <span>📞 {tender.client_phone}</span>}
            {tender.event_date && <span>📅 {formatDate(tender.event_date)}</span>}
            {tender.manager && <span>👨‍💼 {tender.manager}</span>}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Satış", value: formatCurrency(totalSell), color: "#22c55e", bg: "rgba(34,197,94,0.12)", Icon: TrendingUp },
          { label: "Xərc", value: formatCurrency(totalBuy), color: "#ef4444", bg: "rgba(239,68,68,0.12)", Icon: TrendingDown },
          { label: "Mənfəət", value: formatCurrency(profit), color: profit >= 0 ? "#22c55e" : "#ef4444", bg: profit >= 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", Icon: DollarSign },
          { label: "Debitor", value: formatCurrency(totalDebt), color: "#f59e0b", bg: "rgba(245,158,11,0.12)", Icon: Users },
          { label: "Kreditor", value: formatCurrency(totalOwed), color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", Icon: CreditCard },
        ].map(({ label, value, color, bg, Icon }) => (
          <div key={label} className="p-4 rounded-2xl" style={card}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={13} style={{ color }} />
              </div>
            </div>
            <p className="font-black text-lg tabular-nums" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Services tags */}
      {Array.isArray(tender.services) && tender.services.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {tender.services.map((s: string) => (
            <span key={s} className="text-xs font-medium px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>{s}</span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl mb-5 w-fit" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
        {[
          { key: "items", label: "Xidmətlər", count: items.length, Icon: Package },
          { key: "debtors", label: "Debitorlar", count: debtors.length, Icon: Users },
          { key: "creditors", label: "Kreditorlar", count: creditors.length, Icon: CreditCard },
        ].map(({ key, label, count, Icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === key ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent",
              color: tab === key ? "#fff" : "var(--text-secondary)",
              boxShadow: tab === key ? "0 2px 8px rgba(99,102,241,0.3)" : "none"
            }}>
            <Icon size={14} />{label}
            {count > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: tab === key ? "rgba(255,255,255,0.2)" : "var(--bg-glass)" }}>{count}</span>}
          </button>
        ))}
      </div>

      {/* Items tab */}
      {tab === "items" && (
        <div className="rounded-3xl overflow-hidden" style={card}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Xidmətlər və qiymətlər</h3>
            {canEdit && (
              <button onClick={() => openItemModal()}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-white"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                <Plus size={12} />Əlavə et
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <Package size={28} style={{ color: "var(--text-muted)", margin: "0 auto 8px" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Xidmət yoxdur</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--bg-glass)", borderBottom: "1px solid var(--border-color)" }}>
                    {["Xidmət", "Açıqlama", "Say", "Alış qiyməti", "Satış qiyməti", "Mənfəət", ""].map(h => (
                      <th key={h} className="text-left text-xs font-bold uppercase tracking-wider px-4 py-3" style={{ color: "var(--text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const itemProfit = (item.sell_price - item.buy_price) * item.quantity
                    return (
                      <tr key={item.id} className="group transition-all" style={{ borderBottom: "1px solid var(--border-color)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-xl" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
                            {item.service_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>{item.description || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{item.quantity}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold tabular-nums text-sm text-red-400">{formatCurrency(item.buy_price)}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Cəmi: {formatCurrency(item.buy_price * item.quantity)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold tabular-nums text-sm" style={{ color: "#22c55e" }}>{formatCurrency(item.sell_price)}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Cəmi: {formatCurrency(item.sell_price * item.quantity)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold tabular-nums text-sm px-2 py-0.5 rounded-lg ${itemProfit >= 0 ? "text-green-500" : "text-red-500"}`}
                            style={{ background: itemProfit >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)" }}>
                            {itemProfit >= 0 ? "+" : ""}{formatCurrency(itemProfit)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {canEdit && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => openItemModal(item)} className="p-1.5 rounded-xl" style={{ color: "#6366f1", background: "rgba(99,102,241,0.1)" }}><Edit3 size={12} /></button>
                              <button onClick={() => deleteRow("tender_items", item.id)} className="p-1.5 rounded-xl" style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}><Trash2 size={12} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--border-color)", background: "var(--bg-glass)" }}>
                    <td className="px-4 py-3 text-xs font-bold" style={{ color: "var(--text-secondary)" }} colSpan={3}>CƏMI</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-sm text-red-400">{formatCurrency(totalBuy)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-sm" style={{ color: "#22c55e" }}>{formatCurrency(totalSell)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-black tabular-nums text-sm px-2 py-0.5 rounded-lg ${profit >= 0 ? "text-green-500" : "text-red-500"}`}
                        style={{ background: profit >= 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)" }}>
                        {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
                      </span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Debtors/Creditors tab */}
      {(tab === "debtors" || tab === "creditors") && (() => {
        const isDebtor = tab === "debtors"
        const rows = isDebtor ? debtors : creditors
        const table = isDebtor ? "tender_debtors" : "tender_creditors"
        const totalRemaining = rows.reduce((s, r) => s + (r.amount - r.paid), 0)
        return (
          <div className="rounded-3xl overflow-hidden" style={card}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <div>
                <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {isDebtor ? "Debitorlar (bizə borclu)" : "Kreditorlar (biz borclu)"}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Ümumi qalıq: <span className="font-bold" style={{ color: isDebtor ? "#f59e0b" : "#8b5cf6" }}>{formatCurrency(totalRemaining)}</span>
                </p>
              </div>
              {canEdit && (
                <button onClick={() => openPartyModal(isDebtor ? "debtor" : "creditor")}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-white"
                  style={{ background: isDebtor ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : "linear-gradient(135deg,#8b5cf6,#6366f1)" }}>
                  <Plus size={12} />Əlavə et
                </button>
              )}
            </div>
            {rows.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 size={28} className="text-green-500 mx-auto mb-2" />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{isDebtor ? "Debitor yoxdur" : "Kreditor yoxdur"}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--bg-glass)", borderBottom: "1px solid var(--border-color)" }}>
                      {["Ad", "Telefon", "Məbləğ", "Ödənilib", "Qalıq", "Son tarix", "Qeyd", ""].map(h => (
                        <th key={h} className="text-left text-xs font-bold uppercase tracking-wider px-4 py-3" style={{ color: "var(--text-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => {
                      const remaining = row.amount - row.paid
                      const isPaid = remaining <= 0
                      return (
                        <tr key={row.id} className="group transition-all" style={{ borderBottom: "1px solid var(--border-color)" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{row.name}</p>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>{row.phone || "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{formatCurrency(row.amount)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold tabular-nums text-sm text-green-500">{formatCurrency(row.paid)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isPaid
                              ? <span className="text-xs font-bold px-2 py-0.5 rounded-lg text-green-500" style={{ background: "rgba(34,197,94,0.1)" }}>✓ Ödənilib</span>
                              : <span className="font-bold tabular-nums text-sm px-2 py-0.5 rounded-lg" style={{ color: isDebtor ? "#f59e0b" : "#ef4444", background: isDebtor ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)" }}>{formatCurrency(remaining)}</span>}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: row.due_date && new Date(row.due_date) < new Date() ? "#ef4444" : "var(--text-secondary)" }}>
                            {formatDate(row.due_date)}
                          </td>
                          <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: "var(--text-muted)" }}>{row.notes || "—"}</td>
                          <td className="px-4 py-3">
                            {canEdit && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => openPartyModal(isDebtor ? "debtor" : "creditor", row)} className="p-1.5 rounded-xl" style={{ color: "#6366f1", background: "rgba(99,102,241,0.1)" }}><Edit3 size={12} /></button>
                                <button onClick={() => deleteRow(table, row.id)} className="p-1.5 rounded-xl" style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}><Trash2 size={12} /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })()}

      {/* Item Modal */}
      {modal === "item" && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" style={{ backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md p-6" style={modalCard}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{editingItem ? "Xidməti düzəlt" : "Yeni xidmət"}</h2>
              <button onClick={() => setModal(null)} style={{ color: "var(--text-muted)" }}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Xidmət *</label>
                <select value={itemForm.service_name} onChange={e => setItemForm(f => ({ ...f, service_name: e.target.value }))} style={inputStyle}>
                  <option value="">Seçin...</option>
                  {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Açıqlama</label>
                <input value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} placeholder="Ətraflı..." style={inputStyle} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Say</label>
                  <input type="number" value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} min="1" style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Alış (AZN)</label>
                  <input type="number" value={itemForm.buy_price} onChange={e => setItemForm(f => ({ ...f, buy_price: e.target.value }))} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Satış (AZN)</label>
                  <input type="number" value={itemForm.sell_price} onChange={e => setItemForm(f => ({ ...f, sell_price: e.target.value }))} placeholder="0" style={inputStyle} />
                </div>
              </div>
              {(itemForm.buy_price || itemForm.sell_price) && (
                <div className="p-3 rounded-2xl flex justify-between" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Mənfəət (vahid):</span>
                  <span className="text-sm font-bold" style={{ color: (Number(itemForm.sell_price) - Number(itemForm.buy_price)) >= 0 ? "#22c55e" : "#ef4444" }}>
                    {formatCurrency((Number(itemForm.sell_price) - Number(itemForm.buy_price)) * Number(itemForm.quantity || 1))}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={saveItem} disabled={!itemForm.service_name}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                {editingItem ? "Yadda saxla" : "Əlavə et"}
              </button>
              <button onClick={() => setModal(null)} className="px-5 py-3 rounded-2xl text-sm"
                style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>Ləğv</button>
            </div>
          </div>
        </div>
      )}

      {/* Debtor/Creditor Modal */}
      {(modal === "debtor" || modal === "creditor") && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" style={{ backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md p-6" style={modalCard}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                {editingItem ? "Düzəlt" : modal === "debtor" ? "Yeni debitor" : "Yeni kreditor"}
              </h2>
              <button onClick={() => setModal(null)} style={{ color: "var(--text-muted)" }}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Ad *</label>
                  <input value={partyForm.name} onChange={e => setPartyForm(f => ({ ...f, name: e.target.value }))} placeholder="Ad Soyad" style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Telefon</label>
                  <input value={partyForm.phone} onChange={e => setPartyForm(f => ({ ...f, phone: e.target.value }))} placeholder="+994..." style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Məbləğ (AZN)</label>
                  <input type="number" value={partyForm.amount} onChange={e => setPartyForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Ödənilib (AZN)</label>
                  <input type="number" value={partyForm.paid} onChange={e => setPartyForm(f => ({ ...f, paid: e.target.value }))} placeholder="0" style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Son ödəniş tarixi</label>
                <input type="date" value={partyForm.due_date} onChange={e => setPartyForm(f => ({ ...f, due_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Qeyd</label>
                <input value={partyForm.notes} onChange={e => setPartyForm(f => ({ ...f, notes: e.target.value }))} placeholder="Əlavə qeyd..." style={inputStyle} />
              </div>
              {(partyForm.amount || partyForm.paid) && (
                <div className="p-3 rounded-2xl flex justify-between" style={{ background: modal === "debtor" ? "rgba(245,158,11,0.08)" : "rgba(139,92,246,0.08)", border: `1px solid ${modal === "debtor" ? "rgba(245,158,11,0.2)" : "rgba(139,92,246,0.2)"}` }}>
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Qalıq:</span>
                  <span className="text-sm font-bold" style={{ color: modal === "debtor" ? "#f59e0b" : "#8b5cf6" }}>
                    {formatCurrency(Math.max(0, Number(partyForm.amount) - Number(partyForm.paid)))}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => saveParty(modal as "debtor" | "creditor")} disabled={!partyForm.name}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: modal === "debtor" ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : "linear-gradient(135deg,#8b5cf6,#6366f1)" }}>
                {editingItem ? "Yadda saxla" : "Əlavə et"}
              </button>
              <button onClick={() => setModal(null)} className="px-5 py-3 rounded-2xl text-sm"
                style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>Ləğv</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tenders List ─────────────────────────────────────────────────────────────
export default function TendersPage() {
  const { profile } = useUserRole()
  const [tenders, setTenders] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTender, setActiveTender] = useState<any>(null)
  const [modal, setModal] = useState<"create" | "edit" | "services" | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [saving, setSaving] = useState(false)
  const [newService, setNewService] = useState("")
  const [form, setForm] = useState({ title: "", client_name: "", client_phone: "", event_date: "", deadline: "", description: "", budget: "", cost: "", status: "active", manager: "", notes: "", selected_services: [] as string[] })

  async function fetchTenders() {
    setLoading(true)
    const { data } = await supabase.from("tenders").select("*").order("created_at", { ascending: false })
    setTenders(data ?? [])
    setLoading(false)
  }
  async function fetchServices() {
    const { data } = await supabase.from("tender_services").select("*").order("name")
    setServices(data ?? [])
  }
  useEffect(() => { fetchTenders(); fetchServices() }, [])

  if (!profile) return null
  if (!ALLOWED_ROLES.includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center"><Trophy size={40} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} /><p className="font-semibold" style={{ color: "var(--text-primary)" }}>Giriş qadağandır</p></div>
      </div>
    )
  }

  if (activeTender) {
    return <TenderProject tender={activeTender} onBack={() => setActiveTender(null)} canEdit={["it_admin", "direktor", "tender_menecer"].includes(profile.role)} profile={profile} />
  }

  const canEdit = ["it_admin", "direktor", "tender_menecer"].includes(profile.role)

  function openCreate() {
    setForm({ title: "", client_name: "", client_phone: "", event_date: "", deadline: "", description: "", budget: "", cost: "", status: "active", manager: profile?.fullName ?? "", notes: "", selected_services: [] })
    setSelected(null); setModal("create")
  }
  function openEdit(t: any) {
    setForm({ title: t.title ?? "", client_name: t.client_name ?? "", client_phone: t.client_phone ?? "", event_date: t.event_date ?? "", deadline: t.deadline ?? "", description: t.description ?? "", budget: String(t.budget ?? ""), cost: String(t.cost ?? ""), status: t.status ?? "active", manager: t.manager ?? "", notes: t.notes ?? "", selected_services: Array.isArray(t.services) ? t.services : [] })
    setSelected(t); setModal("edit")
  }
  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = { title: form.title, client_name: form.client_name, client_phone: form.client_phone, event_date: form.event_date || null, deadline: form.deadline || null, description: form.description, budget: Number(form.budget) || 0, cost: Number(form.cost) || 0, status: form.status, manager: form.manager, notes: form.notes, services: form.selected_services, updated_at: new Date().toISOString() }
    if (modal === "edit" && selected) { await supabase.from("tenders").update(payload).eq("id", selected.id) }
    else { await supabase.from("tenders").insert({ ...payload, created_by: profile?.fullName ?? "" }) }
    setSaving(false); setModal(null); fetchTenders()
  }
  async function handleDelete(id: string) {
    if (!confirm("Silinsin?")) return
    await supabase.from("tenders").delete().eq("id", id); fetchTenders()
  }
  async function handleAddService() {
    if (!newService.trim()) return
    await supabase.from("tender_services").insert({ name: newService.trim(), created_by: profile?.fullName ?? "" })
    setNewService(""); fetchServices()
  }
  function toggleService(name: string) {
    setForm(f => ({ ...f, selected_services: f.selected_services.includes(name) ? f.selected_services.filter(s => s !== name) : [...f.selected_services, name] }))
  }

  const filtered = tenders.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false
    if (search) { const q = search.toLowerCase(); if (!(t.title ?? "").toLowerCase().includes(q) && !(t.client_name ?? "").toLowerCase().includes(q)) return false }
    return true
  })

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Tenderlər</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{tenders.length} layihə</p>
        </div>
        <div className="flex gap-2">
          {canEdit && <button onClick={() => setModal("services")} className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-sm font-medium" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}><Settings size={14} />Xidmətlər</button>}
          {canEdit && <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}><Plus size={15} />Yeni tender</button>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Cəmi", value: tenders.length, color: "#6366f1" },
          { label: "Aktiv", value: tenders.filter(t => t.status === "active").length, color: "#f59e0b" },
          { label: "Qazanıldı", value: tenders.filter(t => t.status === "won").length, color: "#22c55e" },
          { label: "Tamamlandı", value: tenders.filter(t => t.status === "completed").length, color: "#10b981" },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-4 rounded-2xl" style={card}>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
            <p className="text-2xl font-black tabular-nums" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[200px]" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
          <Search size={13} style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Axtar..." className="bg-transparent text-xs outline-none w-full" style={{ color: "var(--text-primary)" }} />
          {search && <button onClick={() => setSearch("")}><X size={12} style={{ color: "var(--text-muted)" }} /></button>}
        </div>
        <div className="flex gap-1.5">
          {["all", "active", "pending", "won", "completed", "lost"].map(s => {
            const isActive = filterStatus === s
            const meta = s !== "all" ? statusMeta(s) : null
            return <button key={s} onClick={() => setFilterStatus(s)} className="text-xs font-medium px-3 py-2 rounded-xl transition-all" style={{ background: isActive ? (meta?.color ?? "#6366f1") : "var(--bg-glass)", color: isActive ? "#fff" : "var(--text-secondary)", border: "1px solid " + (isActive ? "transparent" : "var(--border-color)") }}>{s === "all" ? "Hamısı" : meta?.label}</button>
          })}
        </div>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-3xl animate-pulse" style={{ background: "var(--bg-glass)" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3" style={card}>
          <Trophy size={40} style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Tender tapılmadı</p>
          {canEdit && !search && <button onClick={openCreate} className="text-xs font-semibold px-4 py-2 rounded-xl text-white mt-1" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>+ Yeni tender yarat</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(t => {
            const sm = statusMeta(t.status)
            const Icon = sm.Icon
            const profit = (t.budget ?? 0) - (t.cost ?? 0)
            return (
              <div key={t.id} className="rounded-3xl overflow-hidden transition-all hover:scale-[1.01] hover:shadow-xl cursor-pointer"
                style={card} onClick={() => setActiveTender(t)}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="font-bold text-base leading-tight" style={{ color: "var(--text-primary)" }}>{t.title}</p>
                      {t.client_name && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>👤 {t.client_name}</p>}
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-xl flex-shrink-0" style={{ background: sm.bg, color: sm.color }}>
                      <Icon size={10} />{sm.label}
                    </span>
                  </div>

                  {/* Services */}
                  {Array.isArray(t.services) && t.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {t.services.slice(0, 4).map((s: string) => (
                        <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-lg" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>{s}</span>
                      ))}
                      {t.services.length > 4 && <span className="text-[10px] px-2 py-0.5 rounded-lg" style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>+{t.services.length - 4}</span>}
                    </div>
                  )}

                  {/* Financials */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: "Büdcə", value: formatCurrency(t.budget ?? 0), color: "var(--text-primary)" },
                      { label: "Xərc", value: formatCurrency(t.cost ?? 0), color: "#ef4444" },
                      { label: "Mənfəət", value: formatCurrency(profit), color: profit >= 0 ? "#22c55e" : "#ef4444" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="p-2 rounded-xl text-center" style={{ background: "var(--bg-glass)" }}>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</p>
                        <p className="text-xs font-bold tabular-nums mt-0.5" style={{ color }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      {t.event_date && <span>📅 {formatDate(t.event_date)}</span>}
                      {t.manager && <span>👤 {t.manager.split(" ")[0]}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {canEdit && <button onClick={e => { e.stopPropagation(); openEdit(t) }} className="p-1.5 rounded-xl" style={{ color: "var(--text-secondary)", background: "var(--bg-glass)" }}><Edit3 size={12} /></button>}
                      {profile.role === "it_admin" && <button onClick={e => { e.stopPropagation(); handleDelete(t.id) }} className="p-1.5 rounded-xl" style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}><Trash2 size={12} /></button>}
                      <div className="flex items-center gap-1 text-xs font-medium" style={{ color: "#6366f1" }}>Aç <ChevronRight size={12} /></div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" style={{ backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-2xl my-4 p-6" style={modalCard}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{modal === "edit" ? "Tenderi düzəlt" : "Yeni tender"}</h2>
              <button onClick={() => setModal(null)} style={{ color: "var(--text-muted)" }}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2"><label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Tender adı *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Layihənin adı" style={inputStyle} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Müştəri</label><input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Müştəri adı" style={inputStyle} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Telefon</label><input value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} placeholder="+994..." style={inputStyle} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Tədbir tarixi</label><input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} style={inputStyle} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Deadline</label><input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={inputStyle} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Büdcə (AZN)</label><input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" style={inputStyle} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Xərc (AZN)</label><input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" style={inputStyle} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Menecer</label><input value={form.manager} onChange={e => setForm(f => ({ ...f, manager: e.target.value }))} placeholder="Ad Soyad" style={inputStyle} /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                  <option value="active">Aktiv</option><option value="pending">Gözləyir</option><option value="won">Qazanıldı</option><option value="completed">Tamamlandı</option><option value="lost">Uduldu</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>Xidmətlər</label>
              <div className="flex flex-wrap gap-2 p-3 rounded-2xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
                {services.map(s => {
                  const sel = form.selected_services.includes(s.name)
                  return <button key={s.id} onClick={() => toggleService(s.name)} className="text-xs font-medium px-3 py-1.5 rounded-xl transition-all" style={{ background: sel ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--bg-secondary)", color: sel ? "#fff" : "var(--text-secondary)", border: "1px solid " + (sel ? "transparent" : "var(--border-color)") }}>{s.name}</button>
                })}
              </div>
            </div>
            <div className="mb-4"><label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Açıqlama</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "none" }} /></div>
            <div className="mb-5"><label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Qeydlər</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "none" }} /></div>
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving || !form.title.trim()} className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>{saving ? "Saxlanılır..." : modal === "edit" ? "Yadda saxla" : "Yarat"}</button>
              <button onClick={() => setModal(null)} className="px-6 py-3 rounded-2xl text-sm" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>Ləğv</button>
            </div>
          </div>
        </div>
      )}

      {/* Services Modal */}
      {modal === "services" && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" style={{ backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm p-6" style={modalCard}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Xidmətlər</h2>
              <button onClick={() => setModal(null)} style={{ color: "var(--text-muted)" }}><X size={18} /></button>
            </div>
            <div className="flex gap-2 mb-4">
              <input value={newService} onChange={e => setNewService(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddService()} placeholder="Yeni xidmət..." style={{ ...inputStyle, flex: 1 }} />
              <button onClick={handleAddService} disabled={!newService.trim()} className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", flexShrink: 0 }}><Plus size={16} /></button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {services.map(s => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{s.name}</span>
                  {s.created_by !== "system" && <button onClick={async () => { await supabase.from("tender_services").delete().eq("id", s.id); fetchServices() }} className="p-1 rounded-lg" style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}><X size={12} /></button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
