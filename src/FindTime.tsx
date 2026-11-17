import { useEffect, useMemo, useRef, useState } from 'react'
import { findFreeSlots, type BusyBlock, type FreeSlot } from './findFreeSlots'

type PersonBooking = BusyBlock & { id: string; title: string; attendees: string[] }
type Person = { email: string; name: string; initials: string; color: string }
type Room = { id: string; name: string; capacity: number; color: string; initials: string }
type SuggestedBooking = { roomId: string; date: string; title: string; start: string; end: string; attendees: string[] }
type Props = {
  people: Person[]
  rooms: Room[]
  getPeopleBookings: (emails: string[], date: string) => Promise<PersonBooking[]>
  bookSuggestedSlot: (booking: SuggestedBooking) => Promise<unknown>
}

const DAY_START = 9 * 60
const DAY_LENGTH = 9 * 60
const DEFAULT_DATE = new Date().toISOString().slice(0, 10)
const minute = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
const percent = (time: string) => ((minute(time) - DAY_START) / DAY_LENGTH) * 100

function splitOverlapIntoLanes(bookings: PersonBooking[]) {
  const sorted = [...bookings].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))
  const laneEnds: number[] = []
  const positioned = sorted.map((booking) => {
    const start = Math.max(DAY_START, minute(booking.start))
    const end = Math.min(DAY_START + DAY_LENGTH, minute(booking.end))
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = end
    return { booking, lane, start, end }
  }).filter(({ start, end }) => start < end)
  return { positioned, laneCount: Math.max(1, laneEnds.length) }
}

export default function FindTime({ people, rooms, getPeopleBookings, bookSuggestedSlot }: Props) {
  const [date, setDate] = useState(DEFAULT_DATE)
  const [duration, setDuration] = useState(30)
  const [selectedPeople, setSelectedPeople] = useState<string[]>(people.slice(0, 2).map((person) => person.email))
  const [bookings, setBookings] = useState<PersonBooking[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeSlot, setActiveSlot] = useState<FreeSlot | null>(null)
  const [meetingTitle, setMeetingTitle] = useState('Team sync')
  const [bookingError, setBookingError] = useState('')
  const [booking, setBooking] = useState(false)
  const requestVersion = useRef(0)
  const slots = useMemo(() => {
    const perPerson = selectedPeople.map((email) => bookings.filter((item) => item.attendees.includes(email)))
    return selectedPeople.length ? findFreeSlots(perPerson, duration) : []
  }, [bookings, duration, selectedPeople])
  const activeSlotIndex = slots.length ? selectedIndex % slots.length : 0

  useEffect(() => {
    let timer: number | undefined
    let mounted = true
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      const version = ++requestVersion.current
      setLoading(true)
      setLoadError('')
      getPeopleBookings(selectedPeople, date).then((result) => {
        if (mounted && version === requestVersion.current) setBookings(result)
      }).catch((error: unknown) => {
        if (mounted && version === requestVersion.current) setLoadError(error instanceof Error ? error.message : 'Could not load availability.')
      }).finally(() => {
        if (mounted && version === requestVersion.current) setLoading(false)
      })
    }
    const restartTimer = () => {
      if (timer !== undefined) window.clearInterval(timer)
      timer = undefined
      if (document.visibilityState === 'visible') {
        refresh()
        timer = window.setInterval(refresh, 10_000)
      } else {
        requestVersion.current++
        setLoading(false)
      }
    }
    restartTimer()
    document.addEventListener('visibilitychange', restartTimer)
    return () => {
      mounted = false
      if (timer !== undefined) window.clearInterval(timer)
      document.removeEventListener('visibilitychange', restartTimer)
    }
  }, [date, getPeopleBookings, selectedPeople])

  function togglePerson(email: string) {
    setSelectedPeople((current) => current.includes(email) ? current.filter((item) => item !== email) : [...current, email])
  }

  function selectSlot(slot: FreeSlot) {
    setActiveSlot(slot)
    setBookingError('')
  }

  function handleSlotKeys(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!slots.length) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex((activeSlotIndex + 1) % slots.length)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex((activeSlotIndex - 1 + slots.length) % slots.length)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectSlot(slots[activeSlotIndex])
    }
  }

  async function confirmBooking(event: React.FormEvent) {
    event.preventDefault()
    if (!activeSlot) return
    const room = rooms.filter((item) => item.capacity >= selectedPeople.length).sort((a, b) => a.capacity - b.capacity)[0]
    if (!room) { setBookingError('There is no room large enough for this group.'); return }
    setBooking(true)
    setBookingError('')
    try {
      await bookSuggestedSlot({ roomId: room.id, date, title: meetingTitle.trim() || 'Team meeting', start: activeSlot.start, end: activeSlot.end, attendees: selectedPeople })
      setActiveSlot(null)
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'This time was just booked. Availability has been refreshed.')
      try {
        const version = requestVersion.current
        const refreshed = await getPeopleBookings(selectedPeople, date)
        if (version === requestVersion.current) setBookings(refreshed)
      } catch { /* Keep the last known availability visible. */ }
    } finally {
      setBooking(false)
    }
  }

  return <>
    <div className="breadcrumb"><span>Workspace</span><span className="crumb-divider">/</span><span>Planner</span><span className="crumb-divider">/</span><strong>Find a time</strong></div>
    <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> THE WHOLE TEAM, IN SYNC</div><h1>Find a time</h1><p className="page-subtitle">See when everyone’s free and make it a moment together.</p></div><span className="planner-live"><i/> Live availability</span></section>
    <section className="planner-controls"><div className="planner-control"><label htmlFor="planner-date">MEETING DATE</label><input id="planner-date" type="date" value={date} onChange={(event) => setDate(event.target.value)}/></div><div className="planner-control duration-control"><label htmlFor="meeting-length">MEETING LENGTH</label><select id="meeting-length" value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[15, 30, 45, 60, 90, 120, 180, 240].map((value) => <option key={value} value={value}>{value < 60 ? `${value} minutes` : `${value / 60} ${value === 60 ? 'hour' : 'hours'}`}</option>)}</select></div><div className="planner-control people-count"><label>PEOPLE INCLUDED</label><strong>{selectedPeople.length} selected</strong></div></section>
    <section className="planner-card"><div className="planner-sidebar"><div className="people-heading"><div><h2>Your people</h2><p>Who should be there?</p></div><span>{selectedPeople.length}/{people.length}</span></div><div className="people-list">{people.map((person) => <label className={`person-option ${selectedPeople.includes(person.email) ? 'checked' : ''}`} key={person.email}><input type="checkbox" checked={selectedPeople.includes(person.email)} onChange={() => togglePerson(person.email)}/><span className={`person-avatar ${person.color}`}>{person.initials}</span><span className="person-text"><strong>{person.name}</strong><small>{person.email}</small></span><span className="check-mark">✓</span></label>)}</div><div className="selection-tip"><span>✦</span> Pick at least one person to find a time that works.</div></div>
      <div className="planner-timeline"><div className="timeline-title"><div><h2>Everyone’s availability</h2><p>{new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} <span>·</span> 09:00–18:00</p></div><span className={`refresh-indicator ${loading ? 'refreshing' : ''}`} aria-live="polite">{loading ? 'Updating…' : '↻ Updated just now'}</span></div>
        <div className="time-ruler"><span>LOCAL TIME</span><div className="ruler-track"><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span></div></div>
        {loadError && <div className="planner-error" role="alert">{loadError}</div>}
        <div className="attendee-timelines">{selectedPeople.map((email) => { const person = people.find((item) => item.email === email)!; const personBookings = bookings.filter((item) => item.attendees.includes(email)); const { positioned, laneCount } = splitOverlapIntoLanes(personBookings); return <div className="attendee-timeline" key={email} style={{ height: `${Math.max(54, 30 + laneCount * 21)}px` }}><div className="timeline-person"><span className={`person-avatar tiny ${person.color}`}>{person.initials}</span><span>{person.name}</span></div><div className="timeline-track">{[25, 50, 75].map((at) => <i className="gridline" key={at} style={{ left: `${at}%` }} />)}{positioned.map(({ booking: item, lane, start, end }) => <span key={item.id} className="busy-block" title={`${person.name}: ${item.title}, ${item.start}–${item.end}`} style={{ left: `${((start - DAY_START) / DAY_LENGTH) * 100}%`, width: `${((end - start) / DAY_LENGTH) * 100}%`, top: `${8 + lane * 20}px` }}>{item.title}</span>)}</div></div> })}</div>
        <div className="common-availability"><div className="common-label"><span className="common-dot"/><span>Everyone free</span><small>{slots.length} {slots.length === 1 ? 'time' : 'times'} found</small></div><div className="common-track" role="listbox" tabIndex={0} aria-label="Common free time slots. Use arrow keys to move and Enter to book." onKeyDown={handleSlotKeys}>{[25, 50, 75].map((at) => <i className="gridline" key={at} style={{ left: `${at}%` }} />)}{slots.map((slot, index) => <button key={slot.start} tabIndex={-1} role="option" aria-selected={index === activeSlotIndex} aria-label={`Free ${slot.start} to ${slot.end}`} title={`Free ${slot.start} to ${slot.end} · click to book`} className={`free-slot ${index === activeSlotIndex ? 'focused-slot' : ''}`} style={{ left: `${percent(slot.start)}%`, width: `${((slot.endMinute - slot.startMinute) / DAY_LENGTH) * 100}%` }} onFocus={() => setSelectedIndex(index)} onClick={() => selectSlot(slot)}><span>✦ &nbsp;{slot.start}–{slot.end}</span></button>)}</div></div>
        <div className="planner-bottom"><span>{!selectedPeople.length ? 'Choose people to see common availability.' : slots.length ? 'Select a free slot to book a room for everyone.' : 'No common openings meet this meeting length.'}</span><span>Availability refreshes every 10 seconds</span></div>
        <div className="sr-only" aria-live="polite">{slots.length ? `Free times: ${slots.map((slot) => `Free ${slot.start} to ${slot.end}`).join(', ')}` : 'No free times found.'}</div>
      </div></section>
    {activeSlot && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !booking) setActiveSlot(null) }}><section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="suggested-booking-title"><div className="modal-heading"><div><span className="modal-eyebrow">A TIME THAT WORKS FOR EVERYONE</span><h2 id="suggested-booking-title">Book this time</h2></div><button className="close-modal" aria-label="Close" onClick={() => setActiveSlot(null)}>×</button></div><p className="modal-subtitle">{activeSlot.start}–{activeSlot.end} · {new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p><form onSubmit={confirmBooking}><label className="field-label" htmlFor="suggested-title">Meeting title</label><input id="suggested-title" className="form-input" value={meetingTitle} onChange={(event) => setMeetingTitle(event.target.value)} autoFocus/><div className="form-context"><span className="room-icon tiny lavender">✳</span><span>{selectedPeople.length} attendees</span><span>Room for {selectedPeople.length}</span></div>{bookingError && <div className="api-error" role="alert">{bookingError}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setActiveSlot(null)} disabled={booking}>Cancel</button><button type="submit" className="primary-button" disabled={booking}>{booking ? 'Booking…' : 'Confirm booking →'}</button></div></form></section></div>}
  </>
}
