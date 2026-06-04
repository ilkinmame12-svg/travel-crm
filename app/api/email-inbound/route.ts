import { NextRequest, NextResponse } from "next/server"
import { parseMIR } from "@/app/api/mir/route"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Zoho sends multipart/form-data or JSON
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? ""
    let mirText = ""
    let fromEmail = ""
    let subject = ""

    // ── Parse incoming email ──
    if (contentType.includes("application/json")) {
      const json = await request.json()
      fromEmail = json.from ?? json.sender ?? ""
      subject   = json.subject ?? ""
      // Email body (plain text)
      mirText   = json.text ?? json.body ?? json.html ?? ""
      // Check attachments
      if (json.attachments?.length > 0) {
        for (const att of json.attachments) {
          if (att.filename?.match(/\.MIR|\.mir|\.txt/i) || att.content_type?.includes("text")) {
            mirText = att.content ?? att.data ?? mirText
            break
          }
        }
      }
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData()
      fromEmail = form.get("from")?.toString() ?? form.get("sender")?.toString() ?? ""
      subject   = form.get("subject")?.toString() ?? ""
      mirText   = form.get("text")?.toString() ?? form.get("body")?.toString() ?? form.get("plain")?.toString() ?? ""
      // Try attachment
      const attachment = form.get("attachment") ?? form.get("file")
      if (attachment && typeof attachment !== "string") {
        try { mirText = await (attachment as File).text() } catch {}
      }
    } else {
      // Raw text
      mirText = await request.text()
    }

    // Clean up HTML if needed
    mirText = mirText.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim()

    // Check if it looks like a MIR
    const isMIR = mirText.includes("A02") || mirText.includes("A04") || mirText.includes("A07") ||
                  /T51G\d+/.test(mirText) || subject?.toLowerCase().includes("mir")

    if (!isMIR || mirText.length < 20) {
      // Not a MIR email — ignore silently
      return NextResponse.json({ success: true, skipped: true, reason: "Not a MIR email" })
    }

    // Parse MIR
    const parsed = parseMIR(mirText)
    const primary = parsed.passengers[0]
    const paxNames = parsed.passengers.map(p => p.name).filter(Boolean).join(", ")
    const ticketNums = parsed.passengers.map(p => p.ticketNumber).filter(Boolean).join(", ")

    const typeLabels: Record<string, string> = {
      ticket: "Aviabilet", reissue: "Bilet dəyişimi", refund: "Qaytarma",
      void: "Ləğvetmə", emd: "EMD Xidmət", cancel_refund: "Ləğv/Geri qaytarma", unknown: "Bilet",
    }

    const sellPrice = parsed.fare.totalAZN || parsed.fare.buyAZN || 0
    const buyPrice  = parsed.fare.buyAZN || sellPrice
    const commissionPercent = 5
    const commissionAmount  = Math.round(sellPrice * commissionPercent) / 100
    const profit = sellPrice - buyPrice - commissionAmount
    const finalSell = ["refund","void","cancel_refund"].includes(parsed.mirType) ? -(parsed.refundAmount ?? sellPrice) : sellPrice

    const noteLines = [
      `MIR növü: ${typeLabels[parsed.mirType]}`,
      `Bilet №: ${ticketNums || "—"}`,
      `PNR: ${parsed.pnr || "—"}`,
      `IATA: ${parsed.iataNumber || "—"}`,
      `Ödəniş: ${parsed.paymentMethod}`,
      `Email: ${fromEmail}`,
      `Mövzu: ${subject}`,
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
      manager: "Travelport Auto",
      iata_period: getIATAPeriod(parsed.departureDate),
      status: "pending",
      payment_status: "unpaid",
      notes: noteLines,
      ticket_number: ticketNums,
      booking_reference: parsed.pnr,
      pnr: parsed.pnr,
      submitted_by: fromEmail || "MIR Email System",
      submitted_by_role: "menecer",
      review_status: "pending",
      raw_mir: mirText.substring(0, 3000),
    }).select("id").single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`MIR processed: ${parsed.mirType} - ${paxNames} - ${parsed.destination}`)

    return NextResponse.json({
      success: true,
      mirType: parsed.mirType,
      draft_id: (data as any)?.id,
      passenger: paxNames,
      destination: parsed.destination,
    })

  } catch (err: any) {
    console.error("Email inbound error:", err)
    // Return 200 so Zoho doesn't retry
    return NextResponse.json({ success: false, error: err.message })
  }
}

// Zoho verification GET request
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "itstour MIR Email Inbound aktiv",
    endpoint: "POST /api/email-inbound",
  })
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
