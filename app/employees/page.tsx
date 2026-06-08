"use client"

import { useState, useEffect, useMemo } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { formatCurrency } from "@/lib/calculations"
import { supabase } from "@/lib/supabase"
import {
  Plus, Trash2, Users, TrendingUp, DollarSign, Award,
  CheckCircle2, Clock, X, ChevronLeft, ChevronRight,
  Edit3, Gift
} from "lucide-react"

interface Employee {
  id: string; name: string; position: string; baseSalary: number
  commissionPercent: number; phone: string; email: string; status: "active" | "inactive"
}

interface EmployeePayment {
  id: string; employeeId: string; employeeName: string; month: string
  salaryAmount: number; salaryPaid: boolean; salaryPaidAt: string | null
  bonusAmount: number; bonusPaid: boolean; bonusPaidAt: string | null; notes: string
}

const card = { background: "var(--bg-card)", border: "1px solid var(--border-color)", backdropFilter: "blur(24px)", borderRadius: "24px" }
const modalCard = { background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "28px" }
const inp = { background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: "12px", padding: "10px 16px", fontSize: "14px", outline: "none", width: "100%" }

const GRADIENTS = [
  "linear-gradient(135deg, #ef4444, #f97316)",
  "linear-gradient(135deg, #3b82f6, #06b6d4)",
  "linear-gradient(135deg, #10b981, #34d399)",
  "linear-gradient(135deg, #8b5cf6, #6366f1)",
  "linear-gradient(135deg, #f59e0b, #fbbf24)",
  "linear-gradient(135deg, #ec4899, #f43f5e)",
]

const MONTHS_AZ = ["Yanvar","Fevral","Mart","Aprel","May","İyun","İyul","Avqust","Sentyabr","Oktyabr","Noyabr","Dekabr"]

function getMonthLabel(month: string) {
  const [y, m] = month.split("-")
  return `${MONTHS_AZ[parseInt(m) - 1]} ${y}`
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function prevMonth(month: string) {
  const [y, m] = month.split("-").map(Number)
  if (m === 1) return `${y-1}-12`
  return `${y}-${String(m-1).padStart(2,"0")}`
}

function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number)
  if (m === 12) return `${y+1}-01`
  return `${y}-${String(m+1).padStart(2,"0")}`
}

function mapPayment(p: any): EmployeePayment {
  return {
    id: p.id, employeeId: p.employee_id, employeeName: p.employee_name, month: p.month,
    salaryAmount: p.salary_amount ?? 0, salaryPaid: p.salary_paid ?? false, salaryPaidAt: p.salary_paid_at,
    bonusAmount: p.bonus_amount ?? 0, bonusPaid: p.bonus_paid ?? false, bonusPaidAt: p.bonus_paid_at,
    notes: p.notes ?? ""
  }
}

export default function EmployeesPage() {
  const { bookings, fetchBookings } = useBookingsStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payments, setPayments] = useState<EmployeePayment[]>([])
  const [modal, setModal] = useState(false)
  const [payModal, setPayModal] = useState<{ emp: Employee; payment: EmployeePayment } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [ready, setReady] = useState(false)
  const [activeTab, setActiveTab] = useState<"salary" | "employees">("salary")

  useEffect(() => {
    fetchBookings()
    fetchEmployees()
    setReady(true)
  }, [])

  useEffect(() => {
    if (employees.length > 0) fetchPayments()
  }, [selectedMonth])

  async function fetchPayments(empList?: Employee[]) {
    const list = empList ?? employees
    if (list.length === 0) return

    const { data } = await supabase.from("employee_payments").select("*").eq("month", selectedMonth)
    const existing = data ?? []

    const missing = list.filter(e =>
      e.status === "active" && !existing.find((p: any) => p.employee_id === e.id)
    )

    if (missing.length > 0) {
      const inserts = missing.map(e => ({
        employee_id: e.id,
        employee_name: e.name,
        month: selectedMonth,
        salary_amount: e.baseSalary,
        salary_paid: false,
        salary_paid_at: null,
        bonus_amount: 0,
        bonus_paid: false,
        bonus_paid_at: null,
        notes: ""
      }))
      await supabase.from("employee_payments").insert(inserts)
      const { data: fresh } = await supabase.from("employee_payments").select("*").eq("month", selectedMonth)
      setPayments((fresh ?? []).map(mapPayment))
    } else {
      setPayments(existing.map(mapPayment))
    }
  }

  async function fetchEmployees() {
    const { data } = await supabase.from("employees").select("*").order("created_at", { ascending: false })
    if (data) {
      const list: Employee[] = data.map((e: any) => ({
        id: e.id, name: e.name, position: e.position ?? "",
        baseSalary: e.base_salary ?? 0, commissionPercent: e.commission_percent ?? 5,
        phone: e.phone ?? "", email: e.email ?? "", status: e.status ?? "active"
      }))
      setEmployees(list)
      await fetchPayments(list)
    }
    setLoading(false)
  }

  function getStats(name: string) {
    const eb = bookings.filter(b => b.manager === name)
    return {
      totalRevenue: eb.reduce((s, b) => s + b.sellPrice, 0),
      totalProfit: eb.reduce((s, b) => s + b.profit, 0),
      totalCommission: eb.reduce((s, b) => s + b.commissionAmount, 0),
      bookingsCount: eb.length
    }
  }

  function getPayment(empId: string) {
    return payments.find(p => p.employeeId === empId)
  }

  async function handleTogglePay(payment: EmployeePayment, type: "salary" | "bonus") {
    const update = type === "salary"
      ? { salary_paid: !payment.salaryPaid, salary_paid_at: !payment.salaryPaid ? new Date().toISOString() : null }
      : { bonus_paid: !payment.bonusPaid, bonus_paid_at: !payment.bonusPaid ? new Date().toISOString() : null }
    await supabase.from("employee_payments").update(update).eq("id", payment.id)
    await fetchPayments()
  }

  async function handleSavePayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!payModal) return
    const fd = new FormData(e.currentTarget)
    await supabase.from("employee_payments").update({
      salary_amount: Number(fd.get("salaryAmount")),
      bonus_amount: Number(fd.get("bonusAmount")),
      notes: fd.get("notes") as string,
    }).eq("id", payModal.payment.id)
    await fetchPayments()
    setPayModal(null)
  }

  async function handleSubmitEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = {
      name: fd.get("name") as string,
      position: fd.get("position") as string,
      base_salary: Number(fd.get("baseSalary")),
      commission_percent: Number(fd.get("commissionPercent")),
      phone: fd.get("phone") as string,
      email: fd.get("email") as string,
      status: fd.get("status") as string
    }
    if (selected) await supabase.from("employees").update(data).eq("id", selected.id)
    else await supabase.from("employees").insert(data)
    await fetchEmployees()
    setModal(false); setSelected(null)
  }

  async function handleDelete(id: string) {
    if (confirm("Silinsin?")) {
      await supabase.from("employees").delete().eq("id", id)
      await fetchEmployees()
    }
  }

  if (!ready) return null

  const activeEmps = employees.filter(e => e.status === "active")
  const totalBaseSalary = activeEmps.reduce((s, e) => s + e.baseSalary, 0)
  const totalCommissions = employees.reduce((s, e) => s + getStats(e.name).totalCommission, 0)
  const totalBonus = payments.reduce((s, p) => s + (p.bonusAmount ?? 0), 0)
  const salariesPaid = payments.filter(p => p.salaryPaid).length
  const bonusesPaid = payments.filter(p => p.bonusPaid && p.bonusAmount > 0).length
  const salariesUnpaid = payments.filter(p => !p.salaryPaid).length

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>İşçilər</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Əməkdaşlar və maaş idarəetməsi</p>
        </div>
        <button onClick={() => { setSelected(null); setModal(true) }}
          className="flex items-center gap-2 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", boxShadow: "0 4px 16px rgba(239,68,68,0.3)" }}>
          <Plus size={16} />Yeni işçi
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-6 text-white rounded-3xl relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", boxShadow: "0 8px 24px rgba(239,68,68,0.25)" }}>
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-15" style={{ background: "white" }} />
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm opacity-80">Aktiv işçilər</p><Users size={18} className="opacity-70" />
          </div>
          <p className="text-3xl font-bold">{activeEmps.length}</p>
          <p className="text-xs opacity-60 mt-1">{employees.length} cəmi</p>
        </div>
        {[
          { label: "Maaş fondu", value: formatCurrency(totalBaseSalary), icon: DollarSign, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
          { label: "Bu ay bonus", value: formatCurrency(totalBonus), icon: Gift, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
          { label: "Cəmi ödəniş", value: formatCurrency(totalBaseSalary + totalBonus), icon: Award, color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="p-5 rounded-3xl transition-all hover:scale-[1.01]" style={card}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[{ v: "salary", l: "💰 Maaş & Bonus" }, { v: "employees", l: "👥 İşçilər" }].map(t => (
          <button key={t.v} onClick={() => setActiveTab(t.v as any)}
            className="px-4 py-2.5 rounded-2xl text-sm font-medium transition-all"
            style={{
              background: activeTab === t.v ? "linear-gradient(135deg,#ef4444,#f97316)" : "var(--bg-card)",
              color: activeTab === t.v ? "white" : "var(--text-secondary)",
              border: "1px solid var(--border-color)",
              boxShadow: activeTab === t.v ? "0 4px 12px rgba(239,68,68,0.3)" : "none"
            }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── SALARY TAB ── */}
      {activeTab === "salary" && (
        <div>
          {/* Month navigator */}
          <div className="flex items-center justify-between mb-5 p-4 rounded-3xl" style={card}>
            <button onClick={() => setSelectedMonth(prevMonth(selectedMonth))}
              className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:scale-110"
              style={{ background: "var(--bg-glass)", color: "var(--text-secondary)" }}>
              <ChevronLeft size={16} />
            </button>
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{getMonthLabel(selectedMonth)}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {salariesPaid}/{activeEmps.length} maaş ödənilib
                {salariesUnpaid > 0 && <span className="ml-2 text-red-500 font-semibold">· {salariesUnpaid} ödənilməyib</span>}
              </p>
            </div>
            <button onClick={() => setSelectedMonth(nextMonth(selectedMonth))}
              className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:scale-110"
              style={{ background: "var(--bg-glass)", color: "var(--text-secondary)" }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Summary badges */}
          <div className="flex gap-3 mb-5 flex-wrap">
            {[
              { label: `${salariesPaid} maaş ödənilib`, color: "#22c55e", bg: "rgba(34,197,94,0.1)", Icon: CheckCircle2 },
              { label: `${salariesUnpaid} maaş gözləyir`, color: "#f59e0b", bg: "rgba(245,158,11,0.1)", Icon: Clock },
              { label: `${bonusesPaid} bonus ödənilib`, color: "#6366f1", bg: "rgba(99,102,241,0.1)", Icon: Gift },
            ].map(({ label, color, bg, Icon }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-medium"
                style={{ background: bg, color }}>
                <Icon size={13} />{label}
              </div>
            ))}
          </div>

          {/* Salary cards */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 rounded-3xl animate-pulse" style={{ background: "var(--bg-glass)" }} />
              ))}
            </div>
          ) : activeEmps.length === 0 ? (
            <div className="p-8 text-center rounded-3xl" style={{ ...card, color: "var(--text-muted)" }}>
              <Users size={32} className="mx-auto mb-3 opacity-40" />
              <p>Aktiv işçi yoxdur</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeEmps.map((emp, idx) => {
                const payment = getPayment(emp.id)
                if (!payment) return (
                  <div key={emp.id} className="p-4 rounded-3xl" style={card}>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>{emp.name} — yüklənir...</p>
                  </div>
                )
                const totalDue = payment.salaryAmount + payment.bonusAmount

                return (
                  <div key={emp.id} className="p-5 rounded-3xl" style={card}>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                        style={{ background: GRADIENTS[idx % GRADIENTS.length] }}>
                        {emp.name[0]}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{emp.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{emp.position}</p>
                      </div>

                      {/* Amounts */}
                      <div className="flex gap-3 flex-wrap">
                        {[
                          { label: "Maaş", value: formatCurrency(payment.salaryAmount), color: "var(--text-primary)" },
                          { label: "Bonus", value: payment.bonusAmount > 0 ? formatCurrency(payment.bonusAmount) : "—", color: payment.bonusAmount > 0 ? "#f59e0b" : "var(--text-muted)" },
                          { label: "Cəmi", value: formatCurrency(totalDue), color: "#6366f1" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="text-center px-3 py-2 rounded-xl" style={{ background: "var(--bg-glass)" }}>
                            <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
                            <p className="text-sm font-bold tabular-nums" style={{ color }}>{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Salary toggle */}
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Maaş</p>
                        <button
                          onClick={() => handleTogglePay(payment, "salary")}
                          className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                          style={{
                            background: payment.salaryPaid ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.12)",
                            color: payment.salaryPaid ? "#22c55e" : "#f59e0b",
                            border: `2px solid ${payment.salaryPaid ? "rgba(34,197,94,0.4)" : "rgba(245,158,11,0.4)"}`,
                          }}>
                          {payment.salaryPaid ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                        </button>
                      </div>

                      {/* Bonus toggle */}
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Bonus</p>
                        <button
                          onClick={() => handleTogglePay(payment, "bonus")}
                          className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                          style={{
                            background: payment.bonusPaid ? "rgba(99,102,241,0.15)" : payment.bonusAmount > 0 ? "rgba(245,158,11,0.12)" : "var(--bg-glass)",
                            color: payment.bonusPaid ? "#6366f1" : payment.bonusAmount > 0 ? "#f59e0b" : "var(--text-muted)",
                            border: `2px solid ${payment.bonusPaid ? "rgba(99,102,241,0.4)" : payment.bonusAmount > 0 ? "rgba(245,158,11,0.3)" : "var(--border-color)"}`,
                          }}>
                          {payment.bonusPaid ? <CheckCircle2 size={20} /> : <Gift size={20} />}
                        </button>
                      </div>

                      {/* Edit */}
                      <button
                        onClick={() => setPayModal({ emp, payment })}
                        className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all hover:scale-110 flex-shrink-0"
                        style={{ background: "var(--bg-glass)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
                        <Edit3 size={15} />
                      </button>
                    </div>

                    {/* Paid dates */}
                    {(payment.salaryPaid || payment.bonusPaid) && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {payment.salaryPaid && payment.salaryPaidAt && (
                          <span className="text-xs px-2.5 py-1 rounded-xl" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                            ✓ Maaş ödənilib: {new Date(payment.salaryPaidAt).toLocaleDateString("az-AZ")}
                          </span>
                        )}
                        {payment.bonusPaid && payment.bonusPaidAt && (
                          <span className="text-xs px-2.5 py-1 rounded-xl" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
                            ✓ Bonus ödənilib: {new Date(payment.bonusPaidAt).toLocaleDateString("az-AZ")}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {payment.notes && (
                      <p className="text-xs mt-2 px-3 py-2 rounded-xl" style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>
                        📝 {payment.notes}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── EMPLOYEES TAB ── */}
      {activeTab === "employees" && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-8 text-center rounded-3xl animate-pulse" style={{ ...card, color: "var(--text-muted)" }}>Yüklənir...</div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center rounded-3xl" style={{ ...card, color: "var(--text-muted)" }}>
              <Users size={32} className="mx-auto mb-3 opacity-40" /><p>Hələ işçi yoxdur</p>
            </div>
          ) : employees.map((emp, idx) => {
            const stats = getStats(emp.name)
            return (
              <div key={emp.id} className="p-6 rounded-3xl" style={card}>
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl"
                      style={{ background: GRADIENTS[idx % GRADIENTS.length] }}>
                      {emp.name[0]}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{emp.name}</h3>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{emp.position}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block"
                        style={{ background: emp.status === "active" ? "rgba(34,197,94,0.1)" : "var(--bg-glass)", color: emp.status === "active" ? "#22c55e" : "var(--text-muted)" }}>
                        {emp.status === "active" ? "Aktiv" : "Deaktiv"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setSelected(emp); setModal(true) }}
                      className="p-2 rounded-xl transition-all hover:scale-110"
                      style={{ color: "var(--text-muted)", background: "var(--bg-glass)" }}>
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(emp.id)}
                      className="p-2 rounded-xl transition-all hover:scale-110"
                      style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { label: "Əsas maaş", value: formatCurrency(emp.baseSalary), color: "var(--text-primary)" },
                    { label: "Komissiya %", value: `${emp.commissionPercent}%`, color: "var(--text-primary)" },
                    { label: "Sifarişlər", value: stats.bookingsCount, color: "#6366f1" },
                    { label: "Komissiya", value: formatCurrency(stats.totalCommission), color: "#22c55e" },
                    { label: "Gəlir", value: formatCurrency(stats.totalRevenue), color: "#8b5cf6" },
                    { label: "Ümumi ödəniş", value: formatCurrency(emp.baseSalary + stats.totalCommission), color: "#ef4444" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="p-3 rounded-2xl" style={{ background: "var(--bg-glass)" }}>
                      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
                      <p className="text-sm font-bold" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Pay Edit Modal ── */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm" style={modalCard}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Maaş / Bonus redaktə</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{payModal.emp.name} · {getMonthLabel(selectedMonth)}</p>
              </div>
              <button onClick={() => setPayModal(null)} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSavePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Maaş məbləği (AZN)</label>
                <input name="salaryAmount" type="number" step="0.01" min="0" defaultValue={payModal.payment.salaryAmount} style={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Bonus məbləği (AZN)</label>
                <input name="bonusAmount" type="number" step="0.01" min="0" defaultValue={payModal.payment.bonusAmount} style={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Qeyd</label>
                <input name="notes" defaultValue={payModal.payment.notes} placeholder="Məs: Aprel maaşı..." style={inp} />
              </div>
              <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid var(--border-color)" }}>
                <button type="button" onClick={() => setPayModal(null)}
                  className="flex-1 py-2.5 rounded-2xl text-sm"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                  Ləğv et
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#ef4444,#f97316)" }}>
                  Yadda saxla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Employee Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md" style={modalCard}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{selected ? "İşçini redaktə et" : "Yeni işçi"}</h2>
              <button onClick={() => { setModal(false); setSelected(null) }} className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSubmitEmployee} className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Ad Soyad *</label>
                  <input name="name" defaultValue={selected?.name} required style={inp} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Vəzifə</label>
                  <input name="position" defaultValue={selected?.position} style={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Maaş (AZN)</label>
                  <input name="baseSalary" type="number" min="0" defaultValue={selected?.baseSalary ?? 0} style={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Komissiya (%)</label>
                  <input name="commissionPercent" type="number" min="0" max="100" step="0.1" defaultValue={selected?.commissionPercent ?? 5} style={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Telefon</label>
                  <input name="phone" defaultValue={selected?.phone} style={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Email</label>
                  <input name="email" type="email" defaultValue={selected?.email} style={inp} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Status</label>
                  <select name="status" defaultValue={selected?.status ?? "active"} style={inp}>
                    <option value="active">Aktiv</option>
                    <option value="inactive">Deaktiv</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-3" style={{ borderTop: "1px solid var(--border-color)" }}>
                <button type="button" onClick={() => { setModal(false); setSelected(null) }}
                  className="flex-1 py-2.5 rounded-2xl text-sm"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                  Ləğv et
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
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