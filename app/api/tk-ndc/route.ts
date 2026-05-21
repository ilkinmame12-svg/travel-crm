import { NextRequest, NextResponse } from "next/server"

const TK_AUTH_URL = "https://sso.apim.turkishairlines.com/auth/realms/3scale/protocol/openid-connect/token"
const TK_BASE_URL = "https://ndc.apim.turkishairlines.com"

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

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    if (action === "search") {
      const body = {
        RequestHeader: {
          OfficeID: process.env.TK_IATA,
          Language: "AZ",
        },
        IATA_AirShoppingRQ: {
          CoreQuery: {
            OriginDestinations: [{
              OriginDestKey: "OD1",
              Departure: {
                AirportCode: params.origin || "GYD",
                Date: params.departureDate,
              },
              Arrival: {
                AirportCode: params.destination,
              },
            }],
          },
          Pax: Array.from({ length: params.travelers || 1 }, (_, i) => ({
            PaxID: `PAX${i + 1}`,
            PTC: "ADT",
          })),
          ShoppingCriteria: {
            CabinType: {
              CabinTypeCode: params.cabinClass === "BUSINESS" ? "C" : "Y",
            },
          },
        },
      }

        const response = await fetch(`${TK_BASE_URL}/v1/shop`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })
      const data = await response.json()
      return NextResponse.json(data)
    }

    if (action === "check_pnr") {
      const body = {
        RequestHeader: {
          OfficeID: process.env.TK_IATA,
          Language: "AZ",
        },
        IATA_OrderRetrieveRQ: {
          Query: {
            Filters: {
              OrderID: {
                Owner: "TK",
                value: params.pnr,
              },
            },
          },
        },
      }
const response = await fetch(`${TK_BASE_URL}/v1/order-retrieve`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })
      const data = await response.json()
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}