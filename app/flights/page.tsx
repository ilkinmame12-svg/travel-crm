"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/calculations"
import { Search, Plane, Clock, DollarSign } from "lucide-react"

interface Flight {
  id: string
  departure: string
  arrival: string
  duration: string
  price: number
  currency: string
  stops: number
  airline: string
  flightNumber: string
}

export default function FlightsPage() {
  const [form, setForm] = useState({
    origin: "GYD",
    destination: "",
    departureDate: "",
    travelers: 1,
    cabinClass: "ECONOMY"
  })
  const [flights, setFlights] = useState<Flight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [pnr, setPnr] = useState("")
  const [pnrResult, setPnrResult] = useState<any>(null)

  async function searchFlights() {
    if (!form.destination || !form.departureDate) return
    setLoading(true)
    setError("")
    setFlights([])

    try {
      const response = await fetch("/api/tk-ndc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", params: form })
      })
      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        // Parse TK NDC response
        const offers = data.flightOffers || data.offers || []
        setFlights(offers.map((o: any, i: number) => ({
          id: o.id || String(i),
          departure: o.itineraries?.[0]?.segments?.[0]?.departure?.at || "",
          arrival: o.itineraries?.[0]?.segments?.slice(-1)[0]?.arrival?.at || "",
          duration: o.itineraries?.[0]?.duration || "",
          price: o.price?.total || o.totalPrice || 0,
          currency: o.price?.currency || "AZN",
          stops: (o.itineraries?.[0]?.segments?.length || 1) - 1,
          airline: o.validatingAirlineCodes?.[0] || "TK",
          flightNumber: o.itineraries?.[0]?.segments?.[0]?.number || "",
        })))
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function checkPNR() {
    if (!pnr.trim()) return
    setLoading(true)
    try {
      const response = await fetch("/api/tk-ndc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_pnr", params: { pnr: pnr.trim() } })
      })
      const data = await response.json()
      setPnrResult(data)
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">TK NDC</h1>
        <p className="text-sm text-gray-500 mt-0.5">Turkish Airlines NDC inteqrasiyası</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Flight Search */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plane size={18} className="text-red-500" />
            Reys axtarışı
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Haradan</label>
                <input value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
                  placeholder="GYD"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 uppercase" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Haraya</label>
                <input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value.toUpperCase() }))}
                  placeholder="IST"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 uppercase" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarix</label>
                <input type="date" value={form.departureDate} onChange={e => setForm(f => ({ ...f, departureDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sərnişin</label>
                <input type="number" min="1" max="9" value={form.travelers} onChange={e => setForm(f => ({ ...f, travelers: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sinif</label>
              <select value={form.cabinClass} onChange={e => setForm(f => ({ ...f, cabinClass: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
                <option value="ECONOMY">Economy</option>
                <option value="BUSINESS">Business</option>
                <option value="FIRST">First</option>
              </select>
            </div>
            <button onClick={searchFlights} disabled={loading}
              className="w-full bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
              <Search size={16} />
              {loading ? "Axtarılır..." : "Axtar"}
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {flights.length > 0 && (
            <div className="mt-4 space-y-3">
              {flights.map(f => (
                <div key={f.id} className="border border-gray-100 rounded-xl p-4 hover:border-red-200 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900">{f.airline} {f.flightNumber}</span>
                    <span className="text-lg font-bold text-red-500">{formatCurrency(f.price)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock size={12} />{f.duration}</span>
                    <span>{f.stops === 0 ? "Düz reys" : `${f.stops} dayanacaq`}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {flights.length === 0 && !loading && !error && (
            <div className="mt-4 text-center py-8 text-gray-400">
              <Plane size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Axtarış nəticəsi burada görünəcək</p>
            </div>
          )}
        </div>

        {/* PNR Check */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search size={18} className="text-red-500" />
            PNR yoxlama
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PNR kodu</label>
              <input value={pnr} onChange={e => setPnr(e.target.value.toUpperCase())}
                placeholder="Məs: ABCDEF"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 uppercase" />
            </div>
            <button onClick={checkPNR} disabled={loading || !pnr.trim()}
              className="w-full bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 disabled:opacity-50">
              {loading ? "Yoxlanılır..." : "Yoxla"}
            </button>
          </div>

          {pnrResult && (
            <div className="mt-4 bg-gray-50 rounded-xl p-4">
              <pre className="text-xs text-gray-700 overflow-auto max-h-64">
                {JSON.stringify(pnrResult, null, 2)}
              </pre>
            </div>
          )}

          {!pnrResult && (
            <div className="mt-4 text-center py-8 text-gray-400">
              <Search size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">PNR nəticəsi burada görünəcək</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}