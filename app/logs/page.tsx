"use client"
import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { Activity, Search, Filter, Trash2, Plus, DollarSign, Edit3, LogIn, X, RefreshCw, Shield } from "lucide-react"

const card = { background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "24px" }
const inputStyle = { background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: "12px", padding: "8px 14px", fontSize: "13px", outline: "none", width: "100%" }

const ACTION_META: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  create:   { label: "Yaradıldı",   color: "#22c55e", bg: "rgba(34,197,94,0.12)",   Icon: Plus },
  update:   { label: "Yeniləndi",   color: "#6366f1", bg: "rgba(99,102,241,0.12)",  Icon: Edit3 },
  delete:   { label: "Silindi",     color: "#ef4444", bg: "rgba(239,68,68,0.12)",   Icon: Trash2 },
  payment:  { label: "Ödəniş",      color: "#10b981", bg: "rgba(16,185,129,0.12)",  Icon: DollarSign },
  login:    { label: "Giriş",       color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  Icon: LogIn },
  approve:  { label: "Təsdiqləndi", color: "#22c55e", bg: "rgba(34,197,94,0.12)",   Icon: Shield },
  reject:   { label: "Rədd edildi", color: "#ef4444", bg: "rgba(239,68,68,0.12)",   Icon: X },
  kassa:    { label: "Kassa",       color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  Icon: DollarSign },
}

const ENTITY_META: Record<string, { label: string; color: string }> = {
  booking:       { label: "Sifariş",   color: "#6366f1" },
  payment:       { label: "Ödəniş",    color: "#10b981" },
  draft:         { label: "Draft",     color: "#f59e0b" },
  kassa:         { label: "Kassa",     color: "#8b5cf6" },
  expense:       { label: "Xərc",      color: "#ef4444" },
  debt:          { label: "Borc",      color: "#f97316" },
  user:          { label: "İstifadəçi", color: "#06b6d4" },
}

function actionMeta(action: string) {
  return ACTION_META[action] ?? { label: action, color: "#6b7280", bg: "rgba(107,114,128,0.12)", Icon: Activity }
}
function entityMeta(entity: string) {
  return ENTITY_META[entity] ?? { label: entity, color: "#6b7280" }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "İndicə"
  if (mins < 60) return `${mins} dəq əvvəl`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} saat əvvəl`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} gün əvvəl`
  return new Date(iso).toLocaleDateString("az-AZ", { day: "numeric", month: "short", year: "numeric" })
}

function avatarColor(name: string) {
  const colors = [
    ["rgba(99,102,241,0.2)","#6366f1"],
    ["rgba(16,185,129,0.2)","#10b981"],
    ["rgba(245,158,11,0.2)","#f59e0b"],
    ["rgba(239,68,68,0.2)","#ef4444"],
    ["rgba(139,92,246,0.2)","#8b5cf6"],
    ["rgba(6,182,212,0.2)","#06b6d4"],
  ]
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return colors[h % colors.length]
}

export default function ActivityLogsPage() {
  const { profile } = useUserRole()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterAction, setFilterAction] = useState("all")
  const [filterUser, setFilterUser] = useState("all")
  const [filterDate, setFilterDate] = useState("")
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  async function fetchLogs() {
    setLoading(true)
    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)
    setLogs(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [])

  // Real-time
  useEffect(() => {
    const ch = supabase.channel("activity-logs-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, payload => {
        setLogs(prev => [payload.new, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const uniqueUsers = useMemo(() => [...new Set(logs.map(l => l.user_name).filter(Boolean))].sort(), [logs])
  const uniqueActions = useMemo(() => [...new Set(logs.map(l => l.action).filter(Boolean))].sort(), [logs])

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filterAction !== "all" && l.action !== filterAction) return false
      if (filterUser !== "all" && l.user_name !== filterUser) return false
      if (filterDate && !l.created_at?.startsWith(filterDate)) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !(l.user_name ?? "").toLowerCase().includes(q) &&
          !(l.action ?? "").toLowerCase().includes(q) &&
          !(l.entity ?? "").toLowerCase().includes(q) &&
          !(l.details ? JSON.stringify(l.details) : "").toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [logs, filterAction, filterUser, filterDate, search])

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      total: logs.length,
      today: logs.filter(l => l.created_at?.startsWith(today)).length,
      users: new Set(logs.map(l => l.user_name)).size,
      actions: {
        create: logs.filter(l => l.action === "create").length,
        delete: logs.filter(l => l.action === "delete").length,
        payment: logs.filter(l => l.action === "payment").length,
      }
    }
  }, [logs])

  if (profile?.role !== "it_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center">
          <Shield size={40} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Giriş qadağandır</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Bu səhifəyə yalnız admin daxil ola bilər</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Fəaliyyət Jurnalı</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Kim nə etdi — tam tarixçə</p>
        </div>
        <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
          style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Yenilə
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Cəmi əməliyyat", value: stats.total, color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
          { label: "Bu gün", value: stats.today, color: "#10b981", bg: "rgba(16,185,129,0.12)" },
          { label: "İstifadəçilər", value: stats.users, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
          { label: "Yeni sifariş", value: stats.actions.create, color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
          { label: "Silinmə", value: stats.actions.delete, color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="p-4 rounded-2xl" style={card}>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
            <p className="text-2xl font-black tabular-nums" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
          <Search size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Axtar..." className="bg-transparent text-xs outline-none w-full"
            style={{ color: "var(--text-primary)" }} />
          {search && <button onClick={() => setSearch("")}><X size={12} style={{ color: "var(--text-muted)" }} /></button>}
        </div>
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(0) }}
          className="px-3 py-2 rounded-xl text-xs outline-none"
          style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
          <option value="all">Bütün əməliyyatlar</option>
          {uniqueActions.map(a => <option key={a} value={a}>{actionMeta(a).label}</option>)}
        </select>
        <select value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(0) }}
          className="px-3 py-2 rounded-xl text-xs outline-none"
          style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
          <option value="all">Bütün istifadəçilər</option>
          {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <input type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setPage(0) }}
          className="px-3 py-2 rounded-xl text-xs outline-none"
          style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
        {(filterAction !== "all" || filterUser !== "all" || filterDate || search) && (
          <button onClick={() => { setFilterAction("all"); setFilterUser("all"); setFilterDate(""); setSearch(""); setPage(0) }}
            className="px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
            Sıfırla
          </button>
        )}
        <span className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
          {filtered.length} nəticə
        </span>
      </div>

      {/* Logs table */}
      <div className="rounded-3xl overflow-hidden" style={card}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Activity size={32} style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Nəticə tapılmadı</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--bg-glass)", borderBottom: "1px solid var(--border-color)" }}>
                    {["İstifadəçi", "Rol", "Əməliyyat", "Obyekt", "Təfərrüat", "Tarix"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3"
                        style={{ color: "var(--text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((log, i) => {
                    const am = actionMeta(log.action)
                    const em = entityMeta(log.entity)
                    const Icon = am.Icon
                    const [avBg, avFg] = avatarColor(log.user_name ?? "")
                    const initials = (log.user_name ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
                    return (
                      <tr key={log.id} className="transition-all" style={{ borderBottom: "1px solid var(--border-color)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: avBg, color: avFg }}>{initials}</div>
                            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {log.user_name ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-lg font-medium"
                            style={{ background: "var(--bg-glass)", color: "var(--text-secondary)" }}>
                            {log.user_role ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl"
                            style={{ background: am.bg, color: am.color }}>
                            <Icon size={11} />{am.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-lg"
                            style={{ background: "var(--bg-glass)", color: em.color }}>
                            {em.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                            {log.details
                              ? typeof log.details === "object"
                                ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(" · ")
                                : String(log.details)
                              : "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                            {timeAgo(log.created_at)}
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {new Date(log.created_at).toLocaleString("az-AZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--border-color)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-40 transition-all"
                    style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                    ← Əvvəl
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-40 transition-all"
                    style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                    Sonra →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
