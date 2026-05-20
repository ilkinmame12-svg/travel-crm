export type IATAPeriod = '1-7' | '8-14' | '15-21' | '22-31'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid'
export type BookingType = 'bilet' | 'otel' | 'tur' | 'kruiz' | 'transfer' | 'bagaj' | 'yer_secimi' | 'cip'

export interface Booking {
  id: string
  createdAt: string
  updatedAt: string
  bookingType: BookingType
  clientName: string
  clientPhone: string
  clientEmail?: string
  destination: string
  departureDate: string
  returnDate: string
  travelers: number
  description?: string
  vendor?: string
  ticketNumber?: string
  bookingReference?: string
  pnr?: string
  isIata?: boolean
  buyPrice: number
  sellPrice: number
  commissionPercent: number
  commissionAmount: number
  profit: number
  paidAmount?: number
  manager: string
  iataPeriod: IATAPeriod
  status: BookingStatus
  paymentStatus: PaymentStatus
  notes?: string
}

export type BookingFormData = Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'commissionAmount' | 'profit'>

export interface BookingFilters {
  search: string
  status: BookingStatus | 'all'
  manager: string
  iataPeriod: IATAPeriod | 'all'
  bookingType: BookingType | 'all'
  dateFrom: string
  dateTo: string
}