export type BusyBlock = {
  start: string
  end: string
}

export type FreeSlot = {
  start: string
  end: string
  startMinute: number
  endMinute: number
}

const DAY_START = 9 * 60
const DAY_END = 18 * 60

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** Returns maximal common free intervals that are at least `duration` minutes long. */
export function findFreeSlots(
  attendeeBookings: readonly (readonly BusyBlock[])[],
  duration: number,
): FreeSlot[] {
  if (!Number.isFinite(duration) || duration <= 0 || duration > DAY_END - DAY_START) return []

  const busy = attendeeBookings.flatMap((blocks) => blocks
    .map(({ start, end }) => ({ start: Math.max(DAY_START, toMinutes(start)), end: Math.min(DAY_END, toMinutes(end)) }))
    .filter(({ start, end }) => start < end))
    .sort((a, b) => a.start - b.start || a.end - b.end)

  const merged: { start: number; end: number }[] = []
  for (const block of busy) {
    const previous = merged.at(-1)
    if (previous && block.start <= previous.end) previous.end = Math.max(previous.end, block.end)
    else merged.push({ ...block })
  }

  const slots: FreeSlot[] = []
  let cursor = DAY_START
  for (const block of merged) {
    if (block.start - cursor >= duration) slots.push({ start: toTime(cursor), end: toTime(block.start), startMinute: cursor, endMinute: block.start })
    cursor = Math.max(cursor, block.end)
  }
  if (DAY_END - cursor >= duration) slots.push({ start: toTime(cursor), end: toTime(DAY_END), startMinute: cursor, endMinute: DAY_END })
  return slots
}
