import { NextRequest, NextResponse } from "next/server"

const TK_AUTH_URL = "https://api.turkishairlines.com/oauth/token"
const TK_BASE_URL = "https://api.turkishairlines.com/v2"

async function getToken() {
  const response = await fetch(TK_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.TK_CLIENT_ID!,
      client_secret: process.env.TK_CLIENT_SECRET!,
    }),
  })
  const data = await response.json()
  return data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const { action, params } = await request.json()
    const token = await getToken()

    if (!token) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    let url = ""
    let body = {}

    if (action === "search") {
      url = `${TK_BASE_URL}/flights/search`
      body = {
        originDestinations: [{
          origin: params.origin,
          destination: params.destination,
          departureDate: params.departureDate,
        }],
        travelers: [{ type: "ADT", count: params.travelers || 1 }],
        cabinClass: params.cabinClass || "ECONOMY",
        currency: "AZN",
        officeId: process.env.TK_IATA,
      }
    } else if (action === "check_pnr") {
      url = `${TK_BASE_URL}/bookings/${params.pnr}`
    }

    const response = await fetch(url, {
      method: action === "check_pnr" ? "GET" : "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: action === "check_pnr" ? undefined : JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}