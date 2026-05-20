import { create } from "zustand"
import { supabase } from "../supabase"

export interface Payment {
  id: string
  createdAt: string
  clientName: string
  amount: number
  description: string
  date: string
  bookingId?: string
}

interface PaymentsStore {
  payments: Payment[]
  loading: boolean
  fetchPayments: () => Promise<void>
  addPayment: (data: Omit<Payment, "id" | "createdAt">) => Promise<void>
  deletePayment: (id: string) => Promise<void>
}

export const usePaymentsStore = create<PaymentsStore>((set) => ({
  payments: [],
  loading: false,

  fetchPayments: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
    if (!error && data) {
      set({
        payments: data.map((row: any) => ({
          id: row.id,
          createdAt: row.created_at,
          clientName: row.client_name,
          amount: row.amount,
          description: row.description ?? "",
          date: row.date,
          bookingId: row.booking_id,
        }))
      })
    }
    set({ loading: false })
  },

  addPayment: async (data) => {
    const { data: inserted, error } = await supabase
      .from("payments")
      .insert({
        client_name: data.clientName,
        amount: data.amount,
        description: data.description,
        date: data.date,
        booking_id: data.bookingId ?? null,
      })
      .select()
      .single()
    if (!error && inserted) {
      const payment: Payment = {
        id: inserted.id,
        createdAt: inserted.created_at,
        clientName: inserted.client_name,
        amount: inserted.amount,
        description: inserted.description ?? "",
        date: inserted.date,
        bookingId: inserted.booking_id,
      }
      set((state) => ({ payments: [payment, ...state.payments] }))

      if (data.bookingId) {
        const { data: booking } = await supabase
          .from("bookings")
          .select("paid_amount, sell_price")
          .eq("id", data.bookingId)
          .single()

        if (booking) {
          const newPaidAmount = (booking.paid_amount ?? 0) + data.amount
          const newPaymentStatus = newPaidAmount >= booking.sell_price ? "paid" : newPaidAmount > 0 ? "partial" : "unpaid"
          await supabase
            .from("bookings")
            .update({ paid_amount: newPaidAmount, payment_status: newPaymentStatus })
            .eq("id", data.bookingId)
        }
      }
    }
  },

  deletePayment: async (id) => {
    await supabase.from("payments").delete().eq("id", id)
    set((state) => ({ payments: state.payments.filter((p) => p.id !== id) }))
  },
}))
