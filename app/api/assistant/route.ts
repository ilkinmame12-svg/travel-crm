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
    const { data, error } = await supabase
      .from("client_balances")
      .select("*")
      .ilike("client_name", `%${input.client_name}%`)
    if (error) return { error: error.message }
    return { balances: data }
  }

  if (name === "get_stats") {
    let query = supabase.from("bookings").select("sell_price, buy_price, profit, commission_amount, paid_amount, payment_status")
    if (input.month) {
      const start = `${input.month}-01`
      const end = `${input.month}-31`
      query = query.gte("departure_date", start).lte("departure_date", end)
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
    const debts = data?.map((b: any) => ({
      ...b,
      remaining: b.sell_price - (b.paid_amount ?? 0)
    }))
    return { debts, total: debts?.reduce((s: number, b: any) => s + b.remaining, 0) ?? 0 }
  }

  if (name === "update_payment") {
    const { data: booking } = await supabase
      .from("bookings")
      .select("sell_price, paid_amount")
      .eq("id", input.booking_id)
      .single()
    if (!booking) return { error: "Sifariş tapılmadı" }
    const newStatus = input.paid_amount >= booking.sell_price ? "paid" : "partial"
    const { error } = await supabase.from("bookings").update({
      paid_amount: input.paid_amount,
      payment_status: newStatus
    }).eq("id", input.booking_id)
    if (error) return { error: error.message }
    return { success: true, status: newStatus }
  }

  return { error: "Unknown tool" }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = await request.json()

    const systemPrompt = `Sen itstour CRM sisteminin AI kömekçisisən. Azerbaycan dilinde qısa ve aydın cavab ver.
Lazım olduqda məlumat tapmaq üçün alətlərdən (tools) istifadə et.
Rəqəmləri AZN ilə göstər. Tarixləri gün.ay.il formatında göstər.

${context}`

    let currentMessages = [...messages]
    
    // Agentic loop - max 5 iterations
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

      // If no tool use, return final answer
      if (data.stop_reason === "end_turn") {
        return NextResponse.json(data)
      }

      // Process tool calls
      if (data.stop_reason === "tool_use") {
        const toolUses = data.content.filter((c: any) => c.type === "tool_use")
        
        // Add assistant message
        currentMessages.push({ role: "assistant", content: data.content })
        
        // Execute tools and add results
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