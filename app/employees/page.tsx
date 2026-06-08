"use client"

import { useState, useEffect } from "react"
import { useBookingsStore } from "@/lib/store/bookingsStore"
import { formatCurrency } from "@/lib/calculations"
import { supabase } from "@/lib/supabase"
import {
  Plus, Trash2, Users, TrendingUp, DollarSign, Award,
  CheckCircle2, Clock, X, ChevronLeft, ChevronRight,
  Edit3, Gift, AlertCircle
} from "lucide-react"

interface Employee {
  id: string; name: string; position: string; baseSalary: number
  commissionPercent: number; phone: string; email: string; status: "active" | "inactive"
}

interface EmployeePayment {
  id: string; employeeId: string; employeeName: string; month: string
  salaryAmount: number; salaryPaidAmount: number; salaryPaid: boolean; salaryPaidAt: string | null
  bonusAmount: number; bonusPaidAmount: number; bonusPaid: boolean; bonusPaidAt: string | null
  notes: string
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
    salaryAmount: p.salary_amount ?? 0,
    salaryPaidAmount: p.salary_paid_amount ?? (p.salary_paid ? (p.salary_amount ?? 0) : 0),
    salaryPaid: p.salary_paid ?? false, salaryPaidAt: p.salary_paid_at,
    bonusAmount: p.bonus_amount ?? 0,
    bonusPaidAmount: p.bonus_paid_amount ?? (p.bonus_paid ? (p.bonus_amount ?? 0) : 0),
    bonusPaid: p.bonus_paid ?? false, bonusPaidAt: p.bonus_paid_at,
    notes: p.notes ?? ""
  }
}

function getSalaryStatus(payment: EmployeePayment) {
  const remaining = payment.salaryAmount - payment.salaryPaidAmount
  if (payment.salaryPaidAmount === 0) return "unpaid"
  if (remaining <= 0) return "paid"
  return "partial"
}

function getBonusStatus(payment: EmployeePayment) {
  if (payment.bonusAmount === 0) return "none"
  const remaining = payment.bonusAmount - payment.bonusPaidAmount
  if (payment.bonusPaidAmount === 0) return "unpaid"
  if (remaining <= 0) return "paid"
  return "partial"
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

  useEffect(() => { fetchBookings(); fetchEmployees(); setReady(true) }, [])
  useEffect(() => { if (employees.length > 0) fetchPayments() }, [selectedMonth])

  async function fetchPayments(empList?: Employee[]) {
    const list = empList ?? employees
    if (list.length === 0) return
    const { data } = await supabase.from("employee_payments").select("*").eq("month", selectedMonth)
    const existing = data ?? []
    const missing = list.filter(e => e.status === "active" && !existing.find((p: any) => p.employee_id === e.id))
    if (missing.length > 0) {
      await supabase.from("employee_payments").insert(missing.map(e => ({
        employee_id: e.id, employee_name: e.name, month: selectedMonth,
        salary_amount: e.baseSalary, salary_paid_amount: 0, salary_paid: false, salary_paid_at: null,
        bonus_amount: 0, bonus_paid_amount: 0, bonus_paid: false, bonus_paid_at: null, notes: ""
      })))
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
      totalCommission: eb.reduce((s, b) => s + b.commissionAmount, 0),
      bookingsCount: eb.length
    }
  }

  function getPayment(empId: string) {
    return payments.find(p => p.employeeId === empId)
  }

  async function handleSavePayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!payModal) return
    const fd = new FormData(e.currentTarget)
    const salaryAmount = Number(fd.get("salaryAmount"))
    const salaryPaidAmount = Number(fd.get("salaryPaidAmount"))
    const bonusAmount = Number(fd.get("bonusAmount"))
    const bonusPaidAmount = Number(fd.get("bonusPaidAmount"))
    const now = new Date().toISOString()

    await supabase.from("employee_payments").update({
      salary_amount: salaryAmount,
      salary_paid_amount: salaryPaidAmount,
      salary_paid: salaryPaidAmount >= salaryAmount && salaryAmount > 0,
      salary_paid_at: salaryPaidAmount >= salaryAmount && salaryAmount > 0 ? now : null,
      bonus_amount: bonusAmount,
      bonus_paid_amount: bonusPaidAmount,
      bonus_paid: bonusPaidAmount >= bonusAmount && bonusAmount > 0,
      bonus_paid_at: bonusPaidAmount >= bonusAmount && bonusAmount > 0 ? now : null,
      notes: fd.get("notes") as string,
    }).eq("id", payModal.payment.id)
    await fetchPayments()
    setPayModal(null)
  }

  async function handleSubmitEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = {
      name: fd.get("name") as string, position: fd.get("position") as string,
      base_salary: Number(fd.get("baseSalary")), commission_percent: Number(fd.get("commissionPercent")),
      phone: fd.get("phone") as string, email: fd.get("email") as string, status: fd.get("status") as string
    }
    if (selected) await supabase.from("employees").update(data).eq("id", selected.id)
    else await supabase.from("employees").insert(data)
    await fetchEmployees(); setModal(false); setSelected(null)
  }

  async function handleDelete(id: string) {
    if (confirm("Silinsin?")) { await supabase.from("employees").delete().eq("id", id); await fetchEmployees() }
  }

  if (!ready) return null

  const activeEmps = employees.filter(e => e.status === "active")
  const totalBaseSalary = activeEmps.reduce((s, e) => s + e.baseSalary, 0)
  const totalBonus = payments.reduce((s, p) => s + p.bonusAmount, 0)
  const totalPaidOut = payments.reduce((s, p) => s + p.salaryPaidAmount + p.bonusPaidAmount, 0)

  const paidFull = payments.filter(p => getSalaryStatus(p) === "paid").length
  const paidPartial = payments.filter(p => getSalaryStatus(p) === "partial").length
  const unpaid = payments.filter(p => getSalaryStatus(p) === "unpaid").length

  const STATUS_CONFIG = {
    paid:    { label: "Tam ödənilib",    color: "#22c55e", bg: "rgba(34,197,94,0.12)",   Icon: CheckCircle2 },
    partial: { label: "Qismən ödənilib", color: "#f97316", bg: "rgba(249,115,22,0.12)", Icon: AlertCircle },
    unpaid:  { label: "Ödənilməyib",     color: "#ef4444", bg: "rgba(239,68,68,0.12)",  Icon: Clock },
    none:    { label: "Bonus yoxdur",    color: "#9ca3af", bg: "var(--bg-glass)",         Icon: Gift },
  }

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
          <div className="flex items-center justify-between mb-3"><p className="text-sm opacity-80">Aktiv işçilər</p><Users size={18} className="opacity-70" /></div>
          <p className="text-3xl font-bold">{activeEmps.length}</p>
          <p className="text-xs opacity-60 mt-1">{employees.length} cəmi</p>
        </div>
        {[
          { label: "Maaş fondu", value: formatCurrency(totalBaseSalary), icon: DollarSign, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
          { label: "Bu ay bonus", value: formatCurrency(totalBonus), icon: Gift, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
          { label: "Ödənilmiş", value: formatCurrency(totalPaidOut), icon: Award, color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
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
            style={{ background: activeTab === t.v ? "linear-gradient(135deg,#ef4444,#f97316)" : "var(--bg-card)", color: activeTab === t.v ? "white" : "var(--text-secondary)", border: "1px solid var(--border-color)", boxShadow: activeTab === t.v ? "0 4px 12px rgba(239,68,68,0.3)" : "none" }}>
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
              <div className="flex items-center justify-center gap-3 mt-1">
                <span className="text-xs font-medium" style={{ color: "#22c55e" }}>✓ {paidFull} tam</span>
                {paidPartial > 0 && <span className="text-xs font-medium" style={{ color: "#f97316" }}>◑ {paidPartial} qismən</span>}
                {unpaid > 0 && <span className="text-xs font-medium" style={{ color: "#ef4444" }}>✗ {unpaid} ödənilməyib</span>}
              </div>
            </div>
            <button onClick={() => setSelectedMonth(nextMonth(selectedMonth))}
              className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:scale-110"
              style={{ background: "var(--bg-glass)", color: "var(--text-secondary)" }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Salary cards */}
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-3xl animate-pulse" style={{ background: "var(--bg-glass)" }} />)}</div>
          ) : activeEmps.length === 0 ? (
            <div className="p-8 text-center rounded-3xl" style={{ ...card, color: "var(--text-muted)" }}>
              <Users size={32} className="mx-auto mb-3 opacity-40" /><p>Aktiv işçi yoxdur</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeEmps.map((emp, idx) => {
                const payment = getPayment(emp.id)
                if (!payment) return (
                  <div key={emp.id} className="p-4 rounded-3xl animate-pulse" style={{ ...card, color: "var(--text-muted)" }}>
                    <p className="text-sm">{emp.name} — yüklənir...</p>
                  </div>
                )

                const salaryStatus = getSalaryStatus(payment)
                const bonusStatus = getBonusStatus(payment)
                const salaryCfg = STATUS_CONFIG[salaryStatus]
                const bonusCfg = STATUS_CONFIG[bonusStatus]
                const SalaryIcon = salaryCfg.Icon
                const BonusIcon = bonusCfg.Icon
                const salaryRemaining = payment.salaryAmount - payment.salaryPaidAmount
                const bonusRemaining = payment.bonusAmount - payment.bonusPaidAmount

                return (
                  <div key={emp.id} className="p-5 rounded-3xl" style={card}>
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                        style={{ background: GRADIENTS[idx % GRADIENTS.length] }}>
                        {emp.name[0]}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-[120px]">
                        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{emp.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{emp.position}</p>
                      </div>

                      {/* Salary info */}
                      <div className="px-3 py-2 rounded-2xl" style={{ background: "var(--bg-glass)" }}>
                        <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Maaş</p>
                        <p className="text-sm font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                          {formatCurrency(payment.salaryAmount)}
                        </p>
                        {salaryStatus === "partial" && (
                          <p className="text-xs tabular-nums" style={{ color: "#f97316" }}>
                            Ödənilib: {formatCurrency(payment.salaryPaidAmount)}
                          </p>
                        )}
                        {salaryStatus === "partial" && (
                          <p className="text-xs tabular-nums" style={{ color: "#ef4444" }}>
                            Qalıq: {formatCurrency(salaryRemaining)}
                          </p>
                        )}
                      </div>

                      {/* Bonus info */}
                      <div className="px-3 py-2 rounded-2xl" style={{ background: "var(--bg-glass)" }}>
                        <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Bonus</p>
                        <p className="text-sm font-bold tabular-nums" style={{ color: payment.bonusAmount > 0 ? "#f59e0b" : "var(--text-muted)" }}>
                          {payment.bonusAmount > 0 ? formatCurrency(payment.bonusAmount) : "—"}
                        </p>
                        {bonusStatus === "partial" && (
                          <p className="text-xs tabular-nums" style={{ color: "#f97316" }}>
                            Qalıq: {formatCurrency(bonusRemaining)}
                          </p>
                        )}
                      </div>

                      {/* Salary status badge */}
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Maaş</p>
                        <div className="px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold"
                          style={{ background: salaryCfg.bg, color: salaryCfg.color }}>
                          <SalaryIcon size={13} />
                          {salaryCfg.label}
                        </div>
                      </div>

                      {/* Bonus status badge */}
                      {bonusStatus !== "none" && (
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Bonus</p>
                          <div className="px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold"
                            style={{ background: bonusCfg.bg, color: bonusCfg.color }}>
                            <BonusIcon size={13} />
                            {bonusCfg.label}
                          </div>
                        </div>
                      )}

                      {/* Edit button */}
                      <button
                        onClick={() => setPayModal({ emp, payment })}
                        className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all hover:scale-110 flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
                        title="Ödəniş məlumatlarını redaktə et">
                        <Edit3 size={15} />
                      </button>
                    </div>

                    {/* Paid dates */}
                    {(payment.salaryPaidAt || payment.bonusPaidAt) && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {payment.salaryPaidAt && (
                          <span className="text-xs px-2.5 py-1 rounded-xl" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                            ✓ Maaş: {new Date(payment.salaryPaidAt).toLocaleDateString("az-AZ")}
                          </span>
                        )}
                        {payment.bonusPaidAt && (
                          <span className="text-xs px-2.5 py-1 rounded-xl" style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
                            ✓ Bonus: {new Date(payment.bonusPaidAt).toLocaleDateString("az-AZ")}
                          </span>
                        )}
                      </div>
                    )}

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
                      style={{ background: GRADIENTS[idx % GRADIENTS.length] }}>{emp.name[0]}</div>
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
                    <button onClick={() => { setSelected(emp); setModal(true) }} className="p-2 rounded-xl transition-all hover:scale-110" style={{ color: "var(--text-muted)", background: "var(--bg-glass)" }}><Edit3 size={14} /></button>
                    <button onClick={() => handleDelete(emp.id)} className="p-2 rounded-xl transition-all hover:scale-110" style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)" }}><Trash2 size={14} /></button>
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

      {/* ── Pay Modal ── */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm" style={modalCard}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Ödəniş redaktəsi</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{payModal.emp.name} · {getMonthLabel(selectedMonth)}</p>
              </div>
              <button onClick={() => setPayModal(null)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSavePayment} className="p-6 space-y-4">
              {/* Salary section */}
              <div className="p-4 rounded-2xl space-y-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#ef4444" }}>💰 Maaş</p>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Maaş məbləği (AZN)</label>
                  <input name="salaryAmount" type="number" step="0.01" min="0" defaultValue={payModal.payment.salaryAmount} style={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Ödənilən məbləğ (AZN)</label>
                  <input name="salaryPaidAmount" type="number" step="0.01" min="0" defaultValue={payModal.payment.salaryPaidAmount}
                    style={{ ...inp, borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.04)" }} />
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Tam ödənilsə maaşla eyni məbləği yazın
                  </p>
                </div>
              </div>

              {/* Bonus section */}
              <div className="p-4 rounded-2xl space-y-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#f59e0b" }}>🎁 Bonus</p>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Bonus məbləği (AZN)</label>
                  <input name="bonusAmount" type="number" step="0.01" min="0" defaultValue={payModal.payment.bonusAmount} style={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Ödənilən bonus (AZN)</label>
                  <input name="bonusPaidAmount" type="number" step="0.01" min="0" defaultValue={payModal.payment.bonusPaidAmount}
                    style={{ ...inp, borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.04)" }} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Qeyd</label>
                <input name="notes" defaultValue={payModal.payment.notes} placeholder="Məs: Aprel maaşı qismən ödənilib..." style={inp} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md" style={modalCard}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{selected ? "İşçini redaktə et" : "Yeni işçi"}</h2>
              <button onClick={() => { setModal(false); setSelected(null) }} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSubmitEmployee} className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Ad Soyad *</label><input name="name" defaultValue={selected?.name} required style={inp} /></div>
                <div className="col-span-2"><label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Vəzifə</label><input name="position" defaultValue={selected?.position} style={inp} /></div>
                <div><label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Maaş (AZN)</label><input name="baseSalary" type="number" min="0" defaultValue={selected?.baseSalary ?? 0} style={inp} /></div>
                <div><label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Komissiya (%)</label><input name="commissionPercent" type="number" min="0" max="100" step="0.1" defaultValue={selected?.commissionPercent ?? 5} style={inp} /></div>
                <div><label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Telefon</label><input name="phone" defaultValue={selected?.phone} style={inp} /></div>
                <div><label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Email</label><input name="email" type="email" defaultValue={selected?.email} style={inp} /></div>
                <div className="col-span-2"><label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Status</label><select name="status" defaultValue={selected?.status ?? "active"} style={inp}><option value="active">Aktiv</option><option value="inactive">Deaktiv</option></select></div>
              </div>
              <div className="flex gap-3 pt-3" style={{ borderTop: "1px solid var(--border-color)" }}>
                <button type="button" onClick={() => { setModal(false); setSelected(null) }} className="flex-1 py-2.5 rounded-2xl text-sm" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>Ləğv et</button>
                <button type="submit" className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>{selected ? "Yadda saxla" : "Əlavə et"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}