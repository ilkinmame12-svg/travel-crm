import { create } from "zustand"
import { supabase } from "../supabase"
import type { Booking, BookingFormData } from "../types"
import { applyCalculations } from "../calculations"

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

    clientName: row.client_name ?? "",
    clientPhone: row.client_phone ?? "",
    clientEmail: row.client_email ?? "",

    destination: row.destination ?? "",
    departureDate: row.departure_date ?? null,
    returnDate: row.return_date ?? null,

    travelers: row.travelers ?? 1,
    description: row.description ?? "",

    buyPrice: row.buy_price ?? 0,
    sellPrice: row.sell_price ?? 0,

    commissionPercent: row.commission_percent ?? 0,
    commissionAmount: row.commission_amount ?? 0,
    profit: row.profit ?? 0,

    manager: row.manager ?? "",

    iataPeriod: row.iata_period ?? "1-10",

    status: row.status ?? "draft",
    paymentStatus: row.payment_status ?? "unpaid",

    notes: row.notes ?? "",

    // 🔥 ВАЖНО: FIX для TypeScript
    bookingType: row.booking_type ?? "standard",
  }
}

function toRow(data: any) {
  return {
    client_name: data.clientName,
    client_phone: data.clientPhone,
    client_email: data.clientEmail,

    destination: data.destination,
    departure_date: data.departureDate,
    return_date: data.returnDate,

    travelers: data.travelers,
    description: data.description,

    buy_price: data.buyPrice,
    sell_price: data.sellPrice,

    commission_percent: data.commissionPercent,
    commission_amount: data.commissionAmount,
    profit: data.profit,

    manager: data.manager,
    iata_period: data.iataPeriod,

    status: data.status,
    payment_status: data.paymentStatus,

    notes: data.notes,

    updated_at: new Date().toISOString(),
  }
}

export const useBookingsStore = create<BookingsStore>((set, get) => ({
  bookings: [],
  loading: false,

  fetchBookings: async () => {
    set({ loading: true })

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error(error)
    }

    if (data) {
      set({ bookings: data.map(toBooking) })
    }

    set({ loading: false })
  },

  addBooking: async (data) => {
    const calculated = applyCalculations(data)
    const row = toRow(calculated)

    const { data: inserted, error } = await supabase
      .from("bookings")
      .insert(row)
      .select()
      .single()

    if (error || !inserted) {
      throw new Error(error?.message || "Insert failed")
    }

    const booking = toBooking(inserted)

    set((state) => ({
      bookings: [booking, ...state.bookings],
    }))

    return booking
  },

  updateBooking: async (id, data) => {
    const calculated = applyCalculations(data)
    const row = toRow(calculated)

    const { error } = await supabase
      .from("bookings")
      .update(row)
      .eq("id", id)

    if (error) {
      console.error(error)
      return
    }

    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === id ? { ...b, ...calculated } : b
      ),
    }))
  },

  deleteBooking: async (id) => {
    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", id)

    if (error) {
      console.error(error)
      return
    }

    set((state) => ({
      bookings: state.bookings.filter((b) => b.id !== id),
    }))
  },
}))