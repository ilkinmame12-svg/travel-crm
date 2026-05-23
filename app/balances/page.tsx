"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { formatCurrency } from "@/lib/calculations"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { Plus, TrendingUp, TrendingDown, Wallet, Download } from "lucide-react"
import * as XLSX from "xlsx"

interface ClientBalance {
  id: string
  clientName: string
  clientPhone: string
  balance: number
  notes: string
}

interface Transaction {
  id: string
  clientName: string
  amount: number
  type: "credit" | "debit"
  bookingId: string | null
  description: string
  createdAt: string
}

export default function BalancesPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const [balances, setBalances] = useState<ClientBalance[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selected, setSelected] = useState<ClientBalance | null>(null)
  const [modal, setModal] = useState<"add_balance" | "add_transaction" | null>(null)
  const [ready, setReady] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchBookings()
    fetchBalances()
    fetchTransactions()
    setReady(true)
  }, [])

  async function fetchBalances() {
    const { data } = await supabase.from("client_balances").select("*").order("balance", { ascending: false })
    if (data) setBalances(data.map((b: any) => ({
      id: b.id, clientName: b.client_name, clientPhone: b.client_phone ?? "",
      balance: b.balance, notes: b.notes ?? ""
    })))
  }

  async function fetchTransactions() {
    const { data } = await supabase.from("client_balance_transactions").select("*").order("created_at", { ascending: false })
    if (data) setTransactions(data.map((t: any) => ({
      id: t.id, clientName: t.client_name, amount: t.amount,
      type: t.type, bookingId: t.booking_id, description: t.description ?? "",
      createdAt: t.created_at
    })))
  }

  async function handleAddBalance(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const clientName = fd.get("clientName") as string
    const clientPhone = fd.get("clientPhone") as string
    const initialBalance = Number(fd.get("initialBalance") ?? 0)

    const existing = balances.find(b => b.clientName.toLowerCase() === clientName.toLowerCase())
    if (existing) {
      await supabase.from("client_balances").update({ balance: existing.balance + initialBalance }).eq("id", existing.id)
    } else {
      await supabase.from("client_balances").insert({
        client_name: clientName, client_phone: clientPhone, balance: initialBalance
      })
    }

    if (initialBalance > 0) {
      await supabase.from("client_balance_transactions").insert({
        client_name: clientName, amount: initialBalance, type: "credit",
        description: fd.get("description") as string || "Başlanğıc balans"
      })
    }

    await fetchBalances()
    await fetchTransactions()
    setModal(null)
  }

  async function handleAddTransaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected) return
    const fd = new FormData(e.currentTarget)
    const amount = Number(fd.get("amount"))
    const type = fd.get("type") as "credit" | "debit"
    const description = fd.get("description") as string

    const newBalance = type === "credit"
      ? selected.balance + amount
      : selected.balance - amount

    await supabase.from("client_balances").update({ balance: newBalance }).eq("id", selected.id)
    await supabase.from("client_balance_transactions").insert({
      client_name: selected.clientName, amount, type, description
    })

    await fetchBalances()
    await fetchTransactions()
    setModal(null)
    setSelected(null)
  }

  async function handleDelete(id: string) {
    if (confirm("Silinsin?")) {
      await supabase.from("client_balances").delete().eq("id", id)
      await fetchBalances()
    }
  }

  function exportExcel() {
    const rows = balances.map(b => ({
      "Müştəri": b.clientName,
      "Telefon": b.clientPhone,
      "Balans (AZN)": b.balance,
      "Status": b.balance > 0 ? "Kredit" : b.balance < 0 ? "Borc" : "Sıfır",
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Balanslar")
    XLSX.writeFile(wb, "client_balances.xlsx")
  }

  function getClientTransactions(clientName: string) {
    return transactions.filter(t => t.clientName === clientName)
  }

  function getClientBookings(clientName: string) {
    return bookings.filter(b => b.clientName.toLowerCase() === clientName.toLowerCase())
  }

  if (!ready) return null

  const filtered = balances.filter(b =>
    b.clientName.toLowerCase().includes(search.toLowerCase()) ||
    b.clientPhone.includes(search)
  )

  const totalCredit = balances.filter(b => b.balance > 0).reduce((s, b) => s + b.balance, 0)
  const totalDebt = balances.filter(b => b.balance < 0).reduce((s, b) => s + Math.abs(b.balance), 0)
  const totalClients = balances.length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Müştəri Balansları</h1>
          <p className="text-sm text-gray-500 mt-0.5">Artıq ödənişlər və kredit idarəetməsi</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportExcel}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-600">
            <Download size={16} />
            Excel
          </button>
          <button onClick={() => { setSelected(null); setModal("add_balance") }}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-600">
            <Plus size={16} />
            Yeni balans
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-500 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm opacity-90">Ümumi kredit</p>
            <TrendingUp size={18} className="opacity-70" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalCredit)}</p>
          <p className="text-xs opacity-70 mt-1">{balances.filter(b => b.balance > 0).length} müştəri</p>
        </div>
        <div className="bg-red-500 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm opacity-90">Ümumi borc</p>
            <TrendingDown size={18} className="opacity-70" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalDebt)}</p>
          <p className="text-xs opacity-70 mt-1">{balances.filter(b => b.balance < 0).length} müştəri</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Müştərilər</p>
            <Wallet size={18} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 mb-6">
        <div className="p-4 border-b border-gray-100">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Müştəri adı və ya telefon..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Wallet size={32} className="mx-auto mb-3 opacity-40" />
            <p>Balans tapılmadı</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(client => {
              const clientTxns = getClientTransactions(client.clientName)
              const clientBookings = getClientBookings(client.clientName)
              return (
                <div key={client.id} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                        <span className="text-red-600 font-bold">{client.clientName[0]}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{client.clientName}</p>
                        {client.clientPhone && <p className="text-xs text-gray-400">{client.clientPhone}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{clientBookings.length} sifariş</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-xl font-bold ${
                          client.balance > 0 ? "text-green-600" :
                          client.balance < 0 ? "text-red-500" : "text-gray-400"
                        }`}>{formatCurrency(client.balance)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          client.balance > 0 ? "bg-green-100 text-green-700" :
                          client.balance < 0 ? "bg-red-100 text-red-600" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {client.balance > 0 ? "Kredit" : client.balance < 0 ? "Borc" : "Sıfır"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setSelected(client); setModal("add_transaction") }}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100">
                          + Əməliyyat
                        </button>
                        <button onClick={() => handleDelete(client.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 text-xs">🗑️</button>
                      </div>
                    </div>
                  </div>

                  {clientTxns.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {clientTxns.slice(0, 3).map(t => (
                        <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              t.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                            }`}>
                              {t.type === "credit" ? "+" : "-"}
                            </span>
                            <span className="text-xs text-gray-600">{t.description}</span>
                            <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString("az-AZ")}</span>
                          </div>
                          <span className={`text-sm font-semibold ${
                            t.type === "credit" ? "text-green-600" : "text-red-500"
                          }`}>
                            {t.type === "credit" ? "+" : "-"}{formatCurrency(t.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal === "add_balance" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Yeni müştəri balansı</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleAddBalance} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Müştəri adı *</label>
                <input name="clientName" required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input name="clientPhone"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlanğıc balans (AZN)</label>
                <input name="initialBalance" type="number" step="0.01" defaultValue={0}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qeyd</label>
                <input name="description"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => setModal(null)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Ləğv et</button>
                <button type="submit"
                  className="px-5 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium">Əlavə et</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "add_transaction" && selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{selected.clientName} — Əməliyyat</h2>
              <button onClick={() => { setModal(null); setSelected(null) }} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Növ</label>
                <select name="type"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                  <option value="credit">Kredit (artıq ödəniş)</option>
                  <option value="debit">Debit (silinmə)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Məbləğ (AZN) *</label>
                <input name="amount" type="number" step="0.01" min="0" required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıqlama</label>
                <input name="description" placeholder="Məs: Artıq ödəniş, növbəti sifarişə keçirildi"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Cari balans: <span className={`font-bold ${selected.balance >= 0 ? "text-green-600" : "text-red-500"}`}>{formatCurrency(selected.balance)}</span></p>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => { setModal(null); setSelected(null) }}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Ləğv et</button>
                <button type="submit"
                  className="px-5 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium">Əlavə et</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}