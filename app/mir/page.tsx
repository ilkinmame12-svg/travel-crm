"use client"

import { useState } from "react"
import { FileText, Upload, CheckCircle2, AlertCircle, Loader2, ClipboardList, ArrowRight } from "lucide-react"

const card = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-color)",
  backdropFilter: "blur(24px)",
  borderRadius: "24px",
}

export default function MIRImportPage() {
  const [mirText, setMirText] = useState("")
  const [manager, setManager] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")

  async function handleSubmit() {
    if (!mirText.trim()) { setError("MIR mətni boş ola bilməz"); return }
    setLoading(true); setError(""); setResult(null)
    try {
      const res = await fetch("/api/mir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mir: mirText, manager }),
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

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) readFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) readFile(file)
  }

  function readFile(file: File) {
    const reader = new FileReader()
    reader.onload = ev => setMirText(ev.target?.result as string ?? "")
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen p-5 md:p-7" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <FileText size={20} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>MIR Import</h1>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Travelport/Galileo MIR faylını yapışdırın — avtomatik olaraq mühasib təsdiqi növbəsinə düşür
          </p>
        </div>

        {/* How it works */}
        <div className="p-5 rounded-3xl mb-6" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#6366f1" }}>Necə işləyir</p>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { step: "1", label: "Travelport-dan MIR al" },
              { step: "2", label: "Buraya yapışdır" },
              { step: "3", label: "Avtomatik parse olur" },
              { step: "4", label: "Mühasib təsdiqləyir" },
              { step: "5", label: "Sifariş yaranır" },
            ].map((s, i) => (
              <div key={s.step} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>{s.step}</div>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{s.label}</span>
                {i < 4 && <ArrowRight size={12} style={{ color: "var(--text-muted)" }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Input form */}
        <div className="p-6 rounded-3xl mb-5" style={card}>
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
              Menecer adı (istəyə görə)
            </label>
            <input value={manager} onChange={e => setManager(e.target.value)}
              placeholder="Məs: Meryem Eliyeva"
              className="w-full px-4 py-2.5 text-sm rounded-2xl focus:outline-none"
              style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
              MIR Mətni *
            </label>

            {/* Drop zone */}
            <div
              className="mb-3 flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all"
              style={{ borderColor: "var(--border-color)", background: "var(--bg-glass)" }}
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById("mirFileInput")?.click()}>
              <Upload size={24} style={{ color: "var(--text-muted)" }} className="mb-2" />
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Fayl sürükləyin və ya klikləyin</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>.txt, .mir faylları</p>
              <input id="mirFileInput" type="file" accept=".txt,.mir,.MIR" className="hidden" onChange={handleFileInput} />
            </div>

            <p className="text-xs text-center mb-2" style={{ color: "var(--text-muted)" }}>— və ya birbaşa yapışdırın —</p>

            <textarea
              value={mirText}
              onChange={e => setMirText(e.target.value)}
              placeholder={`T51G773392025510124709JUL241403 TK235TURKISH AIRLINES...\nA02BABAYEVA/MATANAT MRS...\nA0401TK235TURKISH AIRL...`}
              rows={10}
              className="w-full px-4 py-3 text-xs rounded-2xl focus:outline-none resize-none font-mono"
              style={{ background: "var(--bg-glass)", border: "1px solid var(--border-color)", color: "var(--text-primary)", lineHeight: 1.6 }} />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-2xl mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading || !mirText.trim()}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 20px rgba(99,102,241,0.3)" }}>
            {loading ? <><Loader2 size={16} className="animate-spin" />İşlənir...</> : <><FileText size={16} />MIR-i işlə və göndər</>}
          </button>
        </div>

        {/* Success result */}
        {result && (
          <div className="p-6 rounded-3xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
            <div className="flex items-center gap-3 mb-5">
              <CheckCircle2 size={24} className="text-green-500" />
              <div>
                <p className="text-base font-bold text-green-500">{result.message}</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Mühasib Təsdiq səhifəsindən təsdiqləyə bilər</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Sərnişin",     value: result.parsed?.passenger },
                { label: "Bilet №",      value: result.parsed?.ticket },
                { label: "PNR",          value: result.parsed?.pnr },
                { label: "Marşrut",      value: result.parsed?.destination },
                { label: "Uçuş tarixi", value: result.parsed?.departure },
                { label: "Cəmi məbləğ", value: result.parsed?.total },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-3 rounded-2xl" style={{ background: "var(--bg-glass)" }}>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{value || "—"}</p>
                </div>
              ))}
            </div>

            <a href="/drafts"
              className="flex items-center justify-center gap-2 mt-4 py-3 rounded-2xl text-sm font-semibold text-white transition-all hover:scale-[1.01]"
              style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}>
              <ClipboardList size={16} />
              Təsdiq səhifəsinə keç
              <ArrowRight size={14} />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
