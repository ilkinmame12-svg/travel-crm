"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { Send, Search, MessageCircle, X, Check, CheckCheck, Paperclip, FileText, Image as ImageIcon, Download, File } from "lucide-react"

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

function OnlineDot() {
  return <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2" style={{ background: "#22c55e", borderColor: "var(--bg-secondary)" }} />
}

function Avatar({ user, size = 40, showOnline = false }: { user: any; size?: number; showOnline?: boolean }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-2xl flex items-center justify-center text-white font-bold overflow-hidden"
        style={{ background: ROLE_GRADIENTS[user.role] ?? "linear-gradient(135deg,#6b7280,#9ca3af)", fontSize: size * 0.38 }}>
        {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : <span>{user.full_name?.[0] ?? "?"}</span>}
      </div>
      {showOnline && <OnlineDot />}
    </div>
  )
}

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

function FileAttachment({ fileUrl, fileName, isMe }: { fileUrl: string; fileName: string; isMe: boolean }) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
  const isPDF = ext === "pdf"

  if (isImage) {
    return (
      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
        <img src={fileUrl} alt={fileName} className="max-w-xs rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
          style={{ maxHeight: 200, border: "1px solid var(--border-color)" }} />
        <p className="text-xs mt-1 opacity-70">{fileName}</p>
      </a>
    )
  }

  return (
    <a href={fileUrl} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:opacity-90"
      style={{
        background: isMe ? "rgba(255,255,255,0.15)" : "var(--bg-glass)",
        border: `1px solid ${isMe ? "rgba(255,255,255,0.2)" : "var(--border-color)"}`,
        textDecoration: "none",
      }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: isMe ? "rgba(255,255,255,0.2)" : "rgba(99,102,241,0.12)" }}>
        {isPDF ? <FileText size={18} style={{ color: isMe ? "white" : "#6366f1" }} /> : <File size={18} style={{ color: isMe ? "white" : "#6366f1" }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: isMe ? "white" : "var(--text-primary)" }}>{fileName}</p>
        <p className="text-xs" style={{ color: isMe ? "rgba(255,255,255,0.6)" : "var(--text-muted)" }}>
          {ext.toUpperCase()} fayl
        </p>
      </div>
      <Download size={15} style={{ color: isMe ? "white" : "var(--text-muted)", flexShrink: 0 }} />
    </a>
  )
}

function Bubble({ m, isMe, user, profile }: { m: any; isMe: boolean; user: any; profile: any }) {
  const time = new Date(m.created_at).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })
  const hasFile = m.file_url && m.file_name

  return (
    <div className={`flex gap-2 group ${isMe ? "flex-row-reverse" : ""}`}>
      <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-auto"
        style={{ background: isMe ? "linear-gradient(135deg,#ef4444,#f97316)" : ROLE_GRADIENTS[user?.role ?? "menecer"] }}>
        {isMe ? profile?.fullName?.[0] : user?.full_name?.[0]}
      </div>
      <div className={`flex flex-col gap-0.5 max-w-xs lg:max-w-sm ${isMe ? "items-end" : "items-start"}`}>
        {hasFile && (
          <div className="w-full">
            <FileAttachment fileUrl={m.file_url} fileName={m.file_name} isMe={isMe} />
          </div>
        )}
        {m.content && (
          <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
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
        )}
        <div className={`flex items-center gap-1 ${isMe ? "flex-row-reverse" : ""}`} style={{ color: "var(--text-muted)", fontSize: "11px" }}>
          <span>{time}</span>
          {isMe && (m.is_read ? <CheckCheck size={12} className="text-blue-400" /> : <Check size={12} style={{ color: "var(--text-muted)" }} />)}
        </div>
      </div>
    </div>
  )
}

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
          <p className="text-sm text-center max-w-xs" style={{ color: "var(--text-muted)" }}>Söhbəti başlatmaq üçün mesaj yazın 👋</p>
        </>
      ) : (
        <>
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: "var(--bg-glass)" }}>
            <MessageCircle size={32} style={{ color: "var(--text-muted)" }} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Söhbət seçin</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Sol paneldən istifadəçi seçin</p>
          </div>
        </>
      )}
    </div>
  )
}

export default function ChatPage() {
  const { profile } = useUserRole()
  const [users,        setUsers]        = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [messages,     setMessages]     = useState<any[]>([])
  const [input,        setInput]        = useState("")
  const [search,       setSearch]       = useState("")
  const [unread,       setUnread]       = useState<Record<string, number>>({})
  const [sending,      setSending]      = useState(false)
  const [uploading,    setUploading]    = useState(false)
  const [ready,        setReady]        = useState(false)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLInputElement>(null)
  const fileRef     = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<any>(null)
  const prevUnread  = useRef<Record<string, number>>({})

  useEffect(() => {
    if (!profile) return
    loadUsers(); setReady(true)
    if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission()
  }, [profile])

  useEffect(() => {
    if (!selectedUser || !profile) return
    loadMessages(); markAsRead()
    intervalRef.current = setInterval(() => { loadMessages(); loadUnread() }, 3000)
    return () => clearInterval(intervalRef.current)
  }, [selectedUser])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

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
        const ctx = new AudioContext(); const o = ctx.createOscillator(); const g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.frequency.setValueAtTime(880, ctx.currentTime); o.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
        g.gain.setValueAtTime(0.3, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.3)
      } catch {}
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const sender = users.find(u => Object.keys(counts).includes(u.id))
        new Notification("itstour CRM 💬", { body: `${sender?.full_name ?? "Kimsə"} mesaj göndərdi`, icon: "/logo.png" })
      }
    }
    prevUnread.current = counts; setUnread(counts)
  }

  async function markAsRead() {
    if (!profile || !selectedUser) return
    await supabase.from("messages").update({ is_read: true }).eq("sender_id", selectedUser.id).eq("receiver_id", profile.id).eq("is_read", false)
    setUnread(prev => { const n = { ...prev }; delete n[selectedUser.id]; return n })
  }

  async function sendMessage() {
    if ((!input.trim() && !sending) || !profile || !selectedUser || sending) return
    const content = input.trim()
    setInput(""); setSending(true)
    await supabase.from("messages").insert({ sender_id: profile.id, receiver_id: selectedUser.id, content })
    await loadMessages()
    setSending(false)
    inputRef.current?.focus()
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile || !selectedUser) return
    if (file.size > 10 * 1024 * 1024) { alert("Fayl 10MB-dan böyük ola bilməz"); return }

    setUploading(true)
    const ext = file.name.split(".").pop()
    const path = `${profile.id}/${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from("chat-files").upload(path, file)
    if (uploadErr) { alert("Yükləmə xətası: " + uploadErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from("chat-files").getPublicUrl(path)
    await supabase.from("messages").insert({
      sender_id: profile.id,
      receiver_id: selectedUser.id,
      content: "",
      file_url: publicUrl,
      file_name: file.name,
    })
    await loadMessages()
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: any[] }[] = []
    let currentDate = ""
    messages.forEach(m => {
      const d = new Date(m.created_at)
      const today = new Date(); const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
      let label = d.toLocaleDateString("az-AZ", { day: "numeric", month: "long" })
      if (d.toDateString() === today.toDateString()) label = "Bu gün"
      else if (d.toDateString() === yesterday.toDateString()) label = "Dünən"
      if (label !== currentDate) { currentDate = label; groups.push({ date: label, messages: [] }) }
      groups[groups.length - 1].messages.push(m)
    })
    return groups
  }, [messages])

  const filteredUsers = useMemo(() => users.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase())), [users, search])
  const totalUnread = Object.values(unread).reduce((s, v) => s + v, 0)

  if (!ready) return null

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Mesajlar</h1>
            {totalUnread > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: "linear-gradient(135deg,#ef4444,#f97316)" }}>{totalUnread}</span>
            )}
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Daxili mesajlaşma sistemi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: "calc(100vh - 180px)" }}>

        {/* Users */}
        <div className="lg:col-span-1 flex flex-col rounded-3xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(24px)" }}>
          <div className="p-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
              <Search size={14} style={{ color: "var(--text-muted)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="İstifadəçi axtar..."
                className="text-sm bg-transparent focus:outline-none flex-1" style={{ color: "var(--text-primary)" }} />
              {search && <button onClick={() => setSearch("")} style={{ color: "var(--text-muted)" }}><X size={13} /></button>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredUsers.map(u => {
              const isSelected = selectedUser?.id === u.id
              const uUnread = unread[u.id] ?? 0
              return (
                <button key={u.id} onClick={() => setSelectedUser(u)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all"
                  style={{ background: isSelected ? "var(--bg-glass)" : "transparent", borderBottom: "1px solid var(--border-color)", borderLeft: isSelected ? "3px solid #ef4444" : "3px solid transparent" }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)" }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent" }}>
                  <div className="relative flex-shrink-0">
                    <Avatar user={u} size={42} />
                    {uUnread > 0 && (
                      <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ background: "#ef4444", fontSize: "10px" }}>{uUnread > 9 ? "9+" : uUnread}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)", fontWeight: uUnread > 0 ? 700 : 600 }}>{u.full_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{ROLE_LABELS[u.role] ?? u.role}</p>
                  </div>
                  {uUnread > 0 && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-2 flex flex-col rounded-3xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(24px)" }}>
          {!selectedUser ? <EmptyChat /> : (
            <>
              <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
                <Avatar user={selectedUser} size={40} showOnline />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{selectedUser.full_name}</p>
                  <p className="text-xs flex items-center gap-1.5" style={{ color: "#22c55e" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Online
                  </p>
                </div>
                <div className="px-3 py-1 rounded-xl text-xs font-medium" style={{ background: "var(--bg-glass)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
                  {ROLE_LABELS[selectedUser.role]}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {messages.length === 0 ? <EmptyChat user={selectedUser} /> : (
                  groupedMessages.map(group => (
                    <div key={group.date}>
                      <DateSep date={group.date} />
                      <div className="space-y-2">
                        {group.messages.map((m: any) => (
                          <Bubble key={m.id} m={m} isMe={m.sender_id === profile?.id} user={selectedUser} profile={profile} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input area */}
              <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--border-color)" }}>
                {uploading && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl" style={{ background: "rgba(99,102,241,0.1)" }}>
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-medium" style={{ color: "#6366f1" }}>Fayl yüklənir...</p>
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  {/* File button */}
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    title="Fayl göndər"
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:scale-[1.05] active:scale-95 disabled:opacity-40 flex-shrink-0"
                    style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                    <Paperclip size={17} />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                    onChange={handleFileUpload}
                  />

                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder="Mesaj yazın..."
                    className="flex-1 px-4 py-3 text-sm rounded-2xl focus:outline-none transition-all"
                    style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                    onFocus={e => (e.target as HTMLElement).style.borderColor = "rgba(239,68,68,0.5)"}
                    onBlur={e => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
                  />

                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:scale-[1.05] active:scale-95 disabled:opacity-40 flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#ef4444,#f97316)", boxShadow: "0 4px 16px rgba(239,68,68,0.3)" }}>
                    {sending
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Send size={17} className="text-white" />}
                  </button>
                </div>
                <p className="text-xs mt-1.5 text-center" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                  Enter — göndər · 📎 şəkil, PDF, Excel, Word (maks 10MB)
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}