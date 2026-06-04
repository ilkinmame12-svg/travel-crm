"use client"

import { useState, useRef } from "react"
import { useUserRole } from "@/lib/hooks/useUserRole"
import {
  FileText, Upload, CheckCircle2, AlertCircle, Loader2,
  ClipboardList, ArrowRight, X, RefreshCw, Ticket,
  RotateCcw, Ban, CreditCard, Package
} from "lucide-react"

const card = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-color)",
  backdropFilter: "blur(24px)",
  borderRadius: "24px",
}

const MIR_TYPE_INFO: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  ticket:        { label: "Yeni Bilet",        color: "#6366f1", bg: "rgba(99,102,241,0.1)",  icon: Ticket },
  reissue:       { label: "Bilet Dəyişimi",    color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: RefreshCw },
  refund:        { label: "Geri Qaytarma",     color: "#ef4444", bg: "rgba(239,68,68,0.1)",   icon: RotateCcw },
  void:          { label: "Ləğvetmə",          color: "#6b7280", bg: "rgba(107,114,128,0.1)", icon: Ban },
  emd:           { label: "EMD Xidmət",        color: "#10b981", bg: "rgba(16,185,129,0.1)",  icon: Package },
  cancel_refund: { label: "Ləğv/Geri Qaytarma",color: "#ef4444", bg: "rgba(239,68,68,0.1)",   icon: RotateCcw },
  unknown:       { label: "Bilet",             color: "#6366f1", bg: "rgba(99,102,241,0.1)",  icon: Ticket },
}

export default function MIRImportPage() {
  const { profile } = useUserRole()
  const [mirText,  setMirText]  = useState("")
  const [manager,  setManager]  = useState(profile?.fullName ?? "")
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<any>(null)
  const [error,    setError]    = useState("")
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const typeInfo = result ? (MIR_TYPE_INFO[result.mirType] ?? MIR_TYPE_INFO.unknown) : null
  const TypeIcon = typeInfo?.icon

  async function handleSubmit() {
    if (!mirText.trim()) { setError("MIR mətni boş ola bilməz"); return }
    setLoading(true); setError(""); setResult(null)
    try {
      const res = await fetch("/api/mir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mir: mirText, manager: manager || profile?.fullName }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Xəta baş verdi"); return }
      setResult(data)
      setMirText("")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function readFile(file: File) {
    const reader = new FileReader()
    reader.onload = ev => { setMirText(ev.target?.result as string ?? ""); setResult(null); setError("") }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}>
              <FileText size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>MIR Import</h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Travelport / Galileo</p>
            </div>
          </div>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            MIR faylını yapışdırın — avtomatik olaraq parse olub mühasib növbəsinə göndərilir
          </p>
        </div>

        {/* MIR type chips */}
        <div className="flex gap-2 flex-wrap mb-6">
          {Object.entries(MIR_TYPE_INFO).filter(([k]) => k !== "unknown").map(([key, info]) => {
            const Icon = info.icon
            return (
              <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{ background: info.bg, color: info.color, border: `1px solid ${info.color}30` }}>
                <Icon size={11} />{info.label}
              </div>
            )
          })}
        </div>

        {/* Flow */}
        <div className="p-4 rounded-3xl mb-6 flex items-center gap-2 flex-wrap"
          style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
          {["MIR al", "Buraya yapışdır", "Parse olur", "Mühasib təsdiqi", "Sifariş yaranır"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", fontSize: "10px" }}>{i+1}</div>
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{s}</span>
              </div>
              {i < 4 && <ArrowRight size={11} style={{ color: "var(--text-muted)" }} />}
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="p-6 rounded-3xl mb-5" style={card}>
          {/* Manager */}
          <div className="mb-5">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Menecer</label>
            <input value={manager} onChange={e => setManager(e.target.value)}
              placeholder="Menecer adı"
              className="w-full px-4 py-2.5 text-sm rounded-2xl focus:outline-none"
              style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
          </div>

          {/* Drop zone */}
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>MIR Faylı</label>
            <div
              className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all"
              style={{
                borderColor: dragOver ? "#6366f1" : "var(--border-color)",
                background: dragOver ? "rgba(99,102,241,0.06)" : "var(--bg-glass)",
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) readFile(f) }}
              onClick={() => fileRef.current?.click()}>
              <Upload size={22} style={{ color: dragOver ? "#6366f1" : "var(--text-muted)" }} className="mb-2" />
              <p className="text-sm font-medium" style={{ color: dragOver ? "#6366f1" : "var(--text-secondary)" }}>
                {dragOver ? "Buraxın!" : "Fayl sürükləyin və ya klikləyin"}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>.MIR, .txt faylları</p>
              <input ref={fileRef} type="file" accept=".txt,.mir,.MIR" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f) }} />
            </div>
          </div>

          {/* Textarea */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                MIR Mətni *
              </label>
              {mirText && (
                <button onClick={() => { setMirText(""); setResult(null); setError("") }}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                  style={{ color: "var(--text-muted)", background: "var(--bg-glass)" }}>
                  <X size={11} /> Təmizlə
                </button>
              )}
            </div>
            <textarea
              value={mirText}
              onChange={e => { setMirText(e.target.value); setResult(null); setError("") }}
              placeholder={"T51G773392023280427802JUL251304 J2771AZERBAIJAN HAVA YOLLARY...\nA02MAMMADOVA/SEVINJ MRS...\nA0401J2771AZERBAIJAN H  23Z HK10JUL..."}
              rows={10}
              className="w-full px-4 py-3 text-xs rounded-2xl focus:outline-none resize-y font-mono"
              style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)", lineHeight: 1.7, minHeight: 180 }} />
            {mirText && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {mirText.split("\n").length} sətir · {mirText.length} simvol
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-2xl mb-4"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading || !mirText.trim()}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 20px rgba(99,102,241,0.3)" }}>
            {loading
              ? <><Loader2 size={16} className="animate-spin" />Parse edilir...</>
              : <><FileText size={16} />MIR-i İşlə və Göndər</>
            }
          </button>
        </div>

        {/* Success */}
        {result && typeInfo && TypeIcon && (
          <div className="p-6 rounded-3xl" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: typeInfo.bg }}>
                <TypeIcon size={18} style={{ color: typeInfo.color }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "#22c55e" }}>Uğurla işləndi ✓</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  <span className="font-semibold px-2 py-0.5 rounded-lg" style={{ background: typeInfo.bg, color: typeInfo.color }}>{typeInfo.label}</span>
                  {" "}→ mühasib növbəsindədir
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: "Sərnişin(lər)", value: result.parsed?.passengers },
                { label: "Bilet №",       value: result.parsed?.tickets },
                { label: "PNR",           value: result.parsed?.pnr },
                { label: "Marşrut",       value: result.parsed?.destination },
                { label: "Uçuş tarixi",   value: result.parsed?.departure },
                { label: "Məbləğ",        value: result.parsed?.total },
                { label: "Aviaşirkət",    value: result.parsed?.airline },
                { label: "Ödəniş",        value: result.parsed?.payment },
              ].map(({ label, value }) => value ? (
                <div key={label} className="px-3 py-2.5 rounded-2xl" style={{ background: "var(--bg-glass)" }}>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
                  <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: "var(--text-primary)" }}>{value}</p>
                </div>
              ) : null)}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a href="/drafts"
                className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg,#10b981,#34d399)" }}>
                <ClipboardList size={15} />Təsdiq növbəsi
              </a>
              <button onClick={() => { setResult(null); setError("") }}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all hover:scale-[1.02]"
                style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                <FileText size={15} />Yeni MIR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
