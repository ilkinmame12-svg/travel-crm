"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { formatCurrency, formatDate } from "@/lib/calculations"
import { CheckCircle, XCircle, Eye, Clock } from "lucide-react"

export default function DraftsPage() {
  const { profile } = useUserRole()
  const [drafts, setDrafts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [reviewNote, setReviewNote] = useState("")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetchDrafts()
    setReady(true)
  }, [profile])

  async function fetchDrafts() {
    setLoading(true)
    let query = supabase.from("booking_drafts").select("*").order("created_at", { ascending: false })
    
    // Managers only see their own drafts
    if (profile?.role === "menecer") {
      query = query.eq("submitted_by", profile.fullName)
    }
    
    const { data } = await query
    setDrafts(data ?? [])
    setLoading(false)
  }

  async function handleApprove(draft: any) {
    // Add to bookings
    const { error } = await supabase.from("bookings").insert({
      client_name: draft.client_name,
      client_phone: draft.client_phone ?? "",
      destination: draft.destination,
      departure_date: draft.departure_date,
      return_date: draft.return_date ?? draft.departure_date,
      travelers: draft.travelers ?? 1,
      booking_type: draft.booking_type,
      description: draft.description ?? "",
      vendor: draft.vendor ?? "",
      is_iata: draft.is_iata ?? false,
      buy_price: draft.buy_price,
      sell_price: draft.sell_price,
      commission_percent: draft.commission_percent,
      commission_amount: draft.commission_amount,
      profit: draft.profit,
      paid_amount: draft.paid_amount ?? 0,
      manager: draft.manager,
      iata_period: draft.iata_period ?? "1-7",
      status: "confirmed",
      payment_status: draft.payment_status ?? "unpaid",
      notes: draft.notes ?? "",
      ticket_number: draft.ticket_number ?? "",
      booking_reference: draft.booking_reference ?? "",
      pnr: draft.pnr ?? "",
      updated_by: profile?.fullName ?? "",
      updated_by_role: profile?.role ?? "",
    })

    if (error) { alert("Xəta: " + error.message); return }

    // Update draft status
    await supabase.from("booking_drafts").update({
      review_status: "approved",
      reviewer_note: reviewNote,
    }).eq("id", draft.id)

    setSelected(null)
    setReviewNote("")
    fetchDrafts()
  }

  async function handleReject(draft: any) {
    await supabase.from("booking_drafts").update({
      review_status: "rejected",
      reviewer_note: reviewNote,
    }).eq("id", draft.id)

    setSelected(null)
    setReviewNote("")
    fetchDrafts()
  }

  async function handleDelete(id: string) {
    if (!confirm("Silinsin?")) return
    await supabase.from("booking_drafts").delete().eq("id", id)
    fetchDrafts()
  }

  if (!ready) return null

  const pending = drafts.filter(d => d.review_status === "pending")
  const approved = drafts.filter(d => d.review_status === "approved")
  const rejected = drafts.filter(d => d.review_status === "rejected")

  const canReview = ["it_admin", "direktor", "muhasib"].includes(profile?.role ?? "")

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Təsdiq gözləyən sifarişlər</h1>
          <p className="text-sm text-gray-500 mt-0.5">Menecerlərin əlavə etdiyi sifarişlər</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
            <p className="text-xs text-amber-600">Gözləyir</p>
            <p className="text-xl font-bold text-amber-700">{pending.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-center">
            <p className="text-xs text-green-600">Təsdiqlənib</p>
            <p className="text-xl font-bold text-green-700">{approved.length}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-center">
            <p className="text-xs text-red-600">Rədd edilib</p>
            <p className="text-xl font-bold text-red-700">{rejected.length}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Yüklənir...</div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Clock size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Heç bir sifariş yoxdur</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Müştəri", "İstiqamət", "Növ", "Tarix", "Satış", "Menecer", "Status", ""].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drafts.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 border-b border-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{d.client_name}</p>
                    <p className="text-xs text-gray-400">{d.client_phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{d.destination}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{d.booking_type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(d.departure_date)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(d.sell_price)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{d.manager}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      d.review_status === "pending" ? "bg-amber-100 text-amber-700" :
                      d.review_status === "approved" ? "bg-green-100 text-green-700" :
                      "bg-red-100 text-red-600"
                    }`}>
                      {d.review_status === "pending" ? "⏳ Gözləyir" :
                       d.review_status === "approved" ? "✅ Təsdiqlənib" : "❌ Rədd edilib"}
                    </span>
                    {d.reviewer_note && (
                      <p className="text-xs text-gray-400 mt-0.5">{d.reviewer_note}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setSelected(d); setReviewNote("") }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500">
                        <Eye size={15} />
                      </button>
                      {profile?.role === "it_admin" && (
                        <button onClick={() => handleDelete(d.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <XCircle size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Sifariş təfərrüatı</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-gray-400">Müştəri</p><p className="font-semibold">{selected.client_name}</p></div>
                <div><p className="text-xs text-gray-400">Telefon</p><p className="font-semibold">{selected.client_phone || "—"}</p></div>
                <div><p className="text-xs text-gray-400">İstiqamət</p><p className="font-semibold">{selected.destination}</p></div>
                <div><p className="text-xs text-gray-400">Növ</p><p className="font-semibold">{selected.booking_type}</p></div>
                <div><p className="text-xs text-gray-400">Uçuş tarixi</p><p className="font-semibold">{formatDate(selected.departure_date)}</p></div>
                <div><p className="text-xs text-gray-400">Qayıdış tarixi</p><p className="font-semibold">{formatDate(selected.return_date)}</p></div>
                <div><p className="text-xs text-gray-400">Satış qiyməti</p><p className="font-semibold text-green-600">{formatCurrency(selected.sell_price)}</p></div>
                <div><p className="text-xs text-gray-400">Alış qiyməti</p><p className="font-semibold">{formatCurrency(selected.buy_price)}</p></div>
                <div><p className="text-xs text-gray-400">Mənfəət</p><p className="font-semibold text-blue-600">{formatCurrency(selected.profit)}</p></div>
                <div><p className="text-xs text-gray-400">Menecer</p><p className="font-semibold">{selected.manager}</p></div>
                <div><p className="text-xs text-gray-400">Vendor</p><p className="font-semibold">{selected.vendor || "—"}</p></div>
                <div><p className="text-xs text-gray-400">PNR</p><p className="font-semibold">{selected.pnr || "—"}</p></div>
              </div>
              {selected.notes && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Qeydlər</p>
                  <p className="text-sm text-gray-700">{selected.notes}</p>
                </div>
              )}
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs text-amber-600 mb-1">Göndərən</p>
                <p className="text-sm font-semibold text-amber-800">{selected.submitted_by} ({selected.submitted_by_role})</p>
              </div>

              {canReview && selected.review_status === "pending" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qeyd (istəyə görə)</label>
                    <input type="text" value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                      placeholder="Düzəliş tələbi və ya qeyd..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div className="flex gap-3 pt-2 border-t">
                    <button onClick={() => handleApprove(selected)}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-green-700">
                      <CheckCircle size={16} />
                      Təsdiqlə və yayımla
                    </button>
                    <button onClick={() => handleReject(selected)}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-red-600">
                      <XCircle size={16} />
                      Rədd et
                    </button>
                  </div>
                </>
              )}

              {selected.review_status !== "pending" && (
                <div className={`rounded-xl p-3 ${selected.review_status === "approved" ? "bg-green-50" : "bg-red-50"}`}>
                  <p className={`text-sm font-semibold ${selected.review_status === "approved" ? "text-green-700" : "text-red-700"}`}>
                    {selected.review_status === "approved" ? "✅ Təsdiqlənib" : "❌ Rədd edilib"}
                  </p>
                  {selected.reviewer_note && <p className="text-xs mt-1 text-gray-600">{selected.reviewer_note}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
