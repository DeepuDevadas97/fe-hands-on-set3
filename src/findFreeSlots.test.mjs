import test from 'node:test'
import assert from 'node:assert/strict'
import { findFreeSlots } from './findFreeSlots.ts'

const times = (slots) => slots.map(({ start, end }) => `${start}-${end}`)

test('returns the whole day when no attendee has bookings', () => {
  assert.deepEqual(times(findFreeSlots([[], []], 30)), ['09:00-18:00'])
})

test('returns no slots when the whole day is booked', () => {
  assert.deepEqual(findFreeSlots([[{ start: '08:00', end: '19:00' }]], 15), [])
})

test('unions one attendee booking inside another', () => {
  const bookings = [[{ start: '10:00', end: '12:00' }, { start: '10:30', end: '11:00' }]]
  assert.deepEqual(times(findFreeSlots(bookings, 30)), ['09:00-10:00', '12:00-18:00'])
})

test('sorts unsorted attendee bookings before finding free time', () => {
  const bookings = [[{ start: '14:00', end: '15:00' }, { start: '10:00', end: '11:00' }]]
  assert.deepEqual(times(findFreeSlots(bookings, 30)), ['09:00-10:00', '11:00-14:00', '15:00-18:00'])
})

test('includes a gap exactly equal to the requested duration', () => {
  assert.deepEqual(times(findFreeSlots([[{ start: '09:30', end: '18:00' }]], 30)), ['09:00-09:30'])
})

test('matches the two attendee overlap acceptance scenario', () => {
  const a = [{ start: '10:00', end: '11:00' }, { start: '09:30', end: '10:30' }]
  const b = [{ start: '13:00', end: '14:00' }, { start: '13:15', end: '13:45' }]
  assert.deepEqual(times(findFreeSlots([a, b], 30)), ['09:00-09:30', '11:00-13:00', '14:00-18:00'])
})

test('scales to 30 attendees with 20 bookings each', () => {
  const attendees = Array.from({ length: 30 }, () => Array.from({ length: 20 }, (_, i) => {
    const start = 9 * 60 + i * 24
    const time = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    return { start: time(start), end: time(start + 10) }
  }))
  assert.doesNotThrow(() => findFreeSlots(attendees, 45))
})
