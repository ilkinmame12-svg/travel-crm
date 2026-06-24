"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, Shield, Zap, Globe, CheckCircle2 } from "lucide-react"

const ROLES = [
  { value: "menecer",      label: "Menecer",       desc: "Sifariş yaradır, öz işini idarə edir" },
  { value: "muhasib",      label: "Mühasib",        desc: "Maliyyə, hesabatlar, ödənişlər" },
  { value: "bilet_menecer",label: "Bilet Menecer",  desc: "Yalnız aviabilet sifarişləri" },
]

export default function RegisterPage() {
  const [step, setStep] = useState<1|2>(1)
  const [fullName,  setFullName]  = useState("")
  const [email,     setEmail]     = useState("")
  const [phone,     setPhone]     = useState("")
  const [role,      setRole]      = useState("menecer")
  const [password,  setPassword]  = useState("")
  const [confirm,   setConfirm]   = useState("")
  const [showPass,  setShowPass]  = useState(false)
  const [showConf,  setShowConf]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState("")
  const [success,   setSuccess]   = useState(false)
  const [focused,   setFocused]   = useState<string|null>(null)

  function inputStyle(field: string) {
    return {
      background: focused === field ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
      border: `1.5px solid ${focused === field ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.08)"}`,
      transition: "all 0.2s ease",
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!fullName.trim()) { setError("Ad Soyad daxil edin"); return }
    if (password.length < 6) { setError("Şifrə ən az 6 simvol olmalıdır"); return }
    if (password !== confirm) { setError("Şifrələr uyğun deyil"); return }

    setLoading(true)
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/login` }
      })
      if (authError) throw new Error(authError.message)

      const userId = authData.user?.id
      if (!userId) throw new Error("İstifadəçi yaradılmadı")

      // 2. Insert profile
      const { error: profileError } = await supabase.from("user_profiles").insert({
        id: userId,
        email,
        full_name: fullName,
        phone: phone || null,
        role,
      })
      if (profileError) throw new Error(profileError.message)

      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: "#060912" }}>
      <style>{`
        @keyframes float1 { 0%,100%{transform:translate(-30%,-30%) scale(1)} 50%{transform:translate(-25%,-35%) scale(1.05)} }
        @keyframes float2 { 0%,100%{transform:translate(30%,30%) scale(1)} 50%{transform:translate(25%,35%) scale(1.08)} }
        @keyframes float3 { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-48%,-52%) scale(1.04)} }
        @keyframes slideIn { from{transform:translateX(-32px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes slideUp { from{transform:translateY(24px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes scanLine { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes scaleIn { from{transform:scale(0.8);opacity:0} to{transform:scale(1);opacity:1} }
        .input-field::placeholder { color: rgba(255,255,255,0.2); }
        .input-field:focus { outline: none; }
      `}</style>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#0d0d1a 0%,#0a0f1e 100%)" }} />
        <div className="absolute w-[600px] h-[600px] rounded-full" style={{ background:"radial-gradient(circle,rgba(239,68,68,0.15) 0%,transparent 70%)", top:"-10%", left:"-10%", animation:"float1 8s ease-in-out infinite" }} />
        <div className="absolute w-[500px] h-[500px] rounded-full" style={{ background:"radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 70%)", bottom:"-10%", right:"-10%", animation:"float2 10s ease-in-out infinite" }} />
        <div className="absolute w-[400px] h-[400px] rounded-full" style={{ background:"radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%)", top:"50%", left:"50%", animation:"float3 12s ease-in-out infinite" }} />
        <div className="absolute inset-0 opacity-[0.008]" style={{ backgroundImage:"linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize:"48px 48px" }} />
        <div className="absolute left-0 right-0 h-px opacity-10 pointer-events-none"
          style={{ background:"linear-gradient(90deg,transparent,rgba(239,68,68,0.8),transparent)", animation:"scanLine 6s linear infinite" }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500" style={{ animation:"blink 2s ease infinite" }} />
            <span className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color:"rgba(255,255,255,0.3)" }}>LIVE SYSTEM</span>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div style={{ animation:"slideIn 0.6s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <h1 className="font-black text-white mb-4" style={{ fontSize:52, lineHeight:1.05, letterSpacing:"-2px" }}>
              its<span style={{ color:"#ef4444" }}>tour</span>
              <br/>
              <span style={{ fontSize:28, fontWeight:300, letterSpacing:"-0.5px", color:"rgba(255,255,255,0.4)" }}>CRM Platform</span>
            </h1>
            <p className="text-sm leading-relaxed mb-10" style={{ color:"rgba(255,255,255,0.35)", maxWidth:340 }}>
              Yeni işçi qeydiyyatı. Hesabınız yaradıldıqdan sonra admin tərəfindən təsdiqlənəcək.
            </p>
          </div>

          <div className="space-y-3" style={{ animation:"slideUp 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" }}>
            {[
              { icon: Zap,    label:"Ani giriş imkanı",    color:"#f59e0b" },
              { icon: Shield, label:"Rol əsaslı icazələr", color:"#22c55e" },
              { icon: Globe,  label:"Hər cihazdan əlçatan", color:"#3b82f6" },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:`${color}18` }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <span className="text-sm font-medium" style={{ color:"rgba(255,255,255,0.5)" }}>{label}</span>
                <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background:color }} />
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <a href="https://varktechnologies.netlify.app/" target="_blank" rel="noopener noreferrer"
            className="text-xs font-bold tracking-widest uppercase transition-all hover:opacity-70"
            style={{ color:"rgba(255,255,255,0.2)", letterSpacing:"0.2em" }}>
            VARK TECHNOLOGIES
          </a>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative overflow-y-auto"
        style={{ background:"#080b14" }}>
        <div className="absolute inset-0" style={{ background:"radial-gradient(ellipse 60% 50% at 50% 50%,rgba(99,102,241,0.06) 0%,transparent 100%)" }} />

        <div className="relative w-full max-w-[420px] py-8" style={{ animation:"slideUp 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-2xl font-black text-white">its<span style={{ color:"#ef4444" }}>tour</span></span>
          </div>

          {/* Success state */}
          {success ? (
            <div className="text-center" style={{ animation:"scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background:"rgba(34,197,94,0.15)", border:"2px solid rgba(34,197,94,0.3)" }}>
                <CheckCircle2 size={40} style={{ color:"#22c55e" }} />
              </div>
              <h2 className="text-2xl font-black text-white mb-3">Qeydiyyat tamamlandı!</h2>
              <p className="text-sm mb-2" style={{ color:"rgba(255,255,255,0.4)" }}>
                Hesabınız uğurla yaradıldı.
              </p>
              <p className="text-sm mb-8" style={{ color:"rgba(255,255,255,0.3)" }}>
                Admin hesabınızı aktivləşdirdikdən sonra sistemə daxil ola bilərsiniz.
              </p>
              <a href="/login"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
                style={{ background:"linear-gradient(135deg,#ef4444,#f97316)", boxShadow:"0 8px 32px rgba(239,68,68,0.35)" }}>
                Giriş səhifəsinə get
                <ArrowRight size={16} />
              </a>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background:"linear-gradient(135deg,#ef4444,#f97316)" }}>
                    <User size={14} color="white" />
                  </div>
                  <span className="text-xs font-bold tracking-widest uppercase" style={{ color:"rgba(255,255,255,0.3)" }}>
                    Yeni işçi qeydiyyatı
                  </span>
                </div>
                <h2 className="text-3xl font-black text-white mb-2" style={{ letterSpacing:"-0.5px" }}>
                  Hesab yarat
                </h2>
                <p className="text-sm" style={{ color:"rgba(255,255,255,0.35)" }}>
                  Məlumatlarınızı daxil edin — admin təsdiqindən sonra aktiv olacaq
                </p>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-3 mb-6">
                {[1,2].map(s => (
                  <div key={s} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                      style={{
                        background: step >= s ? "linear-gradient(135deg,#ef4444,#f97316)" : "rgba(255,255,255,0.06)",
                        color: step >= s ? "white" : "rgba(255,255,255,0.3)",
                        boxShadow: step >= s ? "0 4px 12px rgba(239,68,68,0.35)" : "none",
                      }}>
                      {s}
                    </div>
                    <span className="text-xs font-medium" style={{ color: step >= s ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)" }}>
                      {s === 1 ? "Şəxsi məlumat" : "Şifrə"}
                    </span>
                    {s < 2 && <div className="w-8 h-px mx-1" style={{ background:"rgba(255,255,255,0.1)" }} />}
                  </div>
                ))}
              </div>

              <form onSubmit={handleRegister} className="space-y-4">

                {step === 1 && (
                  <>
                    {/* Full name */}
                    <div>
                      <label className="block text-xs font-bold mb-2 tracking-wider uppercase" style={{ color:"rgba(255,255,255,0.4)" }}>
                        Ad Soyad *
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                          <User size={16} style={{ color: focused==="name" ? "#ef4444" : "rgba(255,255,255,0.25)", transition:"color 0.2s" }} />
                        </div>
                        <input
                          type="text"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          onFocus={() => setFocused("name")}
                          onBlur={() => setFocused(null)}
                          required
                          placeholder="Əli Əliyev"
                          className="input-field w-full pl-11 pr-4 py-4 text-sm rounded-2xl text-white"
                          style={inputStyle("name")}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold mb-2 tracking-wider uppercase" style={{ color:"rgba(255,255,255,0.4)" }}>
                        Email *
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                          <Mail size={16} style={{ color: focused==="email" ? "#ef4444" : "rgba(255,255,255,0.25)", transition:"color 0.2s" }} />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          onFocus={() => setFocused("email")}
                          onBlur={() => setFocused(null)}
                          required
                          placeholder="ali@itstour.az"
                          className="input-field w-full pl-11 pr-4 py-4 text-sm rounded-2xl text-white"
                          style={inputStyle("email")}
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-bold mb-2 tracking-wider uppercase" style={{ color:"rgba(255,255,255,0.4)" }}>
                        Telefon
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                          <Phone size={16} style={{ color: focused==="phone" ? "#ef4444" : "rgba(255,255,255,0.25)", transition:"color 0.2s" }} />
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          onFocus={() => setFocused("phone")}
                          onBlur={() => setFocused(null)}
                          placeholder="+994 50 000 00 00"
                          className="input-field w-full pl-11 pr-4 py-4 text-sm rounded-2xl text-white"
                          style={inputStyle("phone")}
                        />
                      </div>
                    </div>

                    {/* Role */}
                    <div>
                      <label className="block text-xs font-bold mb-2 tracking-wider uppercase" style={{ color:"rgba(255,255,255,0.4)" }}>
                        Vəzifə *
                      </label>
                      <div className="space-y-2">
                        {ROLES.map(r => (
                          <button key={r.value} type="button"
                            onClick={() => setRole(r.value)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all"
                            style={{
                              background: role === r.value ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.03)",
                              border: `1.5px solid ${role === r.value ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.07)"}`,
                            }}>
                            <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                              style={{ border:`2px solid ${role === r.value ? "#ef4444" : "rgba(255,255,255,0.2)"}` }}>
                              {role === r.value && <div className="w-2 h-2 rounded-full bg-red-500" />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: role === r.value ? "white" : "rgba(255,255,255,0.5)" }}>
                                {r.label}
                              </p>
                              <p className="text-xs mt-0.5" style={{ color:"rgba(255,255,255,0.25)" }}>{r.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button type="button"
                      onClick={() => {
                        if (!fullName.trim()) { setError("Ad Soyad daxil edin"); return }
                        if (!email.trim()) { setError("Email daxil edin"); return }
                        setError("")
                        setStep(2)
                      }}
                      className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 mt-2 transition-all hover:scale-[1.015]"
                      style={{ background:"linear-gradient(135deg,#ef4444,#f97316)", boxShadow:"0 8px 32px rgba(239,68,68,0.35)" }}>
                      Növbəti addım
                      <ArrowRight size={16} />
                    </button>
                  </>
                )}

                {step === 2 && (
                  <>
                    {/* Summary */}
                    <div className="px-4 py-3 rounded-2xl mb-2"
                      style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color:"rgba(255,255,255,0.3)" }}>Seçilmiş məlumatlar</p>
                      <p className="text-sm font-semibold text-white">{fullName}</p>
                      <p className="text-xs mt-0.5" style={{ color:"rgba(255,255,255,0.4)" }}>{email} · {ROLES.find(r=>r.value===role)?.label}</p>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-bold mb-2 tracking-wider uppercase" style={{ color:"rgba(255,255,255,0.4)" }}>
                        Şifrə * (min 6 simvol)
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                          <Lock size={16} style={{ color: focused==="pass" ? "#ef4444" : "rgba(255,255,255,0.25)", transition:"color 0.2s" }} />
                        </div>
                        <input
                          type={showPass ? "text" : "password"}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          onFocus={() => setFocused("pass")}
                          onBlur={() => setFocused(null)}
                          required
                          placeholder="••••••••••"
                          className="input-field w-full pl-11 pr-12 py-4 text-sm rounded-2xl text-white"
                          style={{ ...inputStyle("pass"), letterSpacing: showPass ? "normal" : "0.2em" }}
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 transition-all hover:opacity-80"
                          style={{ color:"rgba(255,255,255,0.3)" }}>
                          {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                      </div>
                      {/* Password strength */}
                      {password && (
                        <div className="flex gap-1 mt-2">
                          {[1,2,3,4].map(i => (
                            <div key={i} className="flex-1 h-1 rounded-full transition-all"
                              style={{ background: password.length >= i*2 ? (password.length >= 8 ? "#22c55e" : "#f59e0b") : "rgba(255,255,255,0.08)" }} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Confirm */}
                    <div>
                      <label className="block text-xs font-bold mb-2 tracking-wider uppercase" style={{ color:"rgba(255,255,255,0.4)" }}>
                        Şifrəni təkrarlayın *
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                          <Lock size={16} style={{ color: focused==="conf" ? "#ef4444" : "rgba(255,255,255,0.25)", transition:"color 0.2s" }} />
                        </div>
                        <input
                          type={showConf ? "text" : "password"}
                          value={confirm}
                          onChange={e => setConfirm(e.target.value)}
                          onFocus={() => setFocused("conf")}
                          onBlur={() => setFocused(null)}
                          required
                          placeholder="••••••••••"
                          className="input-field w-full pl-11 pr-12 py-4 text-sm rounded-2xl text-white"
                          style={{ ...inputStyle("conf"), letterSpacing: showConf ? "normal" : "0.2em",
                            borderColor: confirm && confirm !== password ? "rgba(239,68,68,0.5)" : focused==="conf" ? "rgba(239,68,68,0.5)" : confirm && confirm === password ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.08)"
                          }}
                        />
                        <button type="button" onClick={() => setShowConf(!showConf)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 transition-all hover:opacity-80"
                          style={{ color:"rgba(255,255,255,0.3)" }}>
                          {showConf ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                        {confirm && confirm === password && (
                          <div className="absolute right-10 top-1/2 -translate-y-1/2">
                            <CheckCircle2 size={16} style={{ color:"#22c55e" }} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                        style={{ background:"rgba(239,68,68,0.1)", border:"1.5px solid rgba(239,68,68,0.25)" }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                        <p className="text-sm" style={{ color:"rgba(239,100,100,1)" }}>{error}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <button type="button" onClick={() => { setStep(1); setError("") }}
                        className="py-4 rounded-2xl font-bold text-sm transition-all hover:scale-[1.015]"
                        style={{ background:"rgba(255,255,255,0.05)", border:"1.5px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.5)" }}>
                        ← Geri
                      </button>
                      <button type="submit" disabled={loading}
                        className="py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 hover:scale-[1.015]"
                        style={{ background:"linear-gradient(135deg,#ef4444,#f97316)", boxShadow:"0 8px 32px rgba(239,68,68,0.35)" }}>
                        {loading ? (
                          <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor:"rgba(255,255,255,0.3)", borderTopColor:"white" }} />
                        ) : (
                          <><CheckCircle2 size={16} />Qeydiyyat</>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </form>

              <div className="flex items-center gap-4 mt-6 mb-4">
                <div className="flex-1 h-px" style={{ background:"rgba(255,255,255,0.06)" }} />
                <span className="text-xs" style={{ color:"rgba(255,255,255,0.2)" }}>Hesabınız var?</span>
                <div className="flex-1 h-px" style={{ background:"rgba(255,255,255,0.06)" }} />
              </div>

              <a href="/login"
                className="block text-center py-3 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.01]"
                style={{ background:"rgba(255,255,255,0.04)", border:"1.5px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.5)" }}>
                Daxil ol →
              </a>

              <p className="text-center text-xs mt-4" style={{ color:"rgba(255,255,255,0.15)" }}>
                Powered by{" "}
                <a href="https://varktechnologies.netlify.app/" target="_blank" rel="noopener noreferrer"
                  className="font-bold transition-all hover:opacity-60"
                  style={{ color:"rgba(255,255,255,0.3)" }}>
                  VARK TECHNOLOGIES
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
