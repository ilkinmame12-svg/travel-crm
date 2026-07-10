"use client"
import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { formatCurrency } from "@/lib/calculations"
import {
  Plus, Search, X, Edit3, Trash2, Eye, CheckCircle2,
  Clock, XCircle, Trophy, Calendar, User, Phone, DollarSign,
  Settings, Tag, ChevronDown, FileText
} from "lucide-react"

const card = { background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "24px" }
const modalCard = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "24px" }
const inputStyle = { background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: "12px", padding: "10px 14px", fontSize: "14px", outline: "none", width: "100%" }

const STATUS_META: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  active:    { label: "Aktiv",        color: "#6366f1", bg: "rgba(99,102,241,0.12)",  Icon: Clock },
  won:       { label: "Qazanıldı",    color: "#22c55e", bg: "rgba(34,197,94,0.12)",   Icon: CheckCircle2 },
  lost:      { label: "Uduldu",       color: "#ef4444", bg: "rgba(239,68,68,0.12)",   Icon: XCircle },
  completed: { label: "Tamamlandı",   color: "#10b981", bg: "rgba(16,185,129,0.12)",  Icon: Trophy },
  pending:   { label: "Gözləyir",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  Icon: Clock },
}

function statusMeta(s: string) {
  return STATUS_META[s] ?? STATUS_META.active
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const ALLOWED_ROLES = ["it_admin", "boss", "direktor", "tender_menecer"]

export default function TendersPage() {
  const { profile } = useUserRole()
  const [tenders, setTenders] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"create" | "edit" | "view" | "services" | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    title: "", client_name: "", client_phone: "", event_date: "",
    deadline: "", description: "", budget: "", cost: "", status: "active",
    manager: "", notes: "", selected_services: [] as string[]
  })

  // New service input
  const [newService, setNewService] = useState("")
  const [addingService, setAddingService] = useState(false)

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

  function openCreate() {
    setForm({ title: "", client_name: "", client_phone: "", event_date: "", deadline: "", description: "", budget: "", cost: "", status: "active", manager: profile?.fullName ?? "", notes: "", selected_services: [] })
    setSelected(null)
    setModal("create")
  }

  function openEdit(t: any) {
    setForm({
      title: t.title ?? "", client_name: t.client_name ?? "", client_phone: t.client_phone ?? "",
      event_date: t.event_date ?? "", deadline: t.deadline ?? "", description: t.description ?? "",
      budget: String(t.budget ?? ""), cost: String(t.cost ?? ""), status: t.status ?? "active",
      manager: t.manager ?? "", notes: t.notes ?? "",
      selected_services: Array.isArray(t.services) ? t.services : []
    })
    setSelected(t)
    setModal("edit")
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      title: form.title, client_name: form.client_name, client_phone: form.client_phone,
      event_date: form.event_date || null, deadline: form.deadline || null,
      description: form.description, budget: Number(form.budget) || 0,
      cost: Number(form.cost) || 0, status: form.status,
      manager: form.manager, notes: form.notes,
      services: form.selected_services, updated_at: new Date().toISOString(),
    }
    if (modal === "edit" && selected) {
      await supabase.from("tenders").update(payload).eq("id", selected.id)
    } else {
      await supabase.from("tenders").insert({ ...payload, created_by: profile?.fullName ?? "" })
    }
    setSaving(false)
    setModal(null)
    fetchTenders()
  }

  async function handleDelete(id: string) {
    if (!confirm("Silinsin?")) return
    await supabase.from("tenders").delete().eq("id", id)
    fetchTenders()
  }

  async function handleAddService() {
    if (!newService.trim()) return
    setAddingService(true)
    await supabase.from("tender_services").insert({ name: newService.trim(), created_by: profile?.fullName ?? "" })
    setNewService("")
    await fetchServices()
    setAddingService(false)
  }

  async function handleDeleteService(id: string) {
    await supabase.from("tender_services").delete().eq("id", id)
    fetchServices()
  }

  function toggleService(name: string) {
    setForm(f => ({
      ...f,
      selected_services: f.selected_services.includes(name)
        ? f.selected_services.filter(s => s !== name)
        : [...f.selected_services, name]
    }))
  }

  const filtered = useMemo(() => tenders.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(t.title ?? "").toLowerCase().includes(q) && !(t.client_name ?? "").toLowerCase().includes(q)) return false
    }
    return true
  }), [tenders, filterStatus, search])

  const profit = useMemo(() => filtered.reduce((s, t) => s + (t.budget - t.cost), 0), [filtered])

  if (!profile) return null
  if (!ALLOWED_ROLES.includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center">
          <Trophy size={40} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Giriş qadağandır</p>
        </div>
      </div>
    )
  }

  const canEdit = ["it_admin", "direktor", "tender_menecer"].includes(profile.role)

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Tenderlər</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Tədbirlər və xüsusi sifarişlər</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={() => setModal("services")}
              className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all hover:scale-105"
              style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
              <Settings size={14} />Xidmətlər
            </button>
          )}
          {canEdit && (
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}>
              <Plus size={15} />Yeni tender
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Cəmi", value: tenders.length, color: "#6366f1" },
          { label: "Aktiv", value: tenders.filter(t => t.status === "active").length, color: "#f59e0b" },
          { label: "Qazanıldı", value: tenders.filter(t => t.status === "won").length, color: "#22c55e" },
          { label: "Tamamlandı", value: tenders.filter(t => t.status === "completed").length, color: "#10b981" },
          { label: "Mənfəət", value: formatCurrency(profit), color: "#8b5cf6", isText: true },
        ].map(({ label, value, color, isText }) => (
          <div key={label} className="p-4 rounded-2xl" style={card}>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
            <p className={`font-black tabular-nums ${isText ? "text-lg" : "text-2xl"}`} style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[200px]"
          style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
          <Search size={13} style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Axtar..."
            className="bg-transparent text-xs outline-none w-full" style={{ color: "var(--text-primary)" }} />
          {search && <button onClick={() => setSearch("")}><X size={12} style={{ color: "var(--text-muted)" }} /></button>}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["all", "active", "pending", "won", "completed", "lost"].map(s => {
            const isAll = s === "all"
            const meta = isAll ? null : statusMeta(s)
            const isActive = filterStatus === s
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="text-xs font-medium px-3 py-2 rounded-xl transition-all"
                style={{
                  background: isActive ? (meta?.color ?? "#6366f1") : "var(--bg-glass)",
                  color: isActive ? "#fff" : "var(--text-secondary)",
                  border: "1px solid " + (isActive ? "transparent" : "var(--border-color)")
                }}>
                {isAll ? "Hamısı" : meta?.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl overflow-hidden" style={card}>
        {loading ? (
          <div className="py-16 text-center" style={{ color: "var(--text-muted)" }}>Yüklənir...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Trophy size={36} style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {search || filterStatus !== "all" ? "Nəticə tapılmadı" : "Hələ tender yoxdur"}
            </p>
            {canEdit && !search && filterStatus === "all" && (
              <button onClick={openCreate}
                className="text-xs font-semibold px-4 py-2 rounded-xl text-white"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                + Yeni tender
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr style={{ background: "linear-gradient(135deg,var(--bg-glass),var(--bg-secondary))", borderBottom: "1px solid var(--border-color)" }}>
                  {["Ad / Müştəri", "Xidmətlər", "Tarix", "Büdcə", "Xərc", "Mənfəət", "Menecer", "Status", ""].map(h => (
                    <th key={h} className="text-left text-[11px] font-bold uppercase tracking-widest px-4 py-4"
                      style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const sm = statusMeta(t.status)
                  const Icon = sm.Icon
                  const prof = (t.budget ?? 0) - (t.cost ?? 0)
                  return (
                    <tr key={t.id} className="group transition-all" style={{ borderBottom: "1px solid var(--border-color)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{t.title}</p>
                        {t.client_name && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{t.client_name}</p>}
                        {t.client_phone && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t.client_phone}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(t.services) && t.services.slice(0, 3).map((s: string) => (
                            <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-lg"
                              style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>{s}</span>
                          ))}
                          {Array.isArray(t.services) && t.services.length > 3 && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg"
                              style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>
                              +{t.services.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>📅 {formatDate(t.event_date)}</p>
                        {t.deadline && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>⏰ {formatDate(t.deadline)}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <p className="font-bold tabular-nums text-sm" style={{ color: "var(--text-primary)" }}>{formatCurrency(t.budget ?? 0)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <p className="font-semibold tabular-nums text-sm text-red-400">{formatCurrency(t.cost ?? 0)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`font-bold tabular-nums text-sm px-2 py-0.5 rounded-lg ${prof >= 0 ? "text-green-500" : "text-red-500"}`}
                          style={{ background: prof >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)" }}>
                          {prof >= 0 ? "+" : ""}{formatCurrency(prof)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
                            {t.manager?.charAt(0)}
                          </div>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{t.manager?.split(" ")[0]}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl"
                          style={{ background: sm.bg, color: sm.color }}>
                          <Icon size={11} />{sm.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setSelected(t); setModal("view") }}
                            className="p-1.5 rounded-xl transition-all hover:scale-110"
                            style={{ color: "#6366f1", background: "rgba(99,102,241,0.1)" }}>
                            <Eye size={13} />
                          </button>
                          {canEdit && (
                            <button onClick={() => openEdit(t)}
                              className="p-1.5 rounded-xl transition-all hover:scale-110"
                              style={{ color: "var(--text-secondary)", background: "var(--bg-glass)" }}>
                              <Edit3 size={13} />
                            </button>
                          )}
                          {profile.role === "it_admin" && (
                            <button onClick={() => handleDelete(t.id)}
                              className="p-1.5 rounded-xl transition-all hover:scale-110"
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
        )}
      </div>

      {/* Create/Edit Modal */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" style={{ backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" style={modalCard}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                {modal === "edit" ? "Tenderi düzəlt" : "Yeni tender"}
              </h2>
              <button onClick={() => setModal(null)} style={{ color: "var(--text-muted)" }}><X size={18} /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Tender adı *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Məsələn: Şirkət tədbirinin təşkili" style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Müştəri adı</label>
                <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                  placeholder="Müştəri" style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Telefon</label>
                <input value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))}
                  placeholder="+994..." style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Tədbir tarixi</label>
                <input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Son tarix (deadline)</label>
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Büdcə (AZN)</label>
                <input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                  placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Xərc (AZN)</label>
                <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                  placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Menecer</label>
                <input value={form.manager} onChange={e => setForm(f => ({ ...f, manager: e.target.value }))}
                  placeholder="Ad Soyad" style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={{ ...inputStyle }}>
                  <option value="active">Aktiv</option>
                  <option value="pending">Gözləyir</option>
                  <option value="won">Qazanıldı</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="lost">Uduldu</option>
                </select>
              </div>
            </div>

            {/* Services */}
            <div className="mb-4">
              <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>Xidmətlər</label>
              <div className="flex flex-wrap gap-2 p-3 rounded-2xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
                {services.map(s => {
                  const selected_ = form.selected_services.includes(s.name)
                  return (
                    <button key={s.id} onClick={() => toggleService(s.name)}
                      className="text-xs font-medium px-3 py-1.5 rounded-xl transition-all hover:scale-105"
                      style={{
                        background: selected_ ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--bg-secondary)",
                        color: selected_ ? "#fff" : "var(--text-secondary)",
                        border: "1px solid " + (selected_ ? "transparent" : "var(--border-color)")
                      }}>
                      {s.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Açıqlama</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="Tender haqqında ətraflı məlumat..."
                style={{ ...inputStyle, resize: "none" }} />
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Qeydlər</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="Əlavə qeydlər..."
                style={{ ...inputStyle, resize: "none" }} />
            </div>

            {/* Profit preview */}
            {(form.budget || form.cost) && (
              <div className="mb-5 p-3 rounded-2xl flex items-center justify-between"
                style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Mənfəət:</span>
                <span className="font-bold text-sm" style={{ color: (Number(form.budget) - Number(form.cost)) >= 0 ? "#22c55e" : "#ef4444" }}>
                  {formatCurrency(Number(form.budget) - Number(form.cost))}
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving || !form.title.trim()}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.01] disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                {saving ? "Saxlanılır..." : modal === "edit" ? "Yadda saxla" : "Yarat"}
              </button>
              <button onClick={() => setModal(null)}
                className="px-6 py-3 rounded-2xl text-sm font-medium"
                style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                Ləğv et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal === "view" && selected && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" style={{ backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" style={modalCard}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{selected.title}</h2>
              <button onClick={() => setModal(null)} style={{ color: "var(--text-muted)" }}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              {[
                ["Müştəri", selected.client_name || "—"],
                ["Telefon", selected.client_phone || "—"],
                ["Tədbir tarixi", formatDate(selected.event_date)],
                ["Deadline", formatDate(selected.deadline)],
                ["Büdcə", formatCurrency(selected.budget ?? 0)],
                ["Xərc", formatCurrency(selected.cost ?? 0)],
                ["Mənfəət", formatCurrency((selected.budget ?? 0) - (selected.cost ?? 0))],
                ["Menecer", selected.manager || "—"],
              ].map(([label, value]) => (
                <div key={label} className="p-3 rounded-2xl" style={{ background: "var(--bg-glass)" }}>
                  <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{value}</p>
                </div>
              ))}
            </div>
            {Array.isArray(selected.services) && selected.services.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Xidmətlər</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.services.map((s: string) => (
                    <span key={s} className="text-xs font-medium px-2.5 py-1 rounded-xl"
                      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            {selected.description && (
              <div className="mb-3 p-3 rounded-2xl" style={{ background: "var(--bg-glass)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Açıqlama</p>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>{selected.description}</p>
              </div>
            )}
            {selected.notes && (
              <div className="p-3 rounded-2xl" style={{ background: "var(--bg-glass)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Qeydlər</p>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>{selected.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Services Management Modal */}
      {modal === "services" && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" style={{ backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm p-6" style={modalCard}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Xidmətləri idarə et</h2>
              <button onClick={() => setModal(null)} style={{ color: "var(--text-muted)" }}><X size={18} /></button>
            </div>

            {/* Add new service */}
            <div className="flex gap-2 mb-4">
              <input value={newService} onChange={e => setNewService(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddService()}
                placeholder="Yeni xidmət adı..." style={{ ...inputStyle, flex: 1 }} />
              <button onClick={handleAddService} disabled={addingService || !newService.trim()}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", flexShrink: 0 }}>
                <Plus size={16} />
              </button>
            </div>

            {/* Services list */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {services.map(s => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{s.name}</span>
                  {s.created_by !== "system" && (
                    <button onClick={() => handleDeleteService(s.id)}
                      className="p-1 rounded-lg transition-all hover:scale-110"
                      style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
