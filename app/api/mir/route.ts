import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── MIR Parser ────────────────────────────────────────────────────────────
function parseMIR(mirText: string) {
  const lines = mirText.split("\n").map(l => l.trim()).filter(Boolean)
  
  const result: any = {
    pnr: "",
    ticketNumber: "",
    passengerName: "",
    passengerType: "ADT",
    issueDate: "",
    segments: [],
    fare: { currency: "", amount: 0, total: 0, taxes: 0 },
    paymentMethod: "",
    agentInfo: "",
    iataNumber: "",
    tourCode: "",
  }

  // Parse header line (first line)
  const header = lines[0] ?? ""
  // Header format: T51G773392025510124709JUL241403 TK235...
  // Extract PNR (Galileo locator from 88XXXXXX pattern)
  const pnrMatch = mirText.match(/88([A-Z0-9]{6})/)
  if (pnrMatch) result.pnr = pnrMatch[1]

  // Extract IATA number (6 digits)
  const iataMatch = mirText.match(/\b(\d{8})\b/)
  if (iataMatch) result.iataNumber = iataMatch[1]

  // Extract tour code (CCCXXXXX)
  const tourMatch = mirText.match(/CCC([A-Z0-9]+)/)
  if (tourMatch) result.tourCode = tourMatch[1]

  for (const line of lines) {
    // A02 - Passenger data
    if (line.startsWith("A02")) {
      // A02BABAYEVA/MATANAT MRS  186362638064  293584991201000001553ADT
      const nameMatch = line.match(/A02([A-Z]+\/[A-Z\s]+(?:MR|MRS|MS|DR)?)\s/)
      if (nameMatch) result.passengerName = nameMatch[1].trim()

      const ticketMatch = line.match(/(\d{13})/)
      if (ticketMatch) result.ticketNumber = ticketMatch[1]

      const paxTypeMatch = line.match(/(ADT|CHD|INF|CNN)/)
      if (paxTypeMatch) result.passengerType = paxTypeMatch[1]

      const datMatch = line.match(/NTD:(\d{2}[A-Z]{3}\d{2})/)
      if (datMatch) result.issueDate = datMatch[1]
    }

    // A04 - Flight segments
    if (line.startsWith("A04")) {
      // A0401TK235TURKISH AIRL 337Z HK31JUL0235 0445 2GYDBAKU/HEYDAR ISTISTANBUL
      const segMatch = line.match(/A04\d+(TK|\w{2})(\d+)\w+\s+([\w\s]+?)\s+(\d+\w?)\s+\w+\s+(\d{2})([A-Z]{3})(\d{4})\s+(\d{4})\s+\d+(\w{3})([\w/\s]+?)(\w{3})([\w/\s]+)/)
      if (segMatch) {
        const seg: any = {}
        // Extract airline code + flight number
        const flightMatch = line.match(/A04\d+(\w{2})\s*(\d+)/)
        if (flightMatch) { seg.airline = flightMatch[1]; seg.flightNumber = flightMatch[2] }

        // Extract class
        const classMatch = line.match(/\s([A-Z])\s+HK/)
        if (classMatch) seg.class = classMatch[1]

        // Extract date and route
        const routeMatch = line.match(/HK(\d{2})([A-Z]{3})(\d{4})\s+(\d{4})\s+\d+([A-Z]{3})([\w\s/]+?)([A-Z]{3})([\w\s/]+?)\s/)
        if (routeMatch) {
          seg.date = `${routeMatch[1]}${routeMatch[2]}${routeMatch[3].substring(0,2)}`
          seg.departTime = routeMatch[3]
          seg.arriveTime = routeMatch[4]
          seg.fromCode = routeMatch[5]
          seg.toCode = routeMatch[7]
        }

        // Extract baggage
        const bagMatch = line.match(/(\d+)K/)
        if (bagMatch) seg.baggage = `${bagMatch[1]}K`

        if (seg.flightNumber) result.segments.push(seg)
      }
    }

    // A07 - Fare information
    if (line.startsWith("A07")) {
      // A0701EUR 1344.00AZN 3266.52AZN 2454.42AZNT1: 36.60AZ
      const totalMatch = line.match(/AZN\s*([\d.]+)AZN\s*([\d.]+)/)
      if (totalMatch) {
        result.fare.total = parseFloat(totalMatch[1])
        result.fare.amount = parseFloat(totalMatch[2])
        result.fare.taxes = result.fare.total - result.fare.amount
        result.fare.currency = "AZN"
      }
      const eurMatch = line.match(/EUR\s*([\d.]+)/)
      if (eurMatch) result.fare.baseEur = parseFloat(eurMatch[1])
    }

    // A11 - Form of payment
    if (line.startsWith("A11")) {
      const fopMatch = line.match(/A11([A-Z])/)
      if (fopMatch) {
        const fopCodes: Record<string, string> = { S: "Nağd", C: "Kredit kart", I: "Invoice", N: "Ödənişsiz" }
        result.paymentMethod = fopCodes[fopMatch[1]] ?? fopMatch[1]
      }
    }

    // A12 - Agent info
    if (line.startsWith("A12")) {
      result.agentInfo = line.replace("A12", "").trim()
    }
  }

  // Build destination string from segments
  if (result.segments.length > 0) {
    const first = result.segments[0]
    const last = result.segments[result.segments.length - 1]
    const codes = result.segments.map((s: any) => s.fromCode).filter(Boolean)
    if (last?.toCode) codes.push(last.toCode)
    result.destination = codes.join("-")
    result.departureDate = first.date ? convertMIRDate(first.date) : ""
    result.returnDate = last?.date ? convertMIRDate(last.date) : result.departureDate
  }

  return result
}

function convertMIRDate(mirDate: string): string {
  // Convert "31JUL24" → "2024-07-31"
  const months: Record<string, string> = {
    JAN:"01",FEB:"02",MAR:"03",APR:"04",MAY:"05",JUN:"06",
    JUL:"07",AUG:"08",SEP:"09",OCT:"10",NOV:"11",DEC:"12"
  }
  const match = mirDate.match(/(\d{2})([A-Z]{3})(\d{2,4})/)
  if (!match) return ""
  const day = match[1]
  const month = months[match[2]] ?? "01"
  const year = match[3].length === 2 ? `20${match[3]}` : match[3]
  return `${year}-${month}-${day}`
}

// ─── API Route ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    let mirText = ""
    let managerName = ""
    let managerEmail = ""

    // Support both JSON and raw MIR text
    try {
      const json = JSON.parse(body)
      mirText = json.mir ?? json.content ?? body
      managerName = json.manager ?? ""
      managerEmail = json.email ?? ""
    } catch {
      mirText = body
    }

    if (!mirText || mirText.length < 10) {
      return NextResponse.json({ error: "MIR mətni boşdur" }, { status: 400 })
    }

    const parsed = parseMIR(mirText)

    // Determine manager from agent info or use provided
    if (!managerName && parsed.agentInfo) {
      managerName = parsed.agentInfo
    }

    // Commission calculation (default 5%)
    const commissionPercent = 5
    const commissionAmount = Math.round(parsed.fare.amount * commissionPercent) / 100
    const profit = parsed.fare.amount - (parsed.fare.amount * 0.95) // approximate

    // Insert into booking_drafts for accountant approval
    const { data, error } = await supabase.from("booking_drafts").insert({
      client_name: parsed.passengerName || "Naməlum",
      client_phone: "",
      destination: parsed.destination || "",
      departure_date: parsed.departureDate || new Date().toISOString().split("T")[0],
      return_date: parsed.returnDate || parsed.departureDate || new Date().toISOString().split("T")[0],
      travelers: 1,
      booking_type: "bilet",
      description: `MIR avtomatik import. PNR: ${parsed.pnr}`,
      vendor: "Travelport/Galileo",
      is_iata: true,
      buy_price: parsed.fare.amount,
      sell_price: parsed.fare.total,
      commission_percent: commissionPercent,
      commission_amount: commissionAmount,
      profit: profit,
      paid_amount: 0,
      manager: managerName || "Travelport",
      iata_period: getIATAPeriod(parsed.departureDate),
      status: "pending",
      payment_status: "unpaid",
      notes: `Bilet №: ${parsed.ticketNumber}\nPNR: ${parsed.pnr}\nOdeme: ${parsed.paymentMethod}\nIATA: ${parsed.iataNumber}`,
      ticket_number: parsed.ticketNumber,
      booking_reference: parsed.pnr,
      pnr: parsed.pnr,
      submitted_by: managerName || "MIR System",
      submitted_by_role: "menecer",
      review_status: "pending",
      raw_mir: mirText.substring(0, 2000),
    }).select("id").single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      message: "MIR uğurla işləndi və təsdiq növbəsinə əlavə edildi",
      draft_id: (data as any)?.id,
      parsed: {
        passenger: parsed.passengerName,
        ticket: parsed.ticketNumber,
        pnr: parsed.pnr,
        destination: parsed.destination,
        departure: parsed.departureDate,
        total: `${parsed.fare.total} AZN`,
        segments: parsed.segments.length,
      }
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Also support GET for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "MIR Parser aktiv",
    endpoint: "POST /api/mir",
    usage: "MIR mətnini body-də göndərin",
    example: {
      method: "POST",
      body: { mir: "T51G77339...", manager: "Meryem Eliyeva" }
    }
  })
}

function getIATAPeriod(dateStr: string): string {
  if (!dateStr) return "1-7"
  const day = new Date(dateStr).getDate()
  if (day <= 7) return "1-7"
  if (day <= 15) return "8-15"
  if (day <= 23) return "16-23"
  return "24-31"
}
