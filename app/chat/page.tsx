"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { Send, Search, MessageCircle, X, Check, CheckCheck } from "lucide-react"

const ROLE_LABELS: Record<string, string> = {
  it_admin: "IT Admin", boss: "Boss", direktor: "Direktor", muhasib: "Mühasib", menecer: "Menecer"
}

const ROLE_GRADIENTS: Record<string, string> = {
  it_admin:  "linear-gradient(135deg, #667eea, #764ba2)",
  boss:      "linear-gradient(135deg, #ef4444, #f97316)",
  direktor:  "linear-gradient(135deg, #3b82f6, #06b6d4)",
  muhasib:   "linear-gradient(135deg, #10b981, #34d399)",
  menecer:   "linear-gradient(135deg, #6b7280, #9ca3af)",
}

// ─── Online dot ───────────────────────────────────────────────────────────
function OnlineDot() {
  return (
    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
      style={{ background: "#22c55e", borderColor: "var(--bg-secondary)" }} />
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────
function Avatar({ user, size = 40, showOnline = false }: { user: any; size?: number; showOnline?: boolean }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="w-full h-full rounded-2xl flex items-center justify-center text-white font-bold overflow-hidden"
        style={{ background: ROLE_GRADIENTS[user.role] ?? "linear-gradient(135deg,#6b7280,#9ca3af)", fontSize: size * 0.38 }}>
        {user.avatar_url
          ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          : <span>{user.full_name?.[0] ?? "?"}</span>}
      </div>
      {showOnline && <OnlineDot />}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────
function UserSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 animate-pulse">
      <div className="w-10 h-10 rounded-2xl flex-shrink-0" style={{ background: "var(--bg-glass)" }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 rounded-lg" style={{ background: "var(--bg-glass)", width: "60%" }} />
        <div className="h-3 rounded-lg" style={{ background: "var(--bg-glass)", width: "40%" }} />
      </div>
    </div>
  )
}

// ─── Empty chat ───────────────────────────────────────────────────────────
function EmptyChat({ user }: { user?: any }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      {user ? (
        <>
          <Avatar user={user} size={64} />
          <div className="text-center">
            <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{user.full_name}</p>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{ROLE_LABELS[user.role]}</p>
          </div>
          <p className="text-sm text-center max-w-xs" style={{ color: "var(--text-muted)" }}>
            Söhbəti başlatmaq üçün mesaj yazın 👋
          </p>
        </>
      ) : (
        <>
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: "var(--bg-glass)" }}>
            <MessageCircle size={32} style={{ color: "var(--text-muted)" }} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Söhbət seçin</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Sol paneldən istifadəçi seçin
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────
function Bubble({ m, isMe, user, profile }: { m: any; isMe: boolean; user: any; profile: any }) {
  const time = new Date(m.created_at).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })

  return (
    <div className={`flex gap-2 group ${isMe ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-auto"
        style={{ background: isMe ? "linear-gradient(135deg,#ef4444,#f97316)" : ROLE_GRADIENTS[user?.role ?? "menecer"] }}>
        {isMe ? profile?.fullName?.[0] : user?.full_name?.[0]}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-0.5 max-w-xs lg:max-w-sm ${isMe ? "items-end" : "items-start"}`}>
        <div
          className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
          style={{
            background: isMe ? "linear-gradient(135deg,#ef4444,#f97316)" : "var(--bg-glass)",
            color: isMe ? "white" : "var(--text-primary)",
            border: isMe ? "none" : "1px solid var(--border-color)",
            borderTopRightRadius: isMe ? "4px" : "16px",
            borderTopLeftRadius: isMe ? "16px" : "4px",
            boxShadow: isMe ? "0 4px 16px rgba(239,68,68,0.2)" : "none",
          }}>
          {m.content}
        </div>
        <div className={`flex items-center gap-1 text-xs ${isMe ? "flex-row-reverse" : ""}`}
          style={{ color: "var(--text-muted)", fontSize: "11px" }}>
          <span>{time}</span>
          {isMe && (m.is_read
            ? <CheckCheck size={12} className="text-blue-400" />
            : <Check size={12} style={{ color: "var(--text-muted)" }} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Date separator ───────────────────────────────────────────────────────
function DateSep({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px" style={{ background: "var(--border-color)" }} />
      <span className="text-xs px-3 py-1 rounded-full font-medium"
        style={{ background: "var(--bg-glass)", color: "var(--text-muted)", border: "1px solid var(--border-color)", fontSize: "11px" }}>
        {date}
      </span>
      <div className="flex-1 h-px" style={{ background: "var(--border-color)" }} />
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { profile } = useUserRole()
  const [users,        setUsers]        = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [messages,     setMessages]     = useState<any[]>([])
  const [input,        setInput]        = useState("")
  const [search,       setSearch]       = useState("")
  const [unread,       setUnread]       = useState<Record<string, number>>({})
  const [sending,      setSending]      = useState(false)
  const [ready,        setReady]        = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<any>(null)
  const prevUnread  = useRef<Record<string, number>>({})

  useEffect(() => {
    if (!profile) return
    loadUsers()
    setReady(true)
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [profile])

  useEffect(() => {
    if (!selectedUser || !profile) return
    loadMessages()
    markAsRead()
    intervalRef.current = setInterval(() => { loadMessages(); loadUnread() }, 3000)
    return () => clearInterval(intervalRef.current)
  }, [selectedUser])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!profile) return
    loadUnread()
    const t = setInterval(loadUnread, 5000)
    return () => clearInterval(t)
  }, [profile])

  async function loadUsers() {
    const { data } = await supabase.from("user_profiles").select("id, full_name, role, avatar_url, email")
    if (data) setUsers(data.filter((u: any) => u.id !== profile?.id))
  }

  async function loadMessages() {
    if (!profile || !selectedUser) return
    const { data } = await supabase.from("messages").select("*")
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${profile.id})`)
      .order("created_at", { ascending: true })
    setMessages(data ?? [])
  }

  async function loadUnread() {
    if (!profile) return
    const { data } = await supabase.from("messages").select("sender_id").eq("receiver_id", profile.id).eq("is_read", false)
    if (!data) return
    const counts: Record<string, number> = {}
    data.forEach((m: any) => { counts[m.sender_id] = (counts[m.sender_id] ?? 0) + 1 })
    const hasNew = Object.entries(counts).some(([id, c]) => (prevUnread.current[id] ?? 0) < c)
    if (hasNew) {
      try {
        const ctx = new AudioContext()
        const o = ctx.createOscillator(); const g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.frequency.setValueAtTime(880, ctx.currentTime)
        o.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
        g.gain.setValueAtTime(0.3, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.3)
      } catch {}
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const sender = users.find(u => Object.keys(counts).includes(u.id))
        new Notification("itstour CRM 💬", { body: `${sender?.full_name ?? "Kimsə"} mesaj göndərdi`, icon: "/logo.png" })
      }
    }
    prevUnread.current = counts
    setUnread(counts)
  }

  async function markAsRead() {
    if (!profile || !selectedUser) return
    await supabase.from("messages").update({ is_read: true }).eq("sender_id", selectedUser.id).eq("receiver_id", profile.id).eq("is_read", false)
    setUnread(prev => { const n = { ...prev }; delete n[selectedUser.id]; return n })
  }

  async function sendMessage() {
    if (!input.trim() || !profile || !selectedUser || sending) return
    const content = input.trim()
    setInput(""); setSending(true)
    await supabase.from("messages").insert({ sender_id: profile.id, receiver_id: selectedUser.id, content })
    await loadMessages()
    setSending(false)
    inputRef.current?.focus()
  }

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: any[] }[] = []
    let currentDate = ""
    messages.forEach(m => {
      const d = new Date(m.created_at)
      const today = new Date()
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
      let label = d.toLocaleDateString("az-AZ", { day: "numeric", month: "long" })
      if (d.toDateString() === today.toDateString()) label = "Bu gün"
      else if (d.toDateString() === yesterday.toDateString()) label = "Dünən"
      if (label !== currentDate) { currentDate = label; groups.push({ date: label, messages: [] }) }
      groups[groups.length - 1].messages.push(m)
    })
    return groups
  }, [messages])

  const filteredUsers = useMemo(() =>
    users.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase())),
    [users, search])

  const totalUnread = Object.values(unread).reduce((s, v) => s + v, 0)

  if (!ready) return (
    <div className="min-h-screen p-7" style={{ background: "var(--bg-primary)" }}>
      <div className="mb-6 space-y-2">
        <div className="h-7 w-40 rounded-xl animate-pulse" style={{ background: "var(--bg-glass)" }} />
        <div className="h-4 w-28 rounded-lg animate-pulse" style={{ background: "var(--bg-glass)" }} />
      </div>
      <div className="grid grid-cols-3 gap-5" style={{ height: "calc(100vh - 180px)" }}>
        <div className="rounded-3xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <div className="p-4 space-y-1">
            {[1,2,3,4].map(i => <UserSkeleton key={i} />)}
          </div>
        </div>
        <div className="col-span-2 rounded-3xl animate-pulse" style={{ background: "var(--bg-glass)" }} />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Mesajlar</h1>
            {totalUnread > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white animate-pulse"
                style={{ background: "linear-gradient(135deg,#ef4444,#f97316)" }}>
                {totalUnread}
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Daxili mesajlaşma sistemi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: "calc(100vh - 180px)" }}>

        {/* ── Users panel ── */}
        <div className="lg:col-span-1 flex flex-col rounded-3xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(24px)" }}>

          {/* Search */}
          <div className="p-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl"
              style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
              <Search size={14} style={{ color: "var(--text-muted)" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="İstifadəçi axtar..."
                className="text-sm bg-transparent focus:outline-none flex-1"
                style={{ color: "var(--text-primary)" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ color: "var(--text-muted)" }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto">
            {filteredUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2" style={{ color: "var(--text-muted)" }}>
                <Search size={24} className="opacity-30" />
                <p className="text-sm">Tapılmadı</p>
              </div>
            )}
            {filteredUsers.map(u => {
              const isSelected = selectedUser?.id === u.id
              const uUnread = unread[u.id] ?? 0
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all"
                  style={{
                    background: isSelected ? "var(--bg-glass)" : "transparent",
                    borderBottom: "1px solid var(--border-color)",
                    borderLeft: isSelected ? "3px solid #ef4444" : "3px solid transparent",
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)" }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent" }}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar user={u} size={42} />
                    {uUnread > 0 && (
                      <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ background: "#ef4444", fontSize: "10px" }}>
                        {uUnread > 9 ? "9+" : uUnread}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)", fontWeight: uUnread > 0 ? 700 : 600 }}>
                      {u.full_name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </p>
                  </div>
                  {uUnread > 0 && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: "#ef4444" }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Chat panel ── */}
        <div className="lg:col-span-2 flex flex-col rounded-3xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(24px)" }}>

          {!selectedUser ? (
            <EmptyChat />
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
                style={{ borderBottom: "1px solid var(--border-color)" }}>
                <Avatar user={selectedUser} size={40} showOnline />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                    {selectedUser.full_name}
                  </p>
                  <p className="text-xs flex items-center gap-1.5" style={{ color: "#22c55e" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Online
                  </p>
                </div>
                <div className="px-3 py-1 rounded-xl text-xs font-medium"
                  style={{ background: "var(--bg-glass)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
                  {ROLE_LABELS[selectedUser.role]}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {messages.length === 0 ? (
                  <EmptyChat user={selectedUser} />
                ) : (
                  groupedMessages.map(group => (
                    <div key={group.date}>
                      <DateSep date={group.date} />
                      <div className="space-y-2">
                        {group.messages.map((m: any) => (
                          <Bubble
                            key={m.id}
                            m={m}
                            isMe={m.sender_id === profile?.id}
                            user={selectedUser}
                            profile={profile}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--border-color)" }}>
                <div className="flex gap-2.5 items-end">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder="Mesaj yazın..."
                    className="flex-1 px-4 py-3 text-sm rounded-2xl focus:outline-none transition-all"
                    style={{
                      background: "var(--bg-glass)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                    onFocus={e => (e.target as HTMLElement).style.borderColor = "rgba(239,68,68,0.5)"}
                    onBlur={e => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:scale-[1.05] active:scale-95 disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg,#ef4444,#f97316)", boxShadow: "0 4px 16px rgba(239,68,68,0.3)", flexShrink: 0 }}>
                    {sending
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Send size={17} className="text-white" />
                    }
                  </button>
                </div>
                <p className="text-xs mt-2 text-center" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                  Enter — göndər
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}