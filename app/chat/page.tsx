"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { Send, Search } from "lucide-react"

const card = { background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(20px)", borderRadius: "24px" }

const ROLE_LABELS: Record<string, string> = {
  it_admin: "IT Admin", boss: "Boss", direktor: "Direktor", muhasib: "Mühasib", menecer: "Menecer"
}

const ROLE_GRADIENTS: Record<string, string> = {
  it_admin: "linear-gradient(135deg, #667eea, #764ba2)",
  boss: "linear-gradient(135deg, #ef4444, #f97316)",
  direktor: "linear-gradient(135deg, #3b82f6, #06b6d4)",
  muhasib: "linear-gradient(135deg, #10b981, #34d399)",
  menecer: "linear-gradient(135deg, #6b7280, #9ca3af)",
}

export default function ChatPage() {
  const { profile } = useUserRole()
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [search, setSearch] = useState("")
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [ready, setReady] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<any>(null)
  const prevUnread = useRef<Record<string, number>>({})

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
    const unreadInterval = setInterval(loadUnread, 5000)
    return () => clearInterval(unreadInterval)
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
  if (data) {
    const counts: Record<string, number> = {}
    data.forEach((m: any) => { counts[m.sender_id] = (counts[m.sender_id] ?? 0) + 1 })
    
    // Check if new messages arrived
    const hasNew = Object.entries(counts).some(([id, count]) => (prevUnread.current[id] ?? 0) < count)
    if (hasNew) {
      // Play sound
      const ctx = new AudioContext()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.setValueAtTime(880, ctx.currentTime)
      o.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
      g.gain.setValueAtTime(0.3, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.3)

      // Browser notification
      if (Notification.permission === "granted") {
        const sender = users.find(u => Object.keys(counts).includes(u.id))
        new Notification("itstour CRM", { body: `${sender?.full_name ?? "Kimsə"} sizə mesaj göndərdi`, icon: "/logo.png" })
      }
    }
    
    prevUnread.current = counts
    setUnread(counts)
  }
}
  

  async function markAsRead() {
    if (!profile || !selectedUser) return
    await supabase.from("messages").update({ is_read: true }).eq("sender_id", selectedUser.id).eq("receiver_id", profile.id).eq("is_read", false)
    setUnread(prev => { const n = { ...prev }; delete n[selectedUser.id]; return n })
  }

  async function sendMessage() {
    if (!input.trim() || !profile || !selectedUser) return
    const content = input.trim()
    setInput("")
    await supabase.from("messages").insert({ sender_id: profile.id, receiver_id: selectedUser.id, content })
    await loadMessages()
  }

  if (!ready) return null

  const filteredUsers = users.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()))
  const totalUnread = Object.values(unread).reduce((s, v) => s + v, 0)

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Mesajlar {totalUnread > 0 && <span className="text-sm px-2 py-0.5 rounded-full ml-2" style={{ background: "linear-gradient(135deg,#ef4444,#f97316)", color: "white" }}>{totalUnread}</span>}</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Daxili mesajlaşma sistemi</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" style={{ height: "calc(100vh - 180px)" }}>

        {/* Users list */}
        <div className="lg:col-span-1 flex flex-col rounded-3xl overflow-hidden" style={card}>
          <div className="p-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)" }}>
              <Search size={14} style={{ color: "var(--text-muted)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Axtar..." className="text-sm bg-transparent focus:outline-none flex-1" style={{ color: "var(--text-primary)" }} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredUsers.map(u => (
              <button key={u.id} onClick={() => setSelectedUser(u)}
                className="w-full flex items-center gap-3 p-4 text-left transition-all"
                style={{
                  background: selectedUser?.id === u.id ? "var(--bg-glass)" : "transparent",
                  borderBottom: "1px solid var(--border-color)",
                  borderLeft: selectedUser?.id === u.id ? "3px solid #ef4444" : "3px solid transparent",
                }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0 relative overflow-hidden" style={{ background: ROLE_GRADIENTS[u.role] ?? "linear-gradient(135deg,#6b7280,#9ca3af)" }}>
                  {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <span>{u.full_name?.[0] ?? "?"}</span>}
                  {unread[u.id] > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#ef4444", fontSize: "10px" }}>{unread[u.id]}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{u.full_name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ROLE_LABELS[u.role] ?? u.role}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="lg:col-span-2 flex flex-col rounded-3xl overflow-hidden" style={card}>
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-3" style={{ color: "var(--text-muted)" }}>
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl" style={{ background: "var(--bg-glass)" }}>💬</div>
              <p className="text-sm font-medium">Söhbət başlatmaq üçün istifadəçi seçin</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold overflow-hidden" style={{ background: ROLE_GRADIENTS[selectedUser.role] ?? "linear-gradient(135deg,#6b7280,#9ca3af)" }}>
                  {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" /> : <span>{selectedUser.full_name?.[0]}</span>}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{selectedUser.full_name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ROLE_LABELS[selectedUser.role]}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                    <p className="text-sm">Hələ mesaj yoxdur. Söhbəti siz başladın! 👋</p>
                  </div>
                ) : messages.map((m: any) => {
                  const isMe = m.sender_id === profile?.id
                  return (
                    <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: isMe ? "linear-gradient(135deg,#ef4444,#f97316)" : ROLE_GRADIENTS[selectedUser.role] }}>
                        {isMe ? profile?.fullName?.[0] : selectedUser.full_name?.[0]}
                      </div>
                      <div className="max-w-xs lg:max-w-md">
                        <div className="px-4 py-2.5 rounded-2xl text-sm" style={{
                          background: isMe ? "linear-gradient(135deg,#ef4444,#f97316)" : "var(--bg-glass)",
                          color: isMe ? "white" : "var(--text-primary)",
                          border: isMe ? "none" : "1px solid var(--border-color)",
                          borderTopRightRadius: isMe ? "4px" : "16px",
                          borderTopLeftRadius: isMe ? "16px" : "4px",
                        }}>
                          {m.content}
                        </div>
                        <p className={`text-xs mt-1 ${isMe ? "text-right" : ""}`} style={{ color: "var(--text-muted)" }}>
                          {new Date(m.created_at).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-4" style={{ borderTop: "1px solid var(--border-color)" }}>
                <div className="flex gap-3">
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="Mesaj yazın..."
                    className="flex-1 px-4 py-3 text-sm rounded-2xl focus:outline-none"
                    style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
                  <button onClick={sendMessage} disabled={!input.trim()} className="px-4 py-3 rounded-2xl disabled:opacity-50 transition-all" style={{ background: "linear-gradient(135deg,#ef4444,#f97316)" }}>
                    <Send size={18} className="text-white" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
