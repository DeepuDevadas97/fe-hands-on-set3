export function overlaps(start, end, bookings) {
  const toMinutes = (value) => {
    const [hours, minutes] = value.split(':').map(Number)
    return hours * 60 + minutes
  }
  const proposedStart = toMinutes(start)
  const proposedEnd = toMinutes(end)
  return bookings.some((booking) => proposedStart < toMinutes(booking.end) && proposedEnd > toMinutes(booking.start))
}
