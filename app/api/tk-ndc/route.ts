import { NextRequest, NextResponse } from "next/server"

const TK_AUTH_URL = "https://sso.apim.turkishairlines.com/auth/realms/3scale/protocol/openid-connect/token"
const TK_SHOPPING_URL = "https://ndc.apim.turkishairlines.com:443"
const TK_ORDER_URL = "https://ndc.apim.turkishairlines.com:443"

const ORG_ID = "268811531"
const BRANCH_ID = "7EM"

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
      "Content-Type": "application/xml",
      "Accept": "application/xml",
    }

    if (action === "search") {
      const trxId = Date.now().toString()
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<n1:IATA_AirShoppingRQ
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:n1="http://www.iata.org/IATA/2015/EASD/00/IATA_OffersAndOrdersMessage"
  xmlns:cns="http://www.iata.org/IATA/2015/EASD/00/IATA_OffersAndOrdersCommonTypes">
  <n1:DistributionChain>
    <cns:Org>
      <cns:OrgID>${ORG_ID}</cns:OrgID>
      <cns:Role>Agency</cns:Role>
    </cns:Org>
  </n1:DistributionChain>
  <n1:PayloadAttributes>
    <cns:TrxID>${trxId}</cns:TrxID>
    <cns:CorrelationID>${trxId}</cns:CorrelationID>
    <cns:PrimaryLangID>EN</cns:PrimaryLangID>
    <cns:VersionNumber>21.36</cns:VersionNumber>
  </n1:PayloadAttributes>
  <n1:Request>
    <cns:FlightRequest>
      <cns:FlightRequestOriginDestinationsCriteria>
        <cns:OriginDestCriteria>
          <cns:DestArrivalCriteria>
            <cns:IATA_LocationCode>${params.destination}</cns:IATA_LocationCode>
          </cns:DestArrivalCriteria>
          <cns:OriginDepCriteria>
            <cns:Date>${params.departureDate}</cns:Date>
            <cns:IATA_LocationCode>${params.origin || "GYD"}</cns:IATA_LocationCode>
          </cns:OriginDepCriteria>
        </cns:OriginDestCriteria>
      </cns:FlightRequestOriginDestinationsCriteria>
    </cns:FlightRequest>
    <cns:Pax>
      <cns:PaxID>PAX1</cns:PaxID>
      <cns:PTC>ADT</cns:PTC>
    </cns:Pax>
    <cns:ShoppingCriteria>
      <cns:CabinTypeCriteria>
        <cns:CabinType>
          <cns:CabinTypeCode>${params.cabinClass === "BUSINESS" ? "C" : "Y"}</cns:CabinTypeCode>
        </cns:CabinType>
      </cns:CabinTypeCriteria>
    </cns:ShoppingCriteria>
  </n1:Request>
</n1:IATA_AirShoppingRQ>`

      const response = await fetch(`${TK_SHOPPING_URL}/api/shop`, {
        method: "POST",
        headers,
        body: xml,
      })

      const text = await response.text()
      return NextResponse.json({ xml: text, status: response.status })
    }

    if (action === "check_pnr") {
      const trxId = Date.now().toString()
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<n1:IATA_OrderRetrieveRQ
  xmlns:n1="http://www.iata.org/IATA/2015/EASD/00/IATA_OffersAndOrdersMessage"
  xmlns:cns="http://www.iata.org/IATA/2015/EASD/00/IATA_OffersAndOrdersCommonTypes">
  <n1:DistributionChain>
    <cns:Org>
      <cns:OrgID>${ORG_ID}</cns:OrgID>
      <cns:Role>Agency</cns:Role>
    </cns:Org>
  </n1:DistributionChain>
  <n1:PayloadAttributes>
    <cns:TrxID>${trxId}</cns:TrxID>
    <cns:CorrelationID>${trxId}</cns:CorrelationID>
    <cns:PrimaryLangID>EN</cns:PrimaryLangID>
    <cns:VersionNumber>21.36</cns:VersionNumber>
  </n1:PayloadAttributes>
  <n1:Query>
    <cns:Filters>
      <cns:OrderID Owner="TK">${params.pnr}</cns:OrderID>
    </cns:Filters>
  </n1:Query>
</n1:IATA_OrderRetrieveRQ>`

      const response = await fetch(`${TK_ORDER_URL}/order-retrieve`, {
        method: "POST",
        headers,
        body: xml,
      })

      const text = await response.text()
      return NextResponse.json({ xml: text, status: response.status })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}