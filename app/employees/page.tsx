"use client"

import { useState, useEffect } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { formatCurrency } from "@/lib/calculations"
import { supabase } from "@/lib/supabase"
import { Plus, Trash2, Users, TrendingUp, DollarSign, Award } from "lucide-react"

interface Employee { id: string; name: string; position: string; baseSalary: number; commissionPercent: number; phone: string; email: string; status: "active" | "inactive" }

const card = { background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(20px)", borderRadius: "24px" }
const modalCard = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "24px" }
const inputStyle = { background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: "12px", padding: "10px 16px", fontSize: "14px", outline: "none", width: "100%" }

const gradients = [
  "linear-gradient(135deg, #ef4444, #f97316)",
  "linear-gradient(135deg, #3b82f6, #06b6d4)",
  "linear-gradient(135deg, #10b981, #34d399)",
  "linear-gradient(135deg, #8b5cf6, #6366f1)",
  "linear-gradient(135deg, #f59e0b, #fbbf24)",
  "linear-gradient(135deg, #ec4899, #f43f5e)",
]

export default function EmployeesPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => { fetchBookings(); fetchEmployees(); setReady(true) }, [])

  async function fetchEmployees() {
    const { data } = await supabase.from("employees").select("*").order("created_at", { ascending: false })
    if (data) setEmployees(data.map((e: any) => ({ id: e.id, name: e.name, position: e.position ?? "", baseSalary: e.base_salary ?? 0, commissionPercent: e.commission_percent ?? 5, phone: e.phone ?? "", email: e.email ?? "", status: e.status ?? "active" })))
    setLoading(false)
  }

  function getStats(name: string) {
    const eb = bookings.filter(b => b.manager === name)
    return { totalRevenue: eb.reduce((s, b) => s + b.sellPrice, 0), totalProfit: eb.reduce((s, b) => s + b.profit, 0), totalCommission: eb.reduce((s, b) => s + b.commissionAmount, 0), bookingsCount: eb.length }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = { name: fd.get("name") as string, position: fd.get("position") as string, base_salary: Number(fd.get("baseSalary")), commission_percent: Number(fd.get("commissionPercent")), phone: fd.get("phone") as string, email: fd.get("email") as string, status: fd.get("status") as string }
    if (selected) await supabase.from("employees").update(data).eq("id", selected.id)
    else await supabase.from("employees").insert(data)
    await fetchEmployees(); setModal(false); setSelected(null)
  }

  async function handleDelete(id: string) {
    if (confirm("Silinsin?")) { await supabase.from("employees").delete().eq("id", id); await fetchEmployees() }
  }

  if (!ready) return null

  const totalBaseSalary = employees.filter(e => e.status === "active").reduce((s, e) => s + e.baseSalary, 0)
  const totalCommissions = employees.reduce((s, e) => s + getStats(e.name).totalCommission, 0)

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>İşçilər</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Əməkdaşlar və maaş idarəetməsi</p>
        </div>
        <button onClick={() => { setSelected(null); setModal(true) }} className="flex items-center gap-2 text-white px-4 py-2.5 rounded-2xl text-sm font-medium" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
          <Plus size={16} />Yeni işçi
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-6 text-white rounded-3xl" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
          <div className="flex items-center justify-between mb-3"><p className="text-sm opacity-80">Aktiv işçilər</p><Users size={18} className="opacity-70" /></div>
          <p className="text-2xl font-bold">{employees.filter(e => e.status === "active").length}</p>
        </div>
        {[
          { label: "Maaş fondu", value: formatCurrency(totalBaseSalary), icon: DollarSign, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
          { label: "Komissiyalar", value: formatCurrency(totalCommissions), icon: TrendingUp, color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
          { label: "Ümumi ödəniş", value: formatCurrency(totalBaseSalary + totalCommissions), icon: Award, color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="p-5 rounded-3xl" style={card}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}><Icon size={14} style={{ color }} /></div>
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-8 text-center rounded-3xl" style={{ ...card, color: "var(--text-muted)" }}>Yüklənir...</div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center rounded-3xl" style={{ ...card, color: "var(--text-muted)" }}><Users size={32} className="mx-auto mb-3 opacity-40" /><p>Hələ işçi yoxdur</p></div>
        ) : employees.map((emp, idx) => {
          const stats = getStats(emp.name)
          return (
            <div key={emp.id} className="p-6 rounded-3xl" style={card}>
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl" style={{ background: gradients[idx % gradients.length] }}>
                    {emp.name[0]}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{emp.name}</h3>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{emp.position}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block" style={{ background: emp.status === "active" ? "rgba(34,197,94,0.1)" : "var(--bg-glass)", color: emp.status === "active" ? "#22c55e" : "var(--text-muted)" }}>
                      {emp.status === "active" ? "Aktiv" : "Deaktiv"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSelected(emp); setModal(true) }} className="p-2 rounded-xl" style={{ color: "var(--text-muted)" }}>✏️</button>
                  <button onClick={() => handleDelete(emp.id)} className="p-2 rounded-xl" style={{ color: "var(--text-muted)" }}><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-3">
                {[
                  { label: "Əsas maaş", value: formatCurrency(emp.baseSalary), color: "var(--text-primary)" },
                  { label: "Komissiya %", value: `${emp.commissionPercent}%`, color: "var(--text-primary)" },
                  { label: "Sifarişlər", value: stats.bookingsCount, color: "#6366f1" },
                  { label: "Komissiya", value: formatCurrency(stats.totalCommission), color: "#22c55e" },
                  { label: "Gəlir", value: formatCurrency(stats.totalRevenue), color: "#8b5cf6" },
                  { label: "Ümumi ödəniş", value: formatCurrency(emp.baseSalary + stats.totalCommission), color: "#ef4444" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-3 rounded-2xl" style={{ background: "var(--bg-glass)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
                    <p className="text-sm font-bold" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6" style={modalCard}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{selected ? "Redaktə et" : "Yeni işçi"}</h2><button onClick={() => { setModal(false); setSelected(null) }} style={{ color: "var(--text-muted)" }} className="text-xl">✕</button></div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Ad Soyad *</label><input name="name" defaultValue={selected?.name} required style={inputStyle} /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Vəzifə</label><input name="position" defaultValue={selected?.position} style={inputStyle} /></div>
                <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Maaş (AZN)</label><input name="baseSalary" type="number" min="0" defaultValue={selected?.baseSalary ?? 0} style={inputStyle} /></div>
                <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Komissiya (%)</label><input name="commissionPercent" type="number" min="0" max="100" step="0.1" defaultValue={selected?.commissionPercent ?? 5} style={inputStyle} /></div>
                <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Telefon</label><input name="phone" defaultValue={selected?.phone} style={inputStyle} /></div>
                <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Email</label><input name="email" type="email" defaultValue={selected?.email} style={inputStyle} /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Status</label><select name="status" defaultValue={selected?.status ?? "active"} style={inputStyle}><option value="active">Aktiv</option><option value="inactive">Deaktiv</option></select></div>
              </div>
              <div className="flex gap-3 pt-3 border-t" style={{ borderColor: "var(--border-color)" }}>
                <button type="button" onClick={() => { setModal(false); setSelected(null) }} className="flex-1 py-2.5 rounded-2xl text-sm" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>Ləğv et</button>
                <button type="submit" className="flex-1 py-2.5 rounded-2xl text-sm font-medium text-white" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>{selected ? "Yadda saxla" : "Əlavə et"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
