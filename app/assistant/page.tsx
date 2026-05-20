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
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchBookings()
    setMessages([{ role: "assistant", content: "Salam! Mən itstour CRM köməkçisiyəm. Sifarişlər, maliyyə, borclar haqqında suallarınızı cavablaya bilərəm." }])
    setReady(true)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function buildContext() {
    const totalRevenue = bookings.reduce((s, b) => s + b.sellPrice, 0)
    const totalCost = bookings.reduce((s, b) => s + b.buyPrice, 0)
    const totalProfit = bookings.reduce((s, b) => s + b.profit, 0)
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

    return `Sen itstour CRM sisteminin AI kömekçisisən. Azerbaycan dilinde qısa ve aydın cavab ver.

ÜMUMI MALİYYƏ:
- Ümumi gəlir: ${formatCurrency(totalRevenue)}
- Ümumi xərc: ${formatCurrency(totalCost)}
- Ümumi mənfəət: ${formatCurrency(totalProfit)}
- Ödənilməmiş borclar: ${formatCurrency(unpaidTotal)} (${unpaid.length} sifariş)

SİFARİŞLƏR:
- Cəmi: ${bookings.length}
- Gözləyən: ${bookings.filter(b => b.status === "pending").length}
- Təsdiqlənmiş: ${bookings.filter(b => b.status === "confirmed").length}

MENECERLƏR:
${managerSummary}`
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
            ...messages.slice(1).map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMsg }
          ]
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
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Köməkçi</h1>
        <p className="text-sm text-gray-500 mt-0.5">CRM məlumatlarınız əsasında suallarınızı cavablayır</p>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ minHeight: "500px" }}>
        <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ maxHeight: "calc(100vh - 320px)" }}>
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
          <div className="flex gap-2 flex-wrap mb-3">
            {["Bu ay neçə sifariş var?", "Ən yaxşı menecer kim?", "Ödənilməmiş borclar?", "Ümumi mənfəət nə qədərdir?"].map(q => (
              <button key={q} onClick={() => setInput(q)}
                className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors">
                {q}
              </button>
            ))}
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