import test from 'node:test'
import assert from 'node:assert/strict'
import { overlaps } from './bookingRules.mjs'

const existing = [{ start: '10:00', end: '10:30' }]
const hourBooking = [{ start: '10:00', end: '11:00' }]

test('blocks partial and covering overlaps', () => {
  assert.equal(overlaps('10:15', '11:00', existing), true)
  assert.equal(overlaps('09:00', '12:00', existing), true)
})

test('allows back-to-back bookings', () => {
  assert.equal(overlaps('10:30', '11:00', existing), false)
  assert.equal(overlaps('09:00', '10:00', [{ start: '10:00', end: '11:00' }]), false)
})

test('matches the 10:00 to 11:00 acceptance scenario', () => {
  assert.equal(overlaps('10:30', '11:30', hourBooking), true)
  assert.equal(overlaps('11:00', '12:00', hourBooking), false)
})
