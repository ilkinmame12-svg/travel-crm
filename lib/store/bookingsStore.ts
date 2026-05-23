import { create } from 'zustand'
import { supabase } from '../supabase'
import type { Booking, BookingFormData } from '../types'
import { applyCalculations } from '../calculations'

interface BookingsStore {
  bookings: Booking[]
  loading: boolean
  fetchBookings: () => Promise<void>
  addBooking: (data: BookingFormData) => Promise<Booking>
  updateBooking: (id: string, data: BookingFormData) => Promise<void>
  deleteBooking: (id: string) => Promise<void>
}

function toBooking(row: any): Booking {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    bookingType: row.booking_type ?? 'bilet',
    clientName: row.client_name,
    clientPhone: row.client_phone,
    clientEmail: row.client_email,
    destination: row.destination,
    departureDate: row.departure_date,
    returnDate: row.return_date,
    travelers: row.travelers,
    description: row.description,
    vendor: row.vendor ?? '',
    ticketNumber: row.ticket_number ?? '',
    bookingReference: row.booking_reference ?? '',
    pnr: row.pnr ?? '',
    isIata: row.is_iata ?? false,
    buyPrice: row.buy_price,
    sellPrice: row.sell_price,
    commissionPercent: row.commission_percent,
    commissionAmount: row.commission_amount,
    profit: row.profit,
    paidAmount: row.paid_amount ?? 0,
    manager: row.manager,
    iataPeriod: row.iata_period,
    status: row.status,
    paymentStatus: row.payment_status,
    notes: row.notes,
  }
}

function toRow(data: any) {
  const today = new Date().toISOString().split("T")[0]
  return {
    booking_type: data.bookingType,
    client_name: data.clientName,
    client_phone: data.clientPhone,
    client_email: data.clientEmail,
    destination: data.destination,
    departure_date: data.departureDate || today,
    return_date: data.returnDate || today,
    travelers: data.travelers,
    description: data.description,
    vendor: data.vendor ?? '',
    ticket_number: data.ticketNumber ?? '',
    booking_reference: data.bookingReference ?? '',
    pnr: data.pnr ?? '',
    is_iata: data.isIata ?? false,
    buy_price: data.buyPrice,
    sell_price: data.sellPrice,
    commission_percent: data.commissionPercent,
    commission_amount: data.commissionAmount,
    profit: data.profit,
    paid_amount: data.paidAmount ?? 0,
    manager: data.manager,
    iata_period: data.iataPeriod,
    status: data.status,
    payment_status: data.paymentStatus,
    notes: data.notes,
    updated_by: data.updated_by ?? '',
    updated_by_role: data.updated_by_role ?? '',
    updated_at: new Date().toISOString(),
  }
}

export const useBookingsStore = create<BookingsStore>((set, get) => ({
  bookings: [],
  loading: false,

  fetchBookings: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      set({ bookings: data.map(toBooking) })
    }
    set({ loading: false })
  },

  addBooking: async (data) => {
  const calculated = applyCalculations(data)
  
  // Check client balance
console.log("Checking balance for:", data.clientName)
const { data: balanceRows } = await supabase
  .from("client_balances")
  .select("*")
  .eq("client_name", data.clientName)
  .limit(1)

const clientBalance = balanceRows?.[0] ?? null
console.log("Balance found:", clientBalance)

  let paidAmount = calculated.paidAmount ?? 0
  let paymentStatus = calculated.paymentStatus
  let balanceUsed = 0

  if (clientBalance && clientBalance.balance > 0) {
    const debt = calculated.sellPrice - paidAmount
    if (debt > 0) {
      balanceUsed = Math.min(clientBalance.balance, debt)
      paidAmount += balanceUsed

      if (paidAmount >= calculated.sellPrice) {
        paymentStatus = "paid"
      } else if (paidAmount > 0) {
        paymentStatus = "partial"
      }

      // Deduct from balance
      const newBalance = clientBalance.balance - balanceUsed
     const { error: balanceError } = await supabase
  .from("client_balances")
  .update({ balance: newBalance })
  .eq("id", clientBalance.id)

console.log("Balance update:", { newBalance, error: balanceError })

      await supabase.from("client_balance_transactions").insert({
        client_name: data.clientName,
        amount: balanceUsed,
        type: "debit",
        description: `Avtomatik: yeni sifariş üçün balansdan silinib`,
      })
    }
  }

  const row = toRow({ ...calculated, paidAmount, paymentStatus })
  const { data: inserted, error } = await supabase
    .from("bookings")
    .insert(row)
    .select()
    .single()

  if (!error && inserted) {
    const booking = toBooking(inserted)
    set((state) => ({ bookings: [booking, ...state.bookings] }))
    return booking
  }
  throw new Error(error?.message)
},

  updateBooking: async (id, data) => {
    const calculated = applyCalculations(data)
    const row = toRow(calculated)
    const { error } = await supabase
      .from('bookings')
      .update(row)
      .eq('id', id)
    if (!error) {
      set((state) => ({
        bookings: state.bookings.map((b) =>
          b.id === id ? { ...b, ...calculated } : b
        ),
      }))
    }
  },

  deleteBooking: async (id) => {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)
    if (!error) {
      set((state) => ({ bookings: state.bookings.filter((b) => b.id !== id) }))
    }
  },
}))