"use client"

import { useEffect, useState } from "react"

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"intro" | "numbers" | "outro">("intro")
  const [count1, setCount1] = useState(0)
  const [count2, setCount2] = useState(0)
  const [count3, setCount3] = useState(0)
  const [planeX, setPlaneX] = useState(-100)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Phase 1: plane flies in
    setTimeout(() => {
      setPlaneX(50)
      setPhase("numbers")
    }, 300)

    // Phase 2: numbers count up
    setTimeout(() => {
      const duration = 1200
      const steps = 40
      const interval = duration / steps
      let step = 0
      const timer = setInterval(() => {
        step++
        const progress = step / steps
        const ease = 1 - Math.pow(1 - progress, 3)
        setCount1(Math.round(1141843 * ease))
        setCount2(Math.round(1000 * ease))
        setCount3(Math.round(80382 * ease))
        if (step >= steps) clearInterval(timer)
      }, interval)
    }, 600)

    // Phase 3: plane flies out
    setTimeout(() => {
      setPhase("outro")
      setPlaneX(150)
    }, 2200)

    // Phase 4: fade out
    setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 400)
    }, 2600)
  }, [])

  if (!visible) return (
    <div className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ background: "#0a0f1e", opacity: 0, transition: "opacity 0.4s ease" }} />
  )

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0a0f1e 0%, #1e293b 50%, #0f172a 100%)",
        opacity: phase === "outro" ? 0 : 1,
        transition: phase === "outro" ? "opacity 0.4s ease" : "none",
      }}>

      {/* Background blobs */}
      <div className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", top: "-10%", left: "-10%", animation: "pulse 3s ease-in-out infinite" }} />
      <div className="absolute w-80 h-80 rounded-full opacity-15 blur-3xl"
        style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)", bottom: "-10%", right: "-10%", animation: "pulse 3s ease-in-out infinite 1.5s" }} />
      <div className="absolute w-64 h-64 rounded-full opacity-10 blur-3xl"
        style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", animation: "pulse 2s ease-in-out infinite 0.5s" }} />

      {/* Plane */}
      <div className="absolute"
        style={{
          left: `${planeX}%`,
          top: "35%",
          transform: "translateX(-50%)",
          transition: phase === "intro"
            ? "left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "left 0.6s cubic-bezier(0.55, 0, 1, 0.45)",
          fontSize: "48px",
          filter: "drop-shadow(0 0 20px rgba(239,68,68,0.8))",
          zIndex: 10,
        }}>
        ✈️
      </div>

      {/* Trail */}
      {phase === "numbers" && (
        <div className="absolute"
          style={{ left: "10%", top: "calc(35% + 20px)", right: "50%", height: "2px", background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.6), transparent)", animation: "trailFade 0.5s ease forwards" }} />
      )}

      {/* Main content */}
      <div className="text-center relative z-10"
        style={{ animation: phase === "intro" ? "fadeUp 0.6s ease 0.4s both" : "none" }}>

        {/* Logo */}
        <div className="mb-6">
          <span className="font-bold" style={{ fontSize: "42px", color: "#ef4444" }}>its</span>
          <span className="font-bold" style={{ fontSize: "42px", color: "white" }}>tour</span>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "3px", textTransform: "uppercase" }}>infinity tourism services</p>
        </div>

        {/* Stats */}
        {phase !== "intro" && (
          <div className="flex gap-8 justify-center"
            style={{ animation: "fadeUp 0.5s ease forwards" }}>
            {[
              { label: "Gəlir (AZN)", value: count1.toLocaleString(), color: "#22c55e" },
              { label: "Sifarişlər", value: count2.toLocaleString(), color: "#6366f1" },
              { label: "Mənfəət (AZN)", value: count3.toLocaleString(), color: "#f59e0b" },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center px-4 py-3 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", minWidth: "130px" }}>
                <p className="text-2xl font-bold tabular-nums" style={{ color, fontVariantNumeric: "tabular-nums" }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Loading bar */}
        <div className="mt-8 mx-auto rounded-full overflow-hidden" style={{ width: "200px", height: "3px", background: "rgba(255,255,255,0.1)" }}>
          <div className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #ef4444, #f97316)",
              width: phase === "intro" ? "0%" : phase === "numbers" ? "80%" : "100%",
              transition: "width 1.8s ease",
              boxShadow: "0 0 10px rgba(239,68,68,0.8)",
            }} />
        </div>
        <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "2px" }}>
          {phase === "intro" ? "YÜKLƏNIR..." : phase === "numbers" ? "HAZIRLANIR..." : "GİRİLİR..."}
        </p>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
        }
        @keyframes trailFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .tabular-nums { font-variant-numeric: tabular-nums; }
      `}</style>
    </div>
  )
}
