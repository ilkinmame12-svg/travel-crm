"use client"

import { useState, useEffect } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { formatCurrency } from "@/lib/calculations"
import { supabase } from "@/lib/supabase"
import { Plus, Trash2, Users, TrendingUp, DollarSign, Award } from "lucide-react"

interface Employee {
  id: string
  name: string
  position: string
  baseSalary: number
  commissionPercent: number
  phone: string
  email: string
  status: "active" | "inactive"
}

export default function EmployeesPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetchBookings()
    fetchEmployees()
    setReady(true)
  }, [])

  async function fetchEmployees() {
    const { data } = await supabase.from("employees").select("*").order("created_at", { ascending: false })
    if (data) {
      setEmployees(data.map((e: any) => ({
        id: e.id,
        name: e.name,
        position: e.position ?? "",
        baseSalary: e.base_salary ?? 0,
        commissionPercent: e.commission_percent ?? 5,
        phone: e.phone ?? "",
        email: e.email ?? "",
        status: e.status ?? "active",
      })))
    }
    setLoading(false)
  }

  function getEmployeeStats(employeeName: string) {
    const empBookings = bookings.filter(b => b.manager === employeeName)
    const totalRevenue = empBookings.reduce((s, b) => s + b.sellPrice, 0)
    const totalProfit = empBookings.reduce((s, b) => s + b.profit, 0)
    const totalCommission = empBookings.reduce((s, b) => s + b.commissionAmount, 0)
    const bookingsCount = empBookings.length
    const unpaid = empBookings.filter(b => b.paymentStatus !== "paid").length
    return { totalRevenue, totalProfit, totalCommission, bookingsCount, unpaid }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = {
      name: fd.get("name") as string,
      position: fd.get("position") as string,
      base_salary: Number(fd.get("baseSalary")),
      commission_percent: Number(fd.get("commissionPercent")),
      phone: fd.get("phone") as string,
      email: fd.get("email") as string,
      status: fd.get("status") as string,
    }

    if (selected) {
      await supabase.from("employees").update(data).eq("id", selected.id)
    } else {
      await supabase.from("employees").insert(data)
    }

    await fetchEmployees()
    setModal(false)
    setSelected(null)
  }

  async function handleDelete(id: string) {
    if (confirm("Silinsin?")) {
      await supabase.from("employees").delete().eq("id", id)
      await fetchEmployees()
    }
  }

  if (!ready) return null

  const totalBaseSalary = employees.filter(e => e.status === "active").reduce((s, e) => s + e.baseSalary, 0)
  const totalCommissions = employees.reduce((s, e) => {
    const stats = getEmployeeStats(e.name)
    return s + stats.totalCommission
  }, 0)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">İşçilər</h1>
          <p className="text-sm text-gray-500 mt-0.5">Əməkdaşlar və maaş idarəetməsi</p>
        </div>
        <button onClick={() => { setSelected(null); setModal(true) }}
          className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 shadow-sm">
          <Plus size={16} />
          Yeni işçi
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-red-500 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm opacity-90">Aktiv işçilər</p>
            <Users size={18} className="opacity-70" />
          </div>
          <p className="text-2xl font-bold">{employees.filter(e => e.status === "active").length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Ümumi maaş fondu</p>
            <DollarSign size={18} className="text-red-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBaseSalary)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Ümumi komissiyalar</p>
            <TrendingUp size={18} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCommissions)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">Ümumi ödəniş</p>
            <Award size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalBaseSalary + totalCommissions)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">Yüklənir...</div>
        ) : employees.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <Users size={32} className="mx-auto mb-3 opacity-40" />
            <p>Hələ işçi yoxdur</p>
          </div>
        ) : (
          employees.map(emp => {
            const stats = getEmployeeStats(emp.name)
            const totalPay = emp.baseSalary + stats.totalCommission
            return (
              <div key={emp.id} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                      <span className="text-red-600 font-bold text-lg">{emp.name[0]}</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{emp.name}</h3>
                      <p className="text-sm text-gray-500">{emp.position}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          emp.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {emp.status === "active" ? "Aktiv" : "Deaktiv"}
                        </span>
                        {emp.phone && <span className="text-xs text-gray-400">{emp.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setSelected(emp); setModal(true) }}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">✏️</button>
                    <button onClick={() => handleDelete(emp.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">Əsas maaş</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(emp.baseSalary)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">Komissiya %</p>
                    <p className="text-sm font-bold text-gray-900">{emp.commissionPercent}%</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-blue-400 mb-1">Sifarişlər</p>
                    <p className="text-sm font-bold text-blue-700">{stats.bookingsCount}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-xs text-green-400 mb-1">Komissiya</p>
                    <p className="text-sm font-bold text-green-700">{formatCurrency(stats.totalCommission)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3">
                    <p className="text-xs text-purple-400 mb-1">Gəlir</p>
                    <p className="text-sm font-bold text-purple-700">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3">
                    <p className="text-xs text-red-400 mb-1">Ümumi ödəniş</p>
                    <p className="text-sm font-bold text-red-600">{formatCurrency(totalPay)}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{selected ? "Redaktə et" : "Yeni işçi"}</h2>
              <button onClick={() => { setModal(false); setSelected(null) }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad *</label>
                  <input name="name" defaultValue={selected?.name} required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vəzifə</label>
                  <input name="position" defaultValue={selected?.position}
                    placeholder="Məs: Menecer, Mühasib"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Əsas maaş (AZN)</label>
                  <input name="baseSalary" type="number" min="0" defaultValue={selected?.baseSalary ?? 0}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Komissiya (%)</label>
                  <input name="commissionPercent" type="number" min="0" max="100" step="0.1" defaultValue={selected?.commissionPercent ?? 5}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input name="phone" defaultValue={selected?.phone}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input name="email" type="email" defaultValue={selected?.email}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select name="status" defaultValue={selected?.status ?? "active"}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                    <option value="active">Aktiv</option>
                    <option value="inactive">Deaktiv</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={() => { setModal(false); setSelected(null) }}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Ləğv et</button>
                <button type="submit"
                  className="px-5 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium">
                  {selected ? "Yadda saxla" : "Əlavə et"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}