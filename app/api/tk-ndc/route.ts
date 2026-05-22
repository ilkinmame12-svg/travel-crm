import { NextRequest, NextResponse } from "next/server"

const TK_AUTH_URL = "https://sso.apim.turkishairlines.com/auth/realms/3scale/protocol/openid-connect/token"
const TK_BASE_URL = "https://ndc.apim.turkishairlines.com/v1/test"
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
      "Content-Type": "text/xml",
      "Accept": "text/xml",
    }

    if (action === "search") {
      const trxId = Date.now().toString()
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<n1:IATA_AirShoppingRQ xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:n1="http://www.iata.org/IATA/2015/EASD/00/IATA_OffersAndOrdersMessage" xmlns:cns="http://www.iata.org/IATA/2015/EASD/00/IATA_OffersAndOrdersCommonTypes">
  <n1:DistributionChain>
    <cns:DistributionChainLink>
      <cns:Ordinal>1</cns:Ordinal>
      <cns:OrgRole>Seller</cns:OrgRole>
      <cns:ParticipatingOrg>
        <cns:OrgID>${ORG_ID}</cns:OrgID>
      </cns:ParticipatingOrg>
      <cns:SalesBranch>
        <cns:SalesBranchID>${BRANCH_ID}</cns:SalesBranchID>
      </cns:SalesBranch>
    </cns:DistributionChainLink>
    <cns:DistributionChainLink>
      <cns:Ordinal>2</cns:Ordinal>
      <cns:OrgRole>Carrier</cns:OrgRole>
      <cns:ParticipatingOrg>
        <cns:OrgID>TK</cns:OrgID>
      </cns:ParticipatingOrg>
    </cns:DistributionChainLink>
  </n1:DistributionChain>
  <n1:PayloadAttributes>
    <cns:CorrelationID>${trxId}</cns:CorrelationID>
    <cns:PrimaryLangID>EN</cns:PrimaryLangID>
    <cns:TrxID>${trxId}</cns:TrxID>
    <cns:VersionNumber>2023.3</cns:VersionNumber>
  </n1:PayloadAttributes>
  <n1:Request>
    <cns:FlightRequest>
      <cns:FlightRequestOriginDestinationsCriteria>
        <cns:OriginDestCriteria>
          <cns:CabinType>
            <cns:CabinTypeCode>${params.cabinClass === "BUSINESS" ? "2" : "3"}</cns:CabinTypeCode>
            <cns:PrefLevel><cns:PrefLevelCode>Preferred</cns:PrefLevelCode></cns:PrefLevel>
          </cns:CabinType>
          <cns:DestArrivalCriteria>
            <cns:IATA_LocationCode>${params.destination}</cns:IATA_LocationCode>
          </cns:DestArrivalCriteria>
          <cns:OriginDepCriteria>
            <cns:Date>${params.departureDate}</cns:Date>
            <cns:IATA_LocationCode>${params.origin || "GYD"}</cns:IATA_LocationCode>
          </cns:OriginDepCriteria>
          <cns:OriginDestID>OD1</cns:OriginDestID>
        </cns:OriginDestCriteria>
      </cns:FlightRequestOriginDestinationsCriteria>
    </cns:FlightRequest>
    <cns:PaxList>
      ${Array.from({ length: params.travelers || 1 }, (_, i) => `
      <cns:Pax>
        <cns:PaxID>PAX_${i + 1}</cns:PaxID>
        <cns:PTC>ADT</cns:PTC>
      </cns:Pax>`).join('')}
    </cns:PaxList>
  </n1:Request>
</n1:IATA_AirShoppingRQ>`

      const response = await fetch(`${TK_BASE_URL}/shop`, {
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
<n1:IATA_OrderRetrieveRQ xmlns:n1="http://www.iata.org/IATA/2015/EASD/00/IATA_OffersAndOrdersMessage" xmlns:cns="http://www.iata.org/IATA/2015/EASD/00/IATA_OffersAndOrdersCommonTypes">
  <n1:DistributionChain>
    <cns:DistributionChainLink>
      <cns:Ordinal>1</cns:Ordinal>
      <cns:OrgRole>Seller</cns:OrgRole>
      <cns:ParticipatingOrg>
        <cns:OrgID>${ORG_ID}</cns:OrgID>
      </cns:ParticipatingOrg>
      <cns:SalesBranch>
        <cns:SalesBranchID>${BRANCH_ID}</cns:SalesBranchID>
      </cns:SalesBranch>
    </cns:DistributionChainLink>
    <cns:DistributionChainLink>
      <cns:Ordinal>2</cns:Ordinal>
      <cns:OrgRole>Carrier</cns:OrgRole>
      <cns:ParticipatingOrg>
        <cns:OrgID>TK</cns:OrgID>
      </cns:ParticipatingOrg>
    </cns:DistributionChainLink>
  </n1:DistributionChain>
  <n1:PayloadAttributes>
    <cns:TrxID>${trxId}</cns:TrxID>
    <cns:CorrelationID>${trxId}</cns:CorrelationID>
    <cns:PrimaryLangID>EN</cns:PrimaryLangID>
    <cns:VersionNumber>2023.3</cns:VersionNumber>
  </n1:PayloadAttributes>
  <n1:Query>
    <cns:Filters>
      <cns:OrderID Owner="TK">${params.pnr}</cns:OrderID>
    </cns:Filters>
  </n1:Query>
</n1:IATA_OrderRetrieveRQ>`

      const response = await fetch(`${TK_BASE_URL}/order-retrieve`, {
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