import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const tools = [
  {
    name: "search_bookings",
    description: "Müştəri adına, menecerə, tarixə görə sifarişləri axtar",
    input_schema: {
      type: "object",
      properties: {
        client_name: { type: "string", description: "Müştəri adı (qismən ola bilər)" },
        manager: { type: "string", description: "Menecer adı" },
        payment_status: { type: "string", enum: ["paid", "partial", "unpaid"], description: "Ödəniş statusu" },
        date_from: { type: "string", description: "Başlanğıc tarix (YYYY-MM-DD)" },
        date_to: { type: "string", description: "Son tarix (YYYY-MM-DD)" },
        limit: { type: "number", description: "Nəticə sayı (default 10)" }
      }
    }
  },
  {
    name: "get_client_balance",
    description: "Müştərinin balansını tap",
    input_schema: {
      type: "object",
      properties: {
        client_name: { type: "string", description: "Müştəri adı" }
      },
      required: ["client_name"]
    }
  },
  {
    name: "get_stats",
    description: "Ümumi statistika: gəlir, xərc, mənfəət, borc",
    input_schema: {
      type: "object",
      properties: {
        month: { type: "string", description: "Ay (YYYY-MM formatında, məsələn 2026-05)" }
      }
    }
  },
  {
    name: "get_debts",
    description: "Ödənilməmiş borcları siyahıla",
    input_schema: {
      type: "object",
      properties: {
        client_name: { type: "string", description: "Müştəri adı ilə filtr" },
        limit: { type: "number", description: "Nəticə sayı (default 10)" }
      }
    }
  },
  {
    name: "update_payment",
    description: "Sifarişin ödənişini yenilə",
    input_schema: {
      type: "object",
      properties: {
        booking_id: { type: "string", description: "Sifariş ID" },
        paid_amount: { type: "number", description: "Ödənilmiş məbləğ" }
      },
      required: ["booking_id", "paid_amount"]
    }
  },
  {
    name: "add_booking",
    description: "Yeni sifariş əlavə et. İstifadəçi sifariş məlumatlarını verdikdə bu aləti istifadə et.",
    input_schema: {
      type: "object",
      properties: {
        client_name: { type: "string", description: "Müştəri adı" },
        client_phone: { type: "string", description: "Müştəri telefonu" },
        destination: { type: "string", description: "İstiqamət / təyinat" },
        departure_date: { type: "string", description: "Uçuş tarixi (YYYY-MM-DD)" },
        return_date: { type: "string", description: "Qayıdış tarixi (YYYY-MM-DD)" },
        booking_type: { type: "string", enum: ["bilet", "otel", "tur", "transfer", "kruiz", "bagaj", "yer_secimi", "cip"], description: "Sifariş növü" },
        sell_price: { type: "number", description: "Satış qiyməti (AZN)" },
        buy_price: { type: "number", description: "Alış qiyməti (AZN)" },
        commission_percent: { type: "number", description: "Komissiya faizi (default 5)" },
        paid_amount: { type: "number", description: "Ödənilmiş məbləğ (default 0)" },
        manager: { type: "string", description: "Menecer adı" },
        vendor: { type: "string", description: "Vendor (Amadeus, IATA, Booking.com və s.)" },
        is_iata: { type: "boolean", description: "IATA biletidir?" },
        iata_period: { type: "string", enum: ["1-7", "8-15", "16-23", "24-31"], description: "IATA periodu" },
        notes: { type: "string", description: "Qeydlər" },
        ticket_number: { type: "string", description: "Bilet nömrəsi" },
        pnr: { type: "string", description: "PNR" }
      },
      required: ["client_name", "destination", "departure_date", "sell_price", "buy_price", "booking_type", "manager"]
    }
  },
  {
    name: "delete_booking",
    description: "Sifarişi sil. Yalnız istifadəçi açıq razılıq verdikdə istifadə et.",
    input_schema: {
      type: "object",
      properties: {
        booking_id: { type: "string", description: "Sifariş ID" }
      },
      required: ["booking_id"]
    }
  }
]

async function executeTool(name: string, input: any) {
  if (name === "search_bookings") {
    let query = supabase.from("bookings").select("id, client_name, destination, departure_date, sell_price, paid_amount, payment_status, manager, booking_type")
    if (input.client_name) query = query.ilike("client_name", `%${input.client_name}%`)
    if (input.manager) query = query.ilike("manager", `%${input.manager}%`)
    if (input.payment_status) query = query.eq("payment_status", input.payment_status)
    if (input.date_from) query = query.gte("departure_date", input.date_from)
    if (input.date_to) query = query.lte("departure_date", input.date_to)
    query = query.order("departure_date", { ascending: false }).limit(input.limit ?? 10)
    const { data, error } = await query
    if (error) return { error: error.message }
    return { bookings: data, count: data?.length ?? 0 }
  }

  if (name === "get_client_balance") {
    const { data, error } = await supabase.from("client_balances").select("*").ilike("client_name", `%${input.client_name}%`)
    if (error) return { error: error.message }
    return { balances: data }
  }

  if (name === "get_stats") {
    let query = supabase.from("bookings").select("sell_price, buy_price, profit, commission_amount, paid_amount, payment_status")
    if (input.month) {
      query = query.gte("departure_date", `${input.month}-01`).lte("departure_date", `${input.month}-31`)
    }
    const { data, error } = await query
    if (error) return { error: error.message }
    const stats = {
      total_revenue: data?.reduce((s: number, b: any) => s + (b.sell_price ?? 0), 0) ?? 0,
      total_cost: data?.reduce((s: number, b: any) => s + (b.buy_price ?? 0), 0) ?? 0,
      total_profit: data?.reduce((s: number, b: any) => s + (b.profit ?? 0), 0) ?? 0,
      total_commission: data?.reduce((s: number, b: any) => s + (b.commission_amount ?? 0), 0) ?? 0,
      unpaid_count: data?.filter((b: any) => b.payment_status !== "paid").length ?? 0,
      unpaid_amount: data?.filter((b: any) => b.payment_status !== "paid").reduce((s: number, b: any) => s + (b.sell_price - (b.paid_amount ?? 0)), 0) ?? 0,
      total_bookings: data?.length ?? 0,
    }
    return stats
  }

  if (name === "get_debts") {
    let query = supabase.from("bookings")
      .select("id, client_name, destination, departure_date, sell_price, paid_amount, manager")
      .in("payment_status", ["unpaid", "partial"])
      .order("sell_price", { ascending: false })
    if (input.client_name) query = query.ilike("client_name", `%${input.client_name}%`)
    query = query.limit(input.limit ?? 10)
    const { data, error } = await query
    if (error) return { error: error.message }
    const debts = data?.map((b: any) => ({ ...b, remaining: b.sell_price - (b.paid_amount ?? 0) }))
    return { debts, total: debts?.reduce((s: number, b: any) => s + b.remaining, 0) ?? 0 }
  }

  if (name === "update_payment") {
    const { data: booking } = await supabase.from("bookings").select("sell_price, paid_amount").eq("id", input.booking_id).single()
    if (!booking) return { error: "Sifariş tapılmadı" }
    const newStatus = input.paid_amount >= booking.sell_price ? "paid" : "partial"
    const { error } = await supabase.from("bookings").update({ paid_amount: input.paid_amount, payment_status: newStatus }).eq("id", input.booking_id)
    if (error) return { error: error.message }
    return { success: true, status: newStatus }
  }

  if (name === "add_booking") {
    const commissionPercent = input.commission_percent ?? 5
    const commissionAmount = Math.round(input.sell_price * commissionPercent) / 100
    const profit = input.sell_price - input.buy_price - commissionAmount
    const paidAmount = input.paid_amount ?? 0
    const paymentStatus = paidAmount >= input.sell_price ? "paid" : paidAmount > 0 ? "partial" : "unpaid"

    // Determine IATA period from departure date
    let iataPeriod = input.iata_period ?? "1-7"
    if (!input.iata_period && input.departure_date) {
      const day = new Date(input.departure_date).getDate()
      if (day <= 7) iataPeriod = "1-7"
      else if (day <= 15) iataPeriod = "8-15"
      else if (day <= 23) iataPeriod = "16-23"
      else iataPeriod = "24-31"
    }

    const { data, error } = await supabase.from("bookings").insert({
      client_name: input.client_name,
      client_phone: input.client_phone ?? "",
      destination: input.destination,
      departure_date: input.departure_date,
      return_date: input.return_date ?? input.departure_date,
      travelers: 1,
      booking_type: input.booking_type,
      description: input.booking_type,
      vendor: input.vendor ?? "",
      is_iata: input.is_iata ?? false,
      buy_price: input.buy_price,
      sell_price: input.sell_price,
      commission_percent: commissionPercent,
      commission_amount: commissionAmount,
      profit,
      paid_amount: paidAmount,
      manager: input.manager,
      iata_period: iataPeriod,
      status: "confirmed",
      payment_status: paymentStatus,
      notes: input.notes ?? "",
      ticket_number: input.ticket_number ?? "",
      booking_reference: "",
      pnr: input.pnr ?? "",
      updated_by: "AI Köməkçi",
      updated_by_role: "it_admin",
    }).select().single()

    if (error) return { error: error.message }
    return { success: true, booking_id: data?.id, message: `Sifariş uğurla əlavə edildi! ID: ${data?.id}` }
  }

  if (name === "delete_booking") {
    const { error } = await supabase.from("bookings").delete().eq("id", input.booking_id)
    if (error) return { error: error.message }
    return { success: true, message: "Sifariş silindi" }
  }

  return { error: "Unknown tool" }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = await request.json()

    const systemPrompt = `Sen itstour CRM sisteminin AI kömekçisisən. Azerbaycan dilinde qısa ve aydın cavab ver.
Lazım olduqda məlumat tapmaq üçün alətlərdən (tools) istifadə et.
Rəqəmləri AZN ilə göstər. Tarixləri gün.ay.il formatında göstər.

Yeni sifariş əlavə etmək üçün istifadəçidən bu məlumatları al:
- Müştəri adı
- İstiqamət
- Uçuş tarixi
- Sifariş növü (bilet/otel/tur/transfer)
- Satış qiyməti
- Alış qiyməti  
- Menecer adı

Əgər məlumat çatışmırsa - soruş. Hamısı olduqda add_booking istifadə et.
Silmədən əvvəl həmişə təsdiq al: "Əminsiniz ki, bu sifarişi silmək istəyirsiniz?"

${context}`

    let currentMessages = [...messages]
    
    for (let i = 0; i < 5; i++) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 2000,
          system: systemPrompt,
          tools,
          messages: currentMessages,
        }),
      })

      const data = await response.json()
      if (!response.ok) return NextResponse.json({ error: data }, { status: response.status })

      if (data.stop_reason === "end_turn") {
        return NextResponse.json(data)
      }

      if (data.stop_reason === "tool_use") {
        const toolUses = data.content.filter((c: any) => c.type === "tool_use")
        currentMessages.push({ role: "assistant", content: data.content })
        
        const toolResults = await Promise.all(toolUses.map(async (toolUse: any) => {
          const result = await executeTool(toolUse.name, toolUse.input)
          return {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result)
          }
        }))
        
        currentMessages.push({ role: "user", content: toolResults })
        continue
      }

      return NextResponse.json(data)
    }

    return NextResponse.json({ error: "Max iterations reached" }, { status: 500 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
