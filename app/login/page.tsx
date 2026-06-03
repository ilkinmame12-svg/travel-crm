"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError("Email və ya şifrə yanlışdır")
      setLoading(false)
    } else {
      window.location.href = "/"
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>

      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", transform: "translate(-30%, -30%)" }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)", transform: "translate(30%, 30%)" }} />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full opacity-10 blur-3xl"
        style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", transform: "translate(-50%, -50%)" }} />

      {/* Card */}
      <div className="relative w-full max-w-md" style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(40px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "32px",
        padding: "48px",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      }}>

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="px-6 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Image src="/logo.png" alt="itstour" width={130} height={44} style={{ width: "auto", height: "auto", filter: "brightness(0) invert(1)" }} className="object-contain" />
          </div>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Xoş gəldiniz 👋</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>itstour CRM sisteminə daxil olun</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="admin@itstour.az"
              className="w-full px-4 py-3.5 text-sm rounded-2xl focus:outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white",
              }}
              onFocus={e => (e.target.style.border = "1px solid rgba(239,68,68,0.6)")}
              onBlur={e => (e.target.style.border = "1px solid rgba(255,255,255,0.1)")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>Şifrə</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3.5 text-sm rounded-2xl focus:outline-none transition-all pr-12"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "white",
                }}
                onFocus={e => (e.target.style.border = "1px solid rgba(239,68,68,0.6)")}
                onBlur={e => (e.target.style.border = "1px solid rgba(255,255,255,0.1)")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-2xl" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <p className="text-sm text-red-400">⚠️ {error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition-all disabled:opacity-50"
            style={{
              background: loading ? "rgba(239,68,68,0.5)" : "linear-gradient(135deg, #ef4444, #f97316)",
              boxShadow: "0 4px 20px rgba(239,68,68,0.4)",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Yüklənir...
              </span>
            ) : "Daxil ol →"}
          </button>
        </form>

        <p className="text-xs text-center mt-8" style={{ color: "rgba(255,255,255,0.25)" }}>
          itstour CRM v1.0 • Powered by <span className="font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>VARK TECHNOLOGIES</span>
        </p>
      </div>
    </div>
  )
}