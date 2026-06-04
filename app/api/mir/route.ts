import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Types ─────────────────────────────────────────────────────────────────
interface MIRSegment {
  segNum: number
  airline: string
  flightNumber: string
  class: string
  date: string
  departTime: string
  arriveTime: string
  fromCode: string
  toCode: string
  baggage: string
  status: string
}

interface MIRFare {
  baseCurrency: string
  baseAmount: number
  totalAZN: number
  buyAZN: number
  taxes: number
  taxBreakdown: string
}

interface MIRParsed {
  mirType: "ticket" | "reissue" | "refund" | "void" | "emd" | "cancel_refund" | "unknown"
  pnr: string
  iataNumber: string
  tourCode: string
  issueDate: string
  passengers: Array<{ name: string; ticketNumber: string; paxType: string }>
  segments: MIRSegment[]
  fare: MIRFare
  paymentMethod: string
  agentInfo: string
  destination: string
  departureDate: string
  returnDate: string
  airlineCode: string
  airlineName: string
  refundAmount?: number
  emdServices?: Array<{ description: string; amount: number }>
  emails?: string[]
}

// ─── Month map ─────────────────────────────────────────────────────────────
const MONTHS: Record<string, string> = {
  JAN:"01",FEB:"02",MAR:"03",APR:"04",MAY:"05",JUN:"06",
  JUL:"07",AUG:"08",SEP:"09",OCT:"10",NOV:"11",DEC:"12"
}

function convertDate(d: string): string {
  // "10JUL25" or "10JUL2025" → "2025-07-10"
  const m = d.match(/(\d{2})([A-Z]{3})(\d{2,4})/)
  if (!m) return ""
  const year = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${year}-${MONTHS[m[2]] ?? "01"}-${m[1]}`
}

function getIATAPeriod(dateStr: string): string {
  if (!dateStr) return "1-7"
  const day = new Date(dateStr).getDate()
  if (isNaN(day)) return "1-7"
  if (day <= 7) return "1-7"
  if (day <= 15) return "8-15"
  if (day <= 23) return "16-23"
  return "24-31"
}

// ─── Detect MIR type from header ──────────────────────────────────────────
function detectMIRType(lines: string[], fullText: string): MIRParsed["mirType"] {
  const header = lines[0] ?? ""
  const hasA23 = fullText.includes("\nA23") || fullText.includes("\r\nA23")
  const hasA10 = fullText.includes("\nA10") || fullText.includes("\r\nA10")
  const hasA29 = fullText.includes("\nA29") || fullText.includes("\r\nA29")
  const hasA30 = fullText.includes("\nA30") || fullText.includes("\r\nA30")

  // Void: header contains hash-like ID (no date in standard position)
  if (/[0-9A-F]{10,}/.test(header) && !hasA23) return "void"
  // Refund: has A23 section
  if (hasA23) {
    // cancel_refund: multiple passengers + A23
    const paxCount = (fullText.match(/\nA02/g) ?? []).length
    if (paxCount > 1) return "cancel_refund"
    return "refund"
  }
  // Reissue: has A10 section
  if (hasA10) return "reissue"
  // EMD: has A29/A30 sections
  if (hasA29 || hasA30) return "emd"
  // Default: ticket
  return "ticket"
}

// ─── Main Parser ───────────────────────────────────────────────────────────
export function parseMIR(mirText: string): MIRParsed {
  const lines = mirText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const full = mirText

  const result: MIRParsed = {
    mirType: "unknown",
    pnr: "",
    iataNumber: "",
    tourCode: "",
    issueDate: "",
    passengers: [],
    segments: [],
    fare: { baseCurrency: "", baseAmount: 0, totalAZN: 0, buyAZN: 0, taxes: 0, taxBreakdown: "" },
    paymentMethod: "Nağd",
    agentInfo: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    airlineCode: "",
    airlineName: "",
    emdServices: [],
    emails: [],
  }

  result.mirType = detectMIRType(lines, full)

  // ── Header line (line 0) ──
  const header = lines[0] ?? ""
  // IATA: 8 consecutive digits in header area
  const iataM = header.match(/(\d{8})/)
  if (iataM) result.iataNumber = iataM[1]
  // Airline name from header
  const airlineM = header.match(/[A-Z]{2}\d+([A-Z\s]+?)\s{2,}/)
  if (airlineM) result.airlineName = airlineM[1].trim()
  // Airline code (2 letters + digits)
  const acM = header.match(/\s([A-Z][A-Z0-9])\d{3,4}[A-Z]/)
  if (acM) result.airlineCode = acM[1]

  // ── Line 2 (PNR, IATA, Galileo locator) ──
  const line2 = lines[1] ?? ""
  // Galileo locator: 6 alphanumeric after spaces
  const galM = line2.match(/\s([A-Z0-9]{6})\s/)
  if (galM) result.pnr = galM[1]
  // IATA from line2 if not found
  if (!result.iataNumber) {
    const iatM2 = line2.match(/(\d{8})/)
    if (iatM2) result.iataNumber = iatM2[1]
  }
  // Tour code
  const tourM = full.match(/CCC([A-Z0-9]+)/)
  if (tourM) result.tourCode = tourM[1]

  // ── Parse each section ──
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // A00 - Email recipients
    if (line.startsWith("TO:")) {
      const email = line.replace("TO:", "").trim()
      if (email.includes("@")) result.emails!.push(email)
    }

    // A02 - Passenger data
    if (line.startsWith("A02")) {
      // A02BABAYEVA/MATANAT MRS  1988361611 45582715868501  ADT  01
      const nameM = line.match(/A02([A-Z]+\/[A-Z\s]+(?:MR|MRS|MS|DR|MSTR|M|F)?)\s/)
      const ticketM = line.match(/(\d{13})/)
      const paxTypeM = line.match(/\s(ADT|CHD|INF|CNN|C\d{2})\s/)
      const tdM = line.match(/TL:(\d{2}[A-Z]{3}\d{2})/)
      const issueDateM = line.match(/TL:(\d{2}[A-Z]{3}\d{2})/)
      const ntdM = full.match(/NTD:(\d{2}[A-Z]{3}\d{2})/)
      if (ntdM && !result.issueDate) result.issueDate = convertDate(ntdM[1])
      if (issueDateM && !result.issueDate) result.issueDate = convertDate(issueDateM[1])

      result.passengers.push({
        name: nameM ? nameM[1].trim() : "",
        ticketNumber: ticketM ? ticketM[1] : "",
        paxType: paxTypeM ? paxTypeM[1] : "ADT",
      })
    }

    // A04 - Flight segments
    if (line.match(/^A04\d{2}[A-Z]/)) {
      // A0401J2771AZERBAIJAN H  23Z HK10JUL0840 1055 2GYDBAKU/HEYDAR ABJVBODRUM
      const seg: MIRSegment = { segNum: 0, airline: "", flightNumber: "", class: "", date: "", departTime: "", arriveTime: "", fromCode: "", toCode: "", baggage: "", status: "" }

      const segNumM = line.match(/^A04(\d{2})/)
      if (segNumM) seg.segNum = parseInt(segNumM[1])

      // Airline code (2 chars) + flight number (3-4 digits)
      const flightM = line.match(/A04\d{2}([A-Z][A-Z0-9])(\s*)(\d{1,4})/)
      if (flightM) { seg.airline = flightM[1]; seg.flightNumber = flightM[3] }

      // Class (single letter before HK/HN/HL)
      const classM = line.match(/\s([A-Z])\s+H[KNL]/)
      if (classM) seg.class = classM[1]

      // Status
      const statM = line.match(/\s(HK|HN|HL)\s*(\d{2})/)
      if (statM) { seg.status = statM[1] }

      // Date + times: HK10JUL0840 1055
      const dateM = line.match(/H[KNL]\d{0,2}(\d{2}[A-Z]{3})(\d{4})\s+(\d{4})/)
      if (dateM) {
        seg.date = dateM[1]
        seg.departTime = dateM[2].substring(0,2) + ":" + dateM[2].substring(2)
        seg.arriveTime = dateM[3].substring(0,2) + ":" + dateM[3].substring(2)
      }

      // From/To airport codes (3 uppercase letters)
      const airportM = [...line.matchAll(/\s([A-Z]{3})([A-Z\/\s]+?)\s+([A-Z]{3})([A-Z\/\s]+?)(?:INH|INM|IN\s)/g)]
      if (airportM.length > 0) {
        seg.fromCode = airportM[0][1]
        seg.toCode = airportM[0][3]
      } else {
        // fallback: find 3-letter codes after date
        const codes = [...line.matchAll(/\b([A-Z]{3})\b/g)].map(m => m[1])
        const filtered = codes.filter(c => c !== "HKN" && c !== "HNL" && c !== "INH" && c !== "INM" && c !== "ANL" && c !== "DDL" && c.length === 3)
        if (filtered.length >= 2) { seg.fromCode = filtered[0]; seg.toCode = filtered[1] }
      }

      // Baggage
      const bagM = line.match(/(\d{2})(?:K|PC)/)
      if (bagM) seg.baggage = bagM[0]

      if (seg.airline || seg.flightNumber) result.segments.push(seg)
    }

    // A07 - Fare amounts
    if (line.startsWith("A07")) {
      // A0701EUR 1384.00AZN 2980.16AZN 2772.85AZN T1:...
      const eurM = line.match(/EUR\s*([\d.]+)/)
      if (eurM) { result.fare.baseCurrency = "EUR"; result.fare.baseAmount = parseFloat(eurM[1]) }

      const aznAmounts = [...line.matchAll(/AZN\s*([\d.]+)/g)].map(m => parseFloat(m[1]))
      if (aznAmounts.length >= 2) {
        result.fare.totalAZN = aznAmounts[0]
        result.fare.buyAZN = aznAmounts[1]
        result.fare.taxes = parseFloat((aznAmounts[0] - aznAmounts[1]).toFixed(2))
      } else if (aznAmounts.length === 1) {
        result.fare.totalAZN = aznAmounts[0]
        result.fare.buyAZN = aznAmounts[0]
      }

      // Tax breakdown
      const etM = line.match(/ET:\s*(.+)/)
      if (etM) result.fare.taxBreakdown = etM[1].trim()
      // Next line may continue taxes
      const nextLine = lines[i+1] ?? ""
      if (nextLine.startsWith("ET:")) {
        result.fare.taxBreakdown += " " + nextLine.replace("ET:", "").trim()
      }
    }

    // A11 - Form of payment
    if (line.startsWith("A11")) {
      const fopM = line.match(/A11([A-Z])/)
      if (fopM) {
        const fopMap: Record<string, string> = { S: "Nağd", C: "Kredit kart", I: "Faktura", N: "Ödənişsiz", X: "Digər" }
        result.paymentMethod = fopMap[fopM[1]] ?? fopM[1]
        // Total from A11
        const totalM = line.match(/([A-Z])\s+([\d.]+)/)
        if (totalM && !result.fare.totalAZN) result.fare.totalAZN = parseFloat(totalM[2])
      }
    }

    // A12 - Agent info
    if (line.startsWith("A12")) {
      const agentInfo = line.replace("A12", "").replace(/BAK[TL]\s*\*/,"").trim()
      if (!result.agentInfo) result.agentInfo = agentInfo
    }

    // A23 - Refund section
    if (line.startsWith("A23") && result.mirType === "refund") {
      // RA: refund amount line
      const raM = line.match(/RA:\s*[\d.]+\s*([\d.]+)/)
      if (raM) result.refundAmount = parseFloat(raM[1])
    }
    if (line.startsWith("RA:")) {
      const raM = line.match(/RA:\s*[\d.\s]+AZN\s*([\d.]+)/)
      if (raM) result.refundAmount = parseFloat(raM[1])
    }

    // A29/A30 - EMD services
    if (line.startsWith("A29") || line.startsWith("A30")) {
      const emdAmtM = line.match(/AZN\s*([\d.]+)/)
      const emdDescM = line.match(/(BAGGAGE|SEAT|LEGROOM|PENALTY|FEE|MEAL)/i)
      if (emdAmtM) {
        result.emdServices!.push({
          description: emdDescM ? emdDescM[1] : "EMD Xidmət",
          amount: parseFloat(emdAmtM[1]),
        })
      }
    }

    // A16 - Penalty/EMD description
    if (line.startsWith("A16")) {
      const penM = line.match(/AZN\s*([\d.]+)/)
      const descM = line.match(/(PENALTY|FEE|CHANGE|BAGGAGE)[^A-Z]*([A-Z\/]+)/)
      if (penM) {
        result.emdServices!.push({
          description: descM ? descM[0] : "Penalty Fee",
          amount: parseFloat(penM[1]),
        })
      }
    }
  }

  // ── Build destination & dates from segments ──
  if (result.segments.length > 0) {
    const first = result.segments[0]
    const last = result.segments[result.segments.length - 1]

    // Route: GYD-BJV-GYD
    const routeCodes = result.segments.map(s => s.fromCode).filter(Boolean)
    if (last?.toCode) routeCodes.push(last.toCode)
    result.destination = [...new Set(routeCodes)].join("-")

    if (first.date) result.departureDate = convertDate(first.date + "25") // append year
    if (last.date)  result.returnDate    = convertDate(last.date + "25")
  }

  // ── Primary passenger ──
  const primaryPax = result.passengers[0]

  // ── Airline from segments ──
  if (!result.airlineCode && result.segments[0]?.airline) {
    result.airlineCode = result.segments[0].airline
  }

  return result
}

// ─── API Handler ───────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    let mirText = ""
    let managerName = ""

    try {
      const json = JSON.parse(body)
      mirText = json.mir ?? json.content ?? ""
      managerName = json.manager ?? ""
    } catch {
      mirText = body
    }

    if (!mirText || mirText.length < 10) {
      return NextResponse.json({ error: "MIR mətni boşdur" }, { status: 400 })
    }

    const parsed = parseMIR(mirText)
    const primary = parsed.passengers[0]

    if (!managerName && parsed.agentInfo) managerName = parsed.agentInfo

    // ── Determine booking type from MIR type ──
    const typeLabels: Record<string, string> = {
      ticket: "Aviabilet",
      reissue: "Bilet dəyişimi (Reissue)",
      refund: "Qaytarma (Refund)",
      void: "Ləğvetmə (Void)",
      emd: "EMD Xidmət",
      cancel_refund: "Ləğv/Geri qaytarma",
      unknown: "Bilet",
    }

    const sellPrice = parsed.fare.totalAZN || parsed.fare.buyAZN || 0
    const buyPrice  = parsed.fare.buyAZN || sellPrice
    const commissionPercent = 5
    const commissionAmount  = Math.round(sellPrice * commissionPercent) / 100
    const profit = sellPrice - buyPrice - commissionAmount

    // For refunds/void — negative prices
    const finalSell = ["refund", "void", "cancel_refund"].includes(parsed.mirType)
      ? -(parsed.refundAmount ?? sellPrice)
      : sellPrice

    const paxNames = parsed.passengers.map(p => p.name).filter(Boolean).join(", ")
    const ticketNums = parsed.passengers.map(p => p.ticketNumber).filter(Boolean).join(", ")

    const noteLines = [
      `MIR növü: ${typeLabels[parsed.mirType]}`,
      `Bilet №: ${ticketNums || "—"}`,
      `PNR: ${parsed.pnr || "—"}`,
      `IATA: ${parsed.iataNumber || "—"}`,
      `Ödəniş: ${parsed.paymentMethod}`,
      `Sərnişinlər: ${paxNames}`,
      parsed.tourCode ? `Tour code: ${parsed.tourCode}` : "",
      parsed.fare.taxBreakdown ? `Vergilər: ${parsed.fare.taxBreakdown}` : "",
      parsed.emdServices?.length ? `EMD: ${parsed.emdServices.map(e => `${e.description} ${e.amount}AZN`).join(", ")}` : "",
    ].filter(Boolean).join("\n")

    const { data, error } = await supabase.from("booking_drafts").insert({
      client_name: paxNames || primary?.name || "Naməlum",
      client_phone: "",
      destination: parsed.destination || "",
      departure_date: parsed.departureDate || new Date().toISOString().split("T")[0],
      return_date: parsed.returnDate || parsed.departureDate || new Date().toISOString().split("T")[0],
      travelers: parsed.passengers.length || 1,
      booking_type: "bilet",
      description: typeLabels[parsed.mirType],
      vendor: `${parsed.airlineCode || ""} - ${parsed.airlineName || "Travelport/Galileo"}`.trim(),
      is_iata: true,
      buy_price: Math.abs(buyPrice),
      sell_price: Math.abs(finalSell),
      commission_percent: commissionPercent,
      commission_amount: commissionAmount,
      profit: ["refund","void","cancel_refund"].includes(parsed.mirType) ? -Math.abs(profit) : profit,
      paid_amount: 0,
      manager: managerName || "Travelport",
      iata_period: getIATAPeriod(parsed.departureDate),
      status: "pending",
      payment_status: "unpaid",
      notes: noteLines,
      ticket_number: ticketNums,
      booking_reference: parsed.pnr,
      pnr: parsed.pnr,
      submitted_by: managerName || "MIR System",
      submitted_by_role: "menecer",
      review_status: "pending",
      raw_mir: mirText.substring(0, 3000),
    }).select("id").single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      mirType: parsed.mirType,
      message: `${typeLabels[parsed.mirType]} MIR uğurla işləndi və mühasib növbəsinə əlavə edildi`,
      draft_id: (data as any)?.id,
      parsed: {
        type: parsed.mirType,
        passengers: paxNames,
        tickets: ticketNums,
        pnr: parsed.pnr,
        destination: parsed.destination,
        departure: parsed.departureDate,
        return: parsed.returnDate,
        total: `${Math.abs(finalSell)} AZN`,
        segments: parsed.segments.length,
        airline: parsed.airlineName,
        iata: parsed.iataNumber,
        payment: parsed.paymentMethod,
      }
    })

  } catch (err: any) {
    console.error("MIR parse error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: "MIR Parser v2 aktiv",
    supportedTypes: ["ticket", "reissue", "refund", "void", "emd", "cancel_refund"],
    endpoint: "POST /api/mir",
    body: { mir: "MIR content here...", manager: "Manager name (optional)" }
  })
}
