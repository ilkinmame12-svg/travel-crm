"use client"
import { useState, useEffect, useRef, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { Search, Send, Phone, Plane, Hotel, Shield, CreditCard, Car, X, CheckCheck, Clock, User } from "lucide-react"

type Category = "all" | "tur" | "bilet" | "viza" | "otel" | "transfer" | "diger"
type ConvStatus = "new" | "assigned" | "closed"

interface Conversation {
  id: string
  phone: string
  client_name: string | null
  category: string | null
  assigned_to: string | null
  assigned_at: string | null
  status: ConvStatus
  last_message: string | null
  last_message_at: string | null
  created_at: string
}

interface WaMessage {
  id: string
  conversation_id: string
  direction: "in" | "out"
  body: string | null
  sent_by: string | null
  created_at: string
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  tur:      { label: "Tur",      color: "#059669", bg: "rgba(16,185,129,0.15)", Icon: Plane },
  bilet:    { label: "Bilet",    color: "#2563eb", bg: "rgba(59,130,246,0.15)", Icon: Plane },
  viza:     { label: "Viza",     color: "#7c3aed", bg: "rgba(139,92,246,0.15)", Icon: Shield },
  otel:     { label: "Otel",     color: "#d97706", bg: "rgba(245,158,11,0.15)", Icon: Hotel },
  transfer: { label: "Transfer", color: "#dc2626", bg: "rgba(239,68,68,0.15)",  Icon: Car },
  diger:    { label: "Digər",    color: "#6b7280", bg: "rgba(107,114,128,0.15)", Icon: Phone },
}

function categoryMeta(cat: string | null) {
  return CATEGORY_META[cat ?? ""] ?? CATEGORY_META.diger
}

function avatarInitials(name: string | null, phone: string) {
  if (name) return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
  return phone.slice(-2)
}

function timeLabel(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000 && d.getDate() === now.getDate())
    return d.toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })
  if (diff < 172800000) return "Dünən"
  return d.toLocaleDateString("az-AZ", { day: "2-digit", month: "2-digit" })
}

const AVATAR_COLORS = [
  ["rgba(16,185,129,0.18)","#059669"],
  ["rgba(59,130,246,0.18)","#2563eb"],
  ["rgba(139,92,246,0.18)","#7c3aed"],
  ["rgba(245,158,11,0.18)","#d97706"],
  ["rgba(239,68,68,0.18)","#dc2626"],
  ["rgba(6,182,212,0.18)","#0891b2"],
]
function avatarColor(id: string) {
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export default function MesajlarPage() {
  const { profile } = useUserRole()
  const isAdmin = profile?.role && ["it_admin", "boss", "direktor"].includes(profile.role)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<WaMessage[]>([])
  const [active, setActive] = useState<Conversation | null>(null)
  const [filterCat, setFilterCat] = useState<Category>("all")
  const [filterOwn, setFilterOwn] = useState(false)
  const [search, setSearch] = useState("")
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load conversations
  async function loadConversations() {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false })
    setConversations((data as Conversation[]) ?? [])
    setLoading(false)
  }

  // Load messages for active conversation
  async function loadMessages(convId: string) {
    const { data } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
    setMessages((data as WaMessage[]) ?? [])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  useEffect(() => {
    loadConversations()
    // Realtime subscription
    const ch = supabase.channel("conversations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, loadConversations)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_messages" }, payload => {
        const msg = payload.new as WaMessage
        if (active && msg.conversation_id === active.id) {
          setMessages(prev => [...prev, msg])
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
        }
        loadConversations()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [active?.id])

  useEffect(() => {
    if (active) loadMessages(active.id)
  }, [active?.id])

  // Take conversation
  async function takeConversation(conv: Conversation) {
    if (!profile) return
    await supabase.from("conversations").update({
      assigned_to: profile.fullName,
      assigned_at: new Date().toISOString(),
      status: "assigned",
    }).eq("id", conv.id)
    setActive({ ...conv, assigned_to: profile.fullName, status: "assigned" })
    loadConversations()
  }

  // Close conversation
  async function closeConversation(conv: Conversation) {
    await supabase.from("conversations").update({ status: "closed" }).eq("id", conv.id)
    setActive(null)
    loadConversations()
  }

  // Send message
  async function handleSend() {
    if (!text.trim() || !active || !profile) return
    setSending(true)
    await supabase.from("whatsapp_messages").insert({
      conversation_id: active.id,
      direction: "out",
      body: text.trim(),
      sent_by: profile.fullName,
    })
    await supabase.from("conversations").update({
      last_message: text.trim(),
      last_message_at: new Date().toISOString(),
    }).eq("id", active.id)
    setText("")
    setSending(false)
  }

  // Filtered list
  const filtered = useMemo(() => {
    return conversations.filter(c => {
      // Visibility: new = everyone, assigned = only assigned_to or admin
      if (c.status === "assigned" && !isAdmin && c.assigned_to !== profile?.fullName) return false
      if (filterCat !== "all" && c.category !== filterCat) return false
      if (filterOwn && c.assigned_to !== profile?.fullName) return false
      if (search) {
        const q = search.toLowerCase()
        if (!(c.client_name ?? "").toLowerCase().includes(q) && !c.phone.includes(q)) return false
      }
      return true
    })
  }, [conversations, filterCat, filterOwn, search, profile, isAdmin])

  const newCount = conversations.filter(c => c.status === "new").length

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>

      {/* ── Sidebar ── */}
      <div className="flex flex-col border-r" style={{ width: 300, flexShrink: 0, borderColor: "var(--border-color)", background: "var(--bg-secondary)" }}>

        {/* Header */}
        <div className="p-4 pb-3" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Mesajlar</h2>
            {newCount > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#ef4444" }}>{newCount} yeni</span>
            )}
          </div>
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
            <Search size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ad və ya nömrə..."
              className="bg-transparent text-xs outline-none w-full"
              style={{ color: "var(--text-primary)" }} />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 px-3 py-2.5 overflow-x-auto" style={{ borderBottom: "1px solid var(--border-color)", scrollbarWidth: "none" }}>
          {(["all", "tur", "bilet", "viza", "otel", "transfer"] as Category[]).map(cat => {
            const active_ = filterCat === cat
            const meta = cat !== "all" ? categoryMeta(cat) : null
            return (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className="text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-all"
                style={{
                  background: active_ ? (meta?.color ?? "#6366f1") : "var(--bg-glass)",
                  color: active_ ? "#fff" : "var(--text-secondary)",
                  border: "1px solid " + (active_ ? "transparent" : "var(--border-color)"),
                }}>
                {cat === "all" ? "Hamısı" : meta?.label}
              </button>
            )
          })}
        </div>

        {/* Own filter */}
        <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <button onClick={() => setFilterOwn(v => !v)}
            className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl w-full transition-all"
            style={{ background: filterOwn ? "rgba(99,102,241,0.12)" : "var(--bg-glass)", color: filterOwn ? "#6366f1" : "var(--text-secondary)", border: "1px solid " + (filterOwn ? "rgba(99,102,241,0.3)" : "var(--border-color)") }}>
            <User size={12} />
            Mənim çatlarım
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: "var(--bg-glass)", flexShrink: 0 }} />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded animate-pulse w-2/3" style={{ background: "var(--bg-glass)" }} />
                <div className="h-2.5 rounded animate-pulse w-full" style={{ background: "var(--bg-glass)" }} />
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Phone size={28} style={{ color: "var(--text-muted)", marginBottom: 10 }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Söhbət tapılmadı</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Filtrləri dəyişin</p>
            </div>
          )}
          {filtered.map(conv => {
            const isActive = active?.id === conv.id
            const [bg, fg] = avatarColor(conv.id)
            const meta = categoryMeta(conv.category)
            const isMine = conv.assigned_to === profile?.fullName
            return (
              <div key={conv.id} onClick={() => setActive(conv)}
                className="flex items-center gap-2.5 px-3 py-3 cursor-pointer transition-all"
                style={{
                  borderBottom: "1px solid var(--border-color)",
                  background: isActive ? "rgba(99,102,241,0.08)" : "transparent",
                  borderLeft: isActive ? "3px solid #6366f1" : "3px solid transparent",
                }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: bg, color: fg }}>
                  {avatarInitials(conv.client_name, conv.phone)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {conv.client_name ?? conv.phone}
                    </span>
                    <span className="text-[10px] ml-1 flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                      {timeLabel(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                      {conv.last_message ?? "Yeni söhbət"}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {conv.category && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                      )}
                      {conv.status === "new" && (
                        <span className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />
                      )}
                      {isMine && conv.status === "assigned" && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
                          Mənim
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Main chat area ── */}
      {!active ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
            <Phone size={28} style={{ color: "#6366f1" }} />
          </div>
          <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Söhbət seçin</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sol tərəfdən bir söhbət seçin</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">

          {/* Chat header */}
          <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-color)", background: "var(--bg-secondary)" }}>
            <div className="flex items-center gap-3">
              {(() => { const [bg, fg] = avatarColor(active.id); return (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: bg, color: fg }}>
                  {avatarInitials(active.client_name, active.phone)}
                </div>
              )})()}
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {active.client_name ?? active.phone}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{active.phone}</p>
                  {active.category && (() => { const m = categoryMeta(active.category); return (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: m.bg, color: m.color }}>
                      AI: {m.label}
                    </span>
                  )})()}
                  {active.assigned_to && (
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>· {active.assigned_to}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {active.status === "new" && (
                <button onClick={() => takeConversation(active)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  Mənim götür
                </button>
              )}
              {active.status === "assigned" && active.assigned_to === profile?.fullName && (
                <button onClick={() => closeConversation(active)}
                  className="text-xs font-medium px-3 py-1.5 rounded-xl transition-all"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                  Bağla
                </button>
              )}
              {active.status === "closed" && (
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>
                  Bağlı
                </span>
              )}
              <button onClick={() => setActive(null)} className="p-1.5 rounded-xl transition-all hover:scale-110"
                style={{ background: "var(--bg-glass)", color: "var(--text-secondary)" }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ background: "var(--bg-primary)", scrollbarWidth: "thin" }}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <Clock size={24} style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Hələ mesaj yoxdur</p>
              </div>
            )}
            {messages.map(msg => {
              const isOut = msg.direction === "out"
              return (
                <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                  <div style={{ maxWidth: "68%" }}>
                    <div className="px-3.5 py-2.5 rounded-2xl text-sm"
                      style={{
                        background: isOut ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--bg-secondary)",
                        color: isOut ? "#fff" : "var(--text-primary)",
                        borderBottomRightRadius: isOut ? 4 : 16,
                        borderBottomLeftRadius: isOut ? 16 : 4,
                        border: isOut ? "none" : "1px solid var(--border-color)",
                      }}>
                      {msg.body}
                    </div>
                    <div className={`flex items-center gap-1 mt-1 ${isOut ? "justify-end" : "justify-start"}`}>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {timeLabel(msg.created_at)}
                        {isOut && msg.sent_by && ` · ${msg.sent_by}`}
                      </span>
                      {isOut && <CheckCheck size={10} style={{ color: "var(--text-muted)" }} />}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {active.status !== "closed" && (active.assigned_to === profile?.fullName || isAdmin) ? (
            <div className="px-4 py-3 flex items-end gap-2 flex-shrink-0" style={{ borderTop: "1px solid var(--border-color)", background: "var(--bg-secondary)" }}>
              <div className="flex-1 px-4 py-2.5 rounded-2xl text-sm" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
                <textarea value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder="Mesaj yaz... (Enter = göndər)"
                  rows={1}
                  className="w-full bg-transparent outline-none resize-none text-sm"
                  style={{ color: "var(--text-primary)", maxHeight: 100 }} />
              </div>
              <button onClick={handleSend} disabled={!text.trim() || sending}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                <Send size={15} />
              </button>
            </div>
          ) : active.status === "new" ? (
            <div className="px-4 py-3 text-center text-sm flex-shrink-0" style={{ borderTop: "1px solid var(--border-color)", color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
              Cavab vermək üçün <button onClick={() => takeConversation(active)} className="font-semibold" style={{ color: "#6366f1" }}>söhbəti öz üzərinizə götürün</button>
            </div>
          ) : active.status === "closed" ? (
            <div className="px-4 py-3 text-center text-sm flex-shrink-0" style={{ borderTop: "1px solid var(--border-color)", color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
              Bu söhbət bağlıdır
            </div>
          ) : (
            <div className="px-4 py-3 text-center text-sm flex-shrink-0" style={{ borderTop: "1px solid var(--border-color)", color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
              Bu söhbəti {active.assigned_to} idarə edir
            </div>
          )}
        </div>
      )}
    </div>
  )
}
