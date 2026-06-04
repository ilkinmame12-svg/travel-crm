import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Managers email map ───────────────────────────────────────────────────
const MANAGER_EMAILS: Record<string, string> = {
  "Gunes Abdullazade":  "gunes@itstour.az",
  "Rehime Qasimli":     "rehime@itstour.az",
  "Gunay Qurbanova":    "gunay@itstour.az",
  "Ayxan Elxanli":      "ayxan@itstour.az",
  "Mircemil Abbasov":   "cemil@itstour.az",
  "Meryem Eliyeva":     "meryem@itstour.az",
  "Miraslan Abbasov":   "it@itstour.az",
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("az-AZ", {
    day: "numeric", month: "long", year: "numeric", weekday: "long"
  })
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "itstour CRM <noreply@itstour.az>",
      to,
      subject,
      html,
    }),
  })
  return res.ok
}

async function sendChatNotification(managerId: string, content: string) {
  // Send internal CRM chat message from system
  await supabase.from("messages").insert({
    sender_id: "00000000-0000-0000-0000-000000000000", // system user
    receiver_id: managerId,
    content,
    is_read: false,
  })
}

function buildEmailHTML(bookings: any[], daysLeft: number): string {
  const emoji = daysLeft === 1 ? "🚨" : "⏰"
  const urgency = daysLeft === 1 ? "SABAH UÇUŞ!" : "5 GÜN QALIR"
  const color = daysLeft === 1 ? "#ef4444" : "#f59e0b"

  const rows = bookings.map(b => `
    <tr style="border-bottom:1px solid #f0f0f0">
      <td style="padding:12px;font-weight:600">${b.client_name}</td>
      <td style="padding:12px">${b.destination}</td>
      <td style="padding:12px;font-weight:600;color:${color}">${formatDate(b.departure_date)}</td>
      <td style="padding:12px">${b.client_phone || "—"}</td>
      <td style="padding:12px">
        <span style="background:${b.payment_status === 'paid' ? '#dcfce7' : '#fef2f2'};color:${b.payment_status === 'paid' ? '#16a34a' : '#ef4444'};padding:3px 8px;border-radius:6px;font-size:12px">
          ${b.payment_status === 'paid' ? '✓ Ödənilib' : b.payment_status === 'partial' ? '⚡ Qismən' : '✗ Ödənilməyib'}
        </span>
      </td>
    </tr>
  `).join("")

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px">
      <div style="max-width:700px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
        <div style="background:linear-gradient(135deg,${color},${daysLeft === 1 ? '#f97316' : '#ef4444'});padding:30px;text-align:center">
          <div style="font-size:40px">${emoji}</div>
          <h1 style="color:white;margin:10px 0;font-size:24px">${urgency}</h1>
          <p style="color:rgba(255,255,255,0.85);margin:0">${bookings.length} müştərinin uçuşu ${daysLeft === 1 ? 'sabah' : '5 gün sonra'}</p>
        </div>
        <div style="padding:30px">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#f8fafc">
                <th style="padding:12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase">Müştəri</th>
                <th style="padding:12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase">İstiqamət</th>
                <th style="padding:12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase">Tarix</th>
                <th style="padding:12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase">Telefon</th>
                <th style="padding:12px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase">Ödəniş</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e5e7eb">
          <a href="https://itstourcrm.vercel.app/bookings" style="background:linear-gradient(135deg,#ef4444,#f97316);color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">
            CRM-də bax →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:12px">itstour CRM • Avtomatik xatırlatma sistemi</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export async function GET(request: NextRequest) {

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const in5days = addDays(today, 5).toISOString().split("T")[0]
    const in1day  = addDays(today, 1).toISOString().split("T")[0]

    // Fetch bookings for both dates
    const { data: bookings5, error: err5 } = await supabase
      .from("bookings")
      .select("id, client_name, client_phone, destination, departure_date, payment_status, manager")
      .eq("departure_date", in5days)
      .neq("status", "cancelled")

    const { data: bookings1, error: err1 } = await supabase
      .from("bookings")
      .select("id, client_name, client_phone, destination, departure_date, payment_status, manager")
      .eq("departure_date", in1day)
      .neq("status", "cancelled")

    if (err5 || err1) {
      return NextResponse.json({ error: "DB error" }, { status: 500 })
    }

    const results: any[] = []

    // ── Process 5-day reminders ──
    if (bookings5 && bookings5.length > 0) {
      // Group by manager
      const byManager: Record<string, any[]> = {}
      for (const b of bookings5) {
        if (!byManager[b.manager]) byManager[b.manager] = []
        byManager[b.manager].push(b)
      }

      for (const [managerName, mBookings] of Object.entries(byManager)) {
        // Send email
        const email = MANAGER_EMAILS[managerName]
        if (email) {
          const html = buildEmailHTML(mBookings, 5)
          const sent = await sendEmail(email, `⏰ 5 gün qalır — ${mBookings.length} müştərinin uçuşu`, html)
          results.push({ manager: managerName, type: "5day", email, sent })
        }

        // Send CRM chat notification
        const { data: managerProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .ilike("full_name", managerName)
          .single()

        if (managerProfile) {
          const clientList = mBookings.map(b => `• ${b.client_name} → ${b.destination}`).join("\n")
          await sendChatNotification(
            managerProfile.id,
            `⏰ XATİRLATMA: 5 gün sonra ${mBookings.length} müştərinizin uçuşu var:\n${clientList}\n\nZəhmət olmasa müştərilərlə əlaqə saxlayın.`
          )
        }
      }
    }

    // ── Process 1-day reminders ──
    if (bookings1 && bookings1.length > 0) {
      const byManager: Record<string, any[]> = {}
      for (const b of bookings1) {
        if (!byManager[b.manager]) byManager[b.manager] = []
        byManager[b.manager].push(b)
      }

      for (const [managerName, mBookings] of Object.entries(byManager)) {
        const email = MANAGER_EMAILS[managerName]
        if (email) {
          const html = buildEmailHTML(mBookings, 1)
          const sent = await sendEmail(email, `🚨 SABAH UÇUŞ — ${mBookings.length} müştəri`, html)
          results.push({ manager: managerName, type: "1day", email, sent })
        }

        const { data: managerProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .ilike("full_name", managerName)
          .single()

        if (managerProfile) {
          const clientList = mBookings.map(b => `• ${b.client_name} → ${b.destination} (${b.client_phone || "telefon yoxdur"})`).join("\n")
          await sendChatNotification(
            managerProfile.id,
            `🚨 TƏCİLİ: Sabah ${mBookings.length} müştərinizin uçuşu var:\n${clientList}\n\nMüştəriləri bu gün mütləq yoxlayın!`
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      date: today.toISOString().split("T")[0],
      checked: { in5days, in1day },
      bookings5: bookings5?.length ?? 0,
      bookings1: bookings1?.length ?? 0,
      notifications: results,
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Allow manual trigger from browser
export async function POST(request: NextRequest) {
  return GET(request)
}
