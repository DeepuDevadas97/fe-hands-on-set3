export type BookingTime = { start: string; end: string }
export function overlaps(start: string, end: string, bookings: BookingTime[]): boolean
