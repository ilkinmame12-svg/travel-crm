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
  }
}