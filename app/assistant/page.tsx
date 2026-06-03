"use client"

import { useState, useEffect, useRef } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { formatCurrency } from "@/lib/calculations"
import { Send, Bot, User, Trash2 } from "lucide-react"

interface Message { role: "user" | "assistant"; content: string }

export default function AssistantPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const { profile } = useUserRole()
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return []
    try { const saved = localStorage.getItem('assistant_messages'); return saved ? JSON.parse(saved) : [] } catch { return [] }
  })
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchBookings()
    if (messages.length === 0) setMessages([{ role: "assistant", content: "Salam! Mən itstour CRM köməkçisiyəm. Sifarişlər haqqında suallarınızı cavablaya bilərəm. Yeni sifariş əlavə etmək və ya axtarmaq üçün kömək edə bilərəm! 🚀" }])
    setReady(true)
  }, [])

  useEffect(() => {
    if (messages.length > 0) localStorage.setItem('assistant_messages', JSON.stringify(messages.slice(-50)))
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const isAdmin = ["it_admin", "direktor", "boss", "muhasib"].includes(profile?.role ?? "")

  function buildContext() {
    const totalRevenue = bookings.reduce((s, b) => s + b.sellPrice, 0)
    const totalProfit = bookings.reduce((s, b) => s + b.profit, 0)
    const unpaid = bookings.filter(b => b.paymentStatus !== "paid")
    const unpaidTotal = unpaid.reduce((s, b) => s + (b.sellPrice - (b.paidAmount ?? 0)), 0)

    const managerStats = bookings.reduce((acc: any, b) => {
      if (!acc[b.manager]) acc[b.manager] = { count: 0, profit: 0, revenue: 0 }
      acc[b.manager].count++; acc[b.manager].profit += b.profit; acc[b.manager].revenue += b.sellPrice
      return acc
    }, {})

    // For managers - only show their own bookings, no financial data
    if (!isAdmin) {
      const myBookings = bookings.filter(b => b.manager === profile?.fullName)
      const recentBookings = myBookings.slice(0, 20).map(b =>
        `${b.clientName} | ${b.destination} | ${b.departureDate} | ${b.paymentStatus} | ${b.bookingType}`
      ).join("\n")
      return `İstifadəçi: ${profile?.fullName} (Menecer)\nMənim sifarişlərim: ${myBookings.length}\n\nSON SİFARİŞLƏRİM:\n${recentBookings}`
    }

    const topDebts = unpaid.sort((a, b) => (b.sellPrice - (b.paidAmount ?? 0)) - (a.sellPrice - (a.paidAmount ?? 0))).slice(0, 10).map(b => `${b.clientName}: ${formatCurrency(b.sellPrice - (b.paidAmount ?? 0))} borc`).join("\n")
    const recentBookings = bookings.slice(0, 20).map(b => `${b.clientName} | ${b.destination} | ${b.departureDate} | ${formatCurrency(b.sellPrice)} | ${b.paymentStatus} | ${b.manager}`).join("\n")
    const managerSummary = Object.entries(managerStats).map(([name, s]: any) => `${name}: ${s.count} sifariş, ${formatCurrency(s.revenue)} gəlir`).join("\n")

    return `İstifadəçi: ${profile?.fullName} (${profile?.role})\n\nÜMUMİ: Gəlir: ${formatCurrency(totalRevenue)}, Mənfəət: ${formatCurrency(totalProfit)}, Ödənilməmiş: ${formatCurrency(unpaidTotal)} (${unpaid.length})\nSifarişlər: ${bookings.length}\n\nBORCLAR:\n${topDebts}\n\nSON SİFARİŞLƏR:\n${recentBookings}\n\nMENECERLƏR:\n${managerSummary}`
  }

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: userMsg }])
    setLoading(true)
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: buildContext(),
          role: profile?.role ?? "menecer",
          messages: [...messages.slice(1).map(m => ({ role: m.role, content: m.content })), { role: "user", content: userMsg }]
        })
      })
      const data = await response.json()
      const reply = data.content?.[0]?.text ?? "Xəta baş verdi"
      setMessages(prev => [...prev, { role: "assistant", content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Xəta baş verdi." }])
    }
    setLoading(false)
  }

  if (!ready) return null

  return (
    <div className="min-h-screen p-5 md:p-7 flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>AI Köməkçi</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>CRM məlumatlarınız əsasında suallarınızı cavablayır</p>
        </div>
        <button onClick={() => { localStorage.removeItem('assistant_messages'); setMessages([{ role: "assistant", content: "Salam! Yenidən başlayırıq 👋" }]) }}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl text-sm"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
          <Trash2 size={14} />Təmizlə
        </button>
      </div>

      <div className="flex-1 flex flex-col rounded-3xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(20px)", minHeight: "500px" }}>
        <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ maxHeight: "calc(100vh - 280px)" }}>
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className="w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0" style={{
                background: m.role === "assistant" ? "linear-gradient(135deg, #ef4444, #f97316)" : "var(--bg-glass)",
                border: "1px solid var(--border-color)",
              }}>
                {m.role === "assistant" ? <Bot size={15} className="text-white" /> : <User size={15} style={{ color: "var(--text-secondary)" }} />}
              </div>
              <div className="max-w-2xl px-4 py-3 rounded-2xl text-sm" style={{
                background: m.role === "assistant" ? "var(--bg-glass)" : "linear-gradient(135deg, #ef4444, #f97316)",
                border: m.role === "assistant" ? "1px solid var(--border-color)" : "none",
                color: m.role === "assistant" ? "var(--text-primary)" : "white",
                borderTopLeftRadius: m.role === "assistant" ? "4px" : "16px",
                borderTopRightRadius: m.role === "user" ? "4px" : "16px",
              }}>
                {m.content.split("\n").map((line, j) => <p key={j} className={j > 0 ? "mt-1" : ""}>{line}</p>)}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
                <Bot size={15} className="text-white" />
              </div>
              <div className="px-4 py-3 rounded-2xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", borderTopLeftRadius: "4px" }}>
                <div className="flex gap-1">
                  {[0, 150, 300].map(delay => (
                    <div key={delay} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--text-muted)", animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4" style={{ borderTop: "1px solid var(--border-color)" }}>
          <div className="flex gap-2 flex-wrap mb-3">
            {(isAdmin
              ? ["Bu ay neçə sifariş var?", "Ən yaxşı menecer kim?", "Ödənilməmiş borclar?", "Ümumi mənfəət?"]
              : ["Mənim sifarişlərim neçədir?", "Bu ay neçə sifariş etmişəm?", "Yeni sifariş əlavə et", "Ödənilməmiş sifarişlərim?"]
            ).map(q => (
              <button key={q} onClick={() => setInput(q)}
                className="text-xs px-3 py-1.5 rounded-xl transition-all"
                style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                {q}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Sual yazın..."
              className="flex-1 px-4 py-3 text-sm rounded-2xl focus:outline-none"
              style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="px-4 py-3 rounded-2xl disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
              <Send size={18} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}