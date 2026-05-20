"use client"

import { useState, useEffect, useRef } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { formatCurrency } from "@/lib/calculations"
import { Send, Bot, User } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function AssistantPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Salam! Mən itstour CRM köməkçisiyəm. Sifarişlər, maliyyə, borclar, menecerlər haqqında suallarınızı cavablaya bilərəm. Nə soruşmaq istəyirsiniz?" }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchBookings() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  function buildContext() {
    const totalRevenue = bookings.reduce((s, b) => s + b.sellPrice, 0)
    const totalCost = bookings.reduce((s, b) => s + b.buyPrice, 0)
    const totalProfit = bookings.reduce((s, b) => s + b.profit, 0)
    const totalCommission = bookings.reduce((s, b) => s + b.commissionAmount, 0)
    const unpaid = bookings.filter(b => b.paymentStatus !== "paid")
    const unpaidTotal = unpaid.reduce((s, b) => s + (b.sellPrice - (b.paidAmount ?? 0)), 0)

    const managerStats = bookings.reduce((acc: any, b) => {
      if (!acc[b.manager]) acc[b.manager] = { count: 0, profit: 0, revenue: 0 }
      acc[b.manager].count++
      acc[b.manager].profit += b.profit
      acc[b.manager].revenue += b.sellPrice
      return acc
    }, {})

    const managerSummary = Object.entries(managerStats).map(([name, stats]: any) =>
      `${name}: ${stats.count} sifariş, ${formatCurrency(stats.revenue)} gəlir, ${formatCurrency(stats.profit)} mənfəət`
    ).join("\n")

    const recentBookings = bookings.slice(0, 10).map(b =>
      `${b.clientName} - ${b.destination} - ${formatCurrency(b.sellPrice)} - ${b.status} - ${b.paymentStatus}`
    ).join("\n")

    const typeStats = bookings.reduce((acc: any, b) => {
      acc[b.bookingType] = (acc[b.bookingType] || 0) + 1
      return acc
    }, {})

    return `Sen itstour CRM sisteminin köməkçisisən. Azerbaycan dilinde cavab ver. Qisa ve aydin cavab ver.

ÜMUMI MALİYYƏ:
- Ümumi gəlir: ${formatCurrency(totalRevenue)}
- Ümumi xərc: ${formatCurrency(totalCost)}
- Ümumi mənfəət: ${formatCurrency(totalProfit)}
- Ümumi komissiya: ${formatCurrency(totalCommission)}
- Ödənilməmiş borclar: ${formatCurrency(unpaidTotal)} (${unpaid.length} sifariş)

SİFARİŞLƏR:
- Cəmi: ${bookings.length}
- Gözləyən: ${bookings.filter(b => b.status === "pending").length}
- Təsdiqlənmiş: ${bookings.filter(b => b.status === "confirmed").length}
- Tamamlanmış: ${bookings.filter(b => b.status === "completed").length}

NÖV ÜZRƏ:
${Object.entries(typeStats).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

MENECERLƏR:
${managerSummary}

SON SİFARİŞLƏR:
${recentBookings}`
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
    messages: [
      ...messages.filter((m, idx) => !(m.role === "assistant" && idx === 0)).map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: "user", content: userMsg }
    ]
  })
})

      const data = await response.json()
      const reply = data.content?.[0]?.text ?? "Xəta baş verdi"
      setMessages(prev => [...prev, { role: "assistant", content: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Xəta baş verdi. Yenidən cəhd edin." }])
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Köməkçi</h1>
        <p className="text-sm text-gray-500 mt-0.5">CRM məlumatlarınız əsasında suallarınızı cavablayır</p>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ height: "calc(100vh - 200px)" }}>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                m.role === "assistant" ? "bg-red-100" : "bg-gray-100"
              }`}>
                {m.role === "assistant"
                  ? <Bot size={16} className="text-red-500" />
                  : <User size={16} className="text-gray-600" />
                }
              </div>
              <div className={`max-w-2xl px-4 py-3 rounded-2xl text-sm ${
                m.role === "assistant"
                  ? "bg-gray-50 text-gray-800 rounded-tl-none"
                  : "bg-red-500 text-white rounded-tr-none"
              }`}>
                {m.content.split("\n").map((line, j) => (
                  <p key={j} className={j > 0 ? "mt-1" : ""}>{line}</p>
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <Bot size={16} className="text-red-500" />
              </div>
              <div className="bg-gray-50 px-4 py-3 rounded-2xl rounded-tl-none">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-3">
            <div className="flex-1 flex gap-2 flex-wrap mb-2">
              {["Bu ay neçə sifariş var?", "Ən yaxşı menecer kim?", "Ödənilməmiş borclar nə qədərdir?", "Ən çox gedilən yer?"].map(q => (
                <button key={q} onClick={() => setInput(q)}
                  className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Sual yazın..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="bg-red-500 text-white px-4 py-3 rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}