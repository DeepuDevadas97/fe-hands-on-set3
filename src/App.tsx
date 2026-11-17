import { useEffect, useMemo, useState } from "react";
import FindTime from "./FindTime";
import { overlaps } from "./bookingRules.mjs";
import "./App.css";

type Room = {
    id: string;
    name: string;
    floor: string;
    capacity: number;
    color: string;
    initials: string;
};
type Booking = {
    id: string;
    roomId: string;
    date: string;
    title: string;
    start: string;
    end: string;
    attendees: string[];
};
const rooms: Room[] = [
    {
        id: "atlas",
        name: "Atlas",
        floor: "Floor 4 · East wing",
        capacity: 8,
        color: "lavender",
        initials: "A",
    },
    {
        id: "cedar",
        name: "Cedar",
        floor: "Floor 2 · North wing",
        capacity: 6,
        color: "mint",
        initials: "C",
    },
    {
        id: "studio",
        name: "The Studio",
        floor: "Floor 1 · South wing",
        capacity: 12,
        color: "peach",
        initials: "S",
    },
];
const today = new Date().toISOString().slice(0, 10);
const seed: Booking[] = [
    {
        id: "b1",
        roomId: "atlas",
        date: today,
        title: "Product design sync",
        start: "10:00",
        end: "11:00",
        attendees: ["maya@acme.co", "leo@acme.co"],
    },
    {
        id: "b2",
        roomId: "atlas",
        date: today,
        title: "Weekly team stand-up",
        start: "13:00",
        end: "13:45",
        attendees: ["alex@acme.co", "maya@acme.co", "sam@acme.co"],
    },
    {
        id: "b3",
        roomId: "atlas",
        date: today,
        title: "Q4 planning session",
        start: "15:00",
        end: "16:30",
        attendees: ["leo@acme.co", "sam@acme.co"],
    },
    {
        id: "b4",
        roomId: "cedar",
        date: today,
        title: "Customer interview",
        start: "09:30",
        end: "10:30",
        attendees: ["alex@acme.co"],
    },
    {
        id: "b5",
        roomId: "cedar",
        date: today,
        title: "Research review",
        start: "14:00",
        end: "15:00",
        attendees: ["maya@acme.co"],
    },
    {
        id: "b6",
        roomId: "studio",
        date: today,
        title: "Creative workshop",
        start: "11:00",
        end: "12:30",
        attendees: ["sam@acme.co", "leo@acme.co"],
    },
];
const people = [
    {
        email: "alex@acme.co",
        name: "Alex Morgan",
        initials: "AM",
        color: "lilac",
    },
    {
        email: "maya@acme.co",
        name: "Maya Chen",
        initials: "MC",
        color: "green",
    },
    { email: "leo@acme.co", name: "Leo Patel", initials: "LP", color: "peach" },
    { email: "sam@acme.co", name: "Sam Rivera", initials: "SR", color: "blue" },
];
let mockBookings = [...seed];
const wait = () =>
    new Promise((resolve) =>
        window.setTimeout(resolve, 300 + Math.random() * 500),
    );
const api = {
    async list(roomId: string, date: string) {
        await wait();
        return mockBookings
            .filter(
                (booking) => booking.roomId === roomId && booking.date === date,
            )
            .sort((a, b) => a.start.localeCompare(b.start));
    },
    async listPeople(emails: string[], date: string) {
        await wait();
        const selected = new Set(emails);
        return mockBookings.filter(
            (booking) =>
                booking.date === date &&
                booking.attendees.some((email) => selected.has(email)),
        );
    },
    async createSuggested(booking: Omit<Booking, "id">) {
        await wait();
        if (Math.random() < 0.2)
            throw new Error(
                "Conflict: someone just booked this time. Availability has been refreshed.",
            );
        if (
            overlaps(
                booking.start,
                booking.end,
                mockBookings.filter(
                    (item) =>
                        item.roomId === booking.roomId &&
                        item.date === booking.date,
                ),
            )
        )
            throw new Error(
                "Conflict: this room is no longer available at that time. Availability has been refreshed.",
            );
        const created = { ...booking, id: crypto.randomUUID() };
        mockBookings = [...mockBookings, created];
        return created;
    },
    async create(booking: Omit<Booking, "id">) {
        await wait();
        if (
            overlaps(
                booking.start,
                booking.end,
                mockBookings.filter(
                    (item) =>
                        item.roomId === booking.roomId &&
                        item.date === booking.date,
                ),
            )
        )
            throw new Error(
                "This room was just booked for part of that time. Please choose another slot.",
            );
        if (Math.random() < 0.1)
            throw new Error(
                "The booking service could not save this meeting. Please try again.",
            );
        const created = { ...booking, id: crypto.randomUUID() };
        mockBookings = [...mockBookings, created];
        return created;
    },
    async cancel(id: string) {
        await wait();
        if (Math.random() < 0.1)
            throw new Error(
                "The booking service could not cancel this meeting. Please try again.",
            );
        mockBookings = mockBookings.filter((item) => item.id !== id);
    },
};
const times = Array.from(
    { length: 37 },
    (_, i) =>
        `${String(9 + Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`,
);
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function formattedDate(date: string) {
    return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
}
function App() {
    const [activePage, setActivePage] = useState<"rooms" | "find-time">(
        "rooms",
    );
    const params = new URLSearchParams(window.location.search);
    const [roomId, setRoomId] = useState(
        rooms.some((room) => room.id === params.get("room"))
            ? params.get("room")!
            : rooms[0].id,
    );
    const [date, setDate] = useState(params.get("date") || today);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loadedKey, setLoadedKey] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [start, setStart] = useState("11:00");
    const [end, setEnd] = useState("12:00");
    const [attendees, setAttendees] = useState([""]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState("");
    const [saving, setSaving] = useState(false);
    const [cancelError, setCancelError] = useState("");
    const [cancelling, setCancelling] = useState<string[]>([]);
    const room = rooms.find((item) => item.id === roomId)!;
    const loading = loadedKey !== `${roomId}:${date}`;

    useEffect(() => {
        const query = new URLSearchParams({ room: roomId, date });
        window.history.replaceState(
            {},
            "",
            `${window.location.pathname}?${query.toString()}`,
        );
        let alive = true;
        api.list(roomId, date).then((items) => {
            if (alive) {
                setBookings(items);
                setLoadedKey(`${roomId}:${date}`);
            }
        });
        return () => {
            alive = false;
        };
    }, [roomId, date]);

    const occupiedMinutes = useMemo(
        () =>
            bookings.reduce((total, booking) => {
                const [sh, sm] = booking.start.split(":").map(Number);
                const [eh, em] = booking.end.split(":").map(Number);
                return total + eh * 60 + em - sh * 60 - sm;
            }, 0),
        [bookings],
    );
    function changeDate(next: string) {
        if (next) setDate(next);
    }
    function updateAttendee(index: number, value: string) {
        setAttendees((items) =>
            items.map((item, i) => (i === index ? value : item)),
        );
    }
    function validate() {
        const next: Record<string, string> = {};
        const startM = Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
        const endM = Number(end.slice(0, 2)) * 60 + Number(end.slice(3));
        const clean = attendees.map((email) => email.trim()).filter(Boolean);
        if (!title.trim()) next.title = "Add a title for your meeting.";
        if (startM < 540 || endM > 1080)
            next.time = "Choose a time between 09:00 and 18:00.";
        else if (startM >= endM)
            next.time = "End time must be after start time.";
        else if (endM - startM > 240)
            next.time = "Meetings can be up to 4 hours long.";
        else if (startM % 15 !== 0 || endM % 15 !== 0)
            next.time = "Choose times in 15-minute steps.";
        if (
            attendees.some(
                (email) => email.trim() && !validEmail.test(email.trim()),
            )
        )
            next.attendees = "Enter a valid email address for each attendee.";
        if (
            new Set(clean.map((email) => email.toLowerCase())).size !==
            clean.length
        )
            next.attendees = "Each attendee email must be unique.";
        if (clean.length === 0) next.attendees = "Add at least one attendee.";
        if (!next.time && overlaps(start, end, bookings))
            next.time =
                "This time overlaps another booking. Back-to-back meetings are okay.";
        setErrors(next);
        return Object.keys(next).length === 0;
    }
    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setApiError("");
        if (!validate()) return;
        setSaving(true);
        try {
            const created = await api.create({
                roomId,
                date,
                title: title.trim(),
                start,
                end,
                attendees: attendees.map((item) => item.trim()).filter(Boolean),
            });
            setBookings((items) =>
                [...items, created].sort((a, b) =>
                    a.start.localeCompare(b.start),
                ),
            );
            setFormOpen(false);
            setTitle("");
            setAttendees([""]);
            setErrors({});
        } catch (error) {
            setApiError(
                error instanceof Error
                    ? error.message
                    : "Could not create this booking.",
            );
        } finally {
            setSaving(false);
        }
    }
    async function cancel(booking: Booking) {
        if (
            !window.confirm(
                `Cancel “${booking.title}” from ${booking.start} to ${booking.end}?`,
            )
        )
            return;
        const before = bookings;
        setCancelError("");
        setBookings((items) => items.filter((item) => item.id !== booking.id));
        setCancelling((ids) => [...ids, booking.id]);
        try {
            await api.cancel(booking.id);
        } catch (error) {
            setBookings(before.sort((a, b) => a.start.localeCompare(b.start)));
            setCancelError(
                error instanceof Error
                    ? error.message
                    : "Could not cancel this booking.",
            );
        } finally {
            setCancelling((ids) => ids.filter((id) => id !== booking.id));
        }
    }
    function openForm() {
        setFormOpen(true);
        setApiError("");
        setErrors({});
        setStart("11:00");
        setEnd("12:00");
    }

    return (
        <div className="app-shell">
            <header className="topbar">
                <a className="brand" href="#home" aria-label="Gather home">
                    <span className="brand-mark">g</span>
                    <span>
                        gather<span className="brand-dot">.</span>
                    </span>
                </a>
                <nav className="main-nav">
                    <button
                        className={`nav-link ${activePage === "rooms" ? "active" : ""}`}
                        onClick={() => setActivePage("rooms")}
                    >
                        Rooms
                    </button>
                    <button
                        className={`nav-link ${activePage === "find-time" ? "active" : ""}`}
                        onClick={() => setActivePage("find-time")}
                    >
                        Find a time
                    </button>
                </nav>
                <div className="profile">
                    <span className="profile-status" />
                    <span className="avatar avatar-purple">JD</span>
                    <span className="profile-name">Jordan Davis</span>
                    <span className="chevron">⌄</span>
                </div>
            </header>
            <main className="page">
                {activePage === "find-time" ? (
                    <FindTime
                        people={people}
                        rooms={rooms}
                        getPeopleBookings={api.listPeople}
                        bookSuggestedSlot={api.createSuggested}
                    />
                ) : (
                    <>
                        <div className="breadcrumb">
                            <span>Workspace</span>
                            <span className="crumb-divider">/</span>
                            <span>Rooms</span>
                            <span className="crumb-divider">/</span>
                            <strong>Room schedule</strong>
                        </div>
                        <section className="page-heading">
                            <div>
                                <div className="eyebrow">
                                    <span className="eyebrow-line" /> YOUR
                                    SPACE, TOGETHER
                                </div>
                                <h1>Room schedule</h1>
                                <p className="page-subtitle">
                                    Find a room, make it yours, and bring your
                                    team together.
                                </p>
                            </div>
                            <button
                                className="primary-button heading-button"
                                onClick={openForm}
                            >
                                <span className="plus">＋</span> Book a room
                            </button>
                        </section>
                        <section className="room-strip">
                            <div className="room-strip-label">
                                YOUR MEETING ROOMS{" "}
                                <span className="room-count">
                                    {rooms.length}
                                </span>
                            </div>
                            <div className="room-list">
                                {rooms.map((item) => (
                                    <button
                                        key={item.id}
                                        className={`room-card ${item.id === roomId ? "selected" : ""}`}
                                        onClick={() => setRoomId(item.id)}
                                    >
                                        <span
                                            className={`room-icon ${item.color}`}
                                        >
                                            {item.initials}
                                        </span>
                                        <span className="room-copy">
                                            <strong>{item.name}</strong>
                                            <small>{item.floor}</small>
                                        </span>
                                        <span className="room-capacity">
                                            <span className="people-icon">
                                                ♧
                                            </span>
                                            {item.capacity}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </section>
                        <div className="content-grid">
                            <section className="schedule-card">
                                <div className="schedule-header">
                                    <div className="schedule-room">
                                        <span
                                            className={`room-icon ${room.color}`}
                                        >
                                            {room.initials}
                                        </span>
                                        <div>
                                            <h2>{room.name}</h2>
                                            <p>
                                                {room.floor} <span>·</span> Up
                                                to {room.capacity} people
                                            </p>
                                        </div>
                                    </div>
                                    <div className="date-picker">
                                        <button
                                            aria-label="Previous day"
                                            onClick={() =>
                                                changeDate(
                                                    new Date(`${date}T12:00:00`)
                                                        .toISOString()
                                                        .slice(0, 10) === date
                                                        ? new Date(
                                                              new Date(
                                                                  `${date}T12:00:00`,
                                                              ).getTime() -
                                                                  86400000,
                                                          )
                                                              .toISOString()
                                                              .slice(0, 10)
                                                        : date,
                                                )
                                            }
                                        >
                                            ‹
                                        </button>
                                        <label>
                                            <span className="calendar-icon">
                                                ▦
                                            </span>
                                            <input
                                                aria-label="Schedule date"
                                                type="date"
                                                value={date}
                                                onChange={(event) =>
                                                    changeDate(
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </label>
                                        <button
                                            aria-label="Next day"
                                            onClick={() =>
                                                changeDate(
                                                    new Date(
                                                        new Date(
                                                            `${date}T12:00:00`,
                                                        ).getTime() + 86400000,
                                                    )
                                                        .toISOString()
                                                        .slice(0, 10),
                                                )
                                            }
                                        >
                                            ›
                                        </button>
                                    </div>
                                </div>
                                <div className="schedule-summary">
                                    <div>
                                        <strong>{formattedDate(date)}</strong>
                                        <span>
                                            {loading
                                                ? "Loading schedule…"
                                                : `${bookings.length} ${bookings.length === 1 ? "meeting" : "meetings"} scheduled`}
                                        </span>
                                    </div>
                                    <span className="timezone">
                                        ◷ &nbsp; GMT+5:30
                                    </span>
                                </div>
                                <div className="timeline">
                                    <div className="timeline-head">
                                        <span>TIME</span>
                                        <span>MEETING</span>
                                    </div>
                                    {loading ? (
                                        <div className="loading-state">
                                            <span className="spinner" /> Loading
                                            your room schedule
                                        </div>
                                    ) : bookings.length === 0 ? (
                                        <div className="empty-state">
                                            <span className="empty-icon">
                                                ✳
                                            </span>
                                            <strong>
                                                Nothing on the calendar yet
                                            </strong>
                                            <span>
                                                This room is free all day. Make
                                                it yours.
                                            </span>
                                            <button
                                                className="text-button"
                                                onClick={openForm}
                                            >
                                                Book this room <span>→</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="booking-list">
                                            {bookings.map((booking) => {
                                                const startMinutes =
                                                    Number(
                                                        booking.start.slice(
                                                            0,
                                                            2,
                                                        ),
                                                    ) *
                                                        60 +
                                                    Number(
                                                        booking.start.slice(3),
                                                    );
                                                const endMinutes =
                                                    Number(
                                                        booking.end.slice(0, 2),
                                                    ) *
                                                        60 +
                                                    Number(
                                                        booking.end.slice(3),
                                                    );
                                                const duration =
                                                    endMinutes - startMinutes;
                                                return (
                                                    <article
                                                        className="booking-row"
                                                        key={booking.id}
                                                    >
                                                        <div className="booking-time">
                                                            <strong>
                                                                {booking.start}
                                                            </strong>
                                                            <span>
                                                                {booking.end}
                                                            </span>
                                                        </div>
                                                        <div className="booking-bar">
                                                            <span className="booking-accent" />
                                                            <div className="booking-details">
                                                                <div className="booking-title-row">
                                                                    <strong>
                                                                        {
                                                                            booking.title
                                                                        }
                                                                    </strong>
                                                                    <span className="duration">
                                                                        {duration >=
                                                                        60
                                                                            ? `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}m` : ""}`
                                                                            : `${duration} min`}
                                                                    </span>
                                                                </div>
                                                                <div className="booking-meta">
                                                                    <span className="mini-avatars">
                                                                        {booking.attendees
                                                                            .slice(
                                                                                0,
                                                                                3,
                                                                            )
                                                                            .map(
                                                                                (
                                                                                    email,
                                                                                    i,
                                                                                ) => (
                                                                                    <span
                                                                                        key={
                                                                                            email
                                                                                        }
                                                                                        className={`mini-avatar tone-${i}`}
                                                                                    >
                                                                                        {email[0].toUpperCase()}
                                                                                    </span>
                                                                                ),
                                                                            )}
                                                                    </span>
                                                                    <span>
                                                                        {
                                                                            booking
                                                                                .attendees
                                                                                .length
                                                                        }{" "}
                                                                        {booking
                                                                            .attendees
                                                                            .length ===
                                                                        1
                                                                            ? "attendee"
                                                                            : "attendees"}
                                                                    </span>
                                                                    <button
                                                                        className="cancel-button"
                                                                        onClick={() =>
                                                                            cancel(
                                                                                booking,
                                                                            )
                                                                        }
                                                                        disabled={cancelling.includes(
                                                                            booking.id,
                                                                        )}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="schedule-footer">
                                    <div className="legend">
                                        <span className="legend-dot busy" />
                                        Booked{" "}
                                        <span className="legend-dot free" />
                                        Available
                                    </div>
                                    <span>
                                        {Math.floor(occupiedMinutes / 60)}h{" "}
                                        {String(occupiedMinutes % 60).padStart(
                                            2,
                                            "0",
                                        )}
                                        m booked today
                                    </span>
                                </div>
                            </section>
                            <aside className="side-column">
                                <section className="booking-panel">
                                    <div className="panel-topline">
                                        <span className="panel-icon">✳</span>
                                        <span className="panel-tag">
                                            QUICK BOOKING
                                        </span>
                                    </div>
                                    <h2>Make it happen.</h2>
                                    <p className="panel-description">
                                        A little time together can make a big
                                        difference.
                                    </p>
                                    <div className="panel-room">
                                        <span
                                            className={`room-icon small ${room.color}`}
                                        >
                                            {room.initials}
                                        </span>
                                        <span>
                                            <strong>{room.name}</strong>
                                            <small>{formattedDate(date)}</small>
                                        </span>
                                        <span className="panel-room-arrow">
                                            ⌄
                                        </span>
                                    </div>
                                    <div className="panel-stats">
                                        <div>
                                            <span>ROOM CAPACITY</span>
                                            <strong>
                                                ♧ &nbsp;{room.capacity} people
                                            </strong>
                                        </div>
                                        <div>
                                            <span>AVAILABLE HOURS</span>
                                            <strong>
                                                ◷ &nbsp;09:00 – 18:00
                                            </strong>
                                        </div>
                                    </div>
                                    <button
                                        className="primary-button full-button"
                                        onClick={openForm}
                                    >
                                        <span className="plus">＋</span> Book
                                        this room
                                    </button>
                                    <p className="panel-footnote">
                                        <span>✦</span> Meetings up to 4 hours
                                    </p>
                                </section>
                                <section className="tip-card">
                                    <div className="tip-sparkle">✳</div>
                                    <div>
                                        <strong>
                                            Make room for great ideas
                                        </strong>
                                        <p>
                                            Good things happen when you get in
                                            the same room.
                                        </p>
                                    </div>
                                </section>
                                <section className="availability-card">
                                    <span className="availability-icon">◷</span>
                                    <div>
                                        <strong>A little breathing room</strong>
                                        <p>
                                            Book 15 minutes between meetings to
                                            reset and recharge.
                                        </p>
                                    </div>
                                </section>
                            </aside>
                        </div>
                        <footer className="page-footer">
                            <span>
                                Made for moments that matter{" "}
                                <span className="footer-heart">♥</span>
                            </span>
                            <span>
                                Need a hand?{" "}
                                <a href="mailto:help@gather.example">
                                    We’re here to help
                                </a>
                            </span>
                        </footer>
                    </>
                )}
            </main>
            {formOpen && (
                <div
                    className="modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget)
                            setFormOpen(false);
                    }}
                >
                    <section
                        className="booking-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                    >
                        <div className="modal-heading">
                            <div>
                                <span className="modal-eyebrow">
                                    A GOOD THING STARTS HERE
                                </span>
                                <h2 id="modal-title">Book a room</h2>
                            </div>
                            <button
                                className="close-modal"
                                aria-label="Close"
                                onClick={() => setFormOpen(false)}
                            >
                                ×
                            </button>
                        </div>
                        <p className="modal-subtitle">
                            Bring everyone together in {room.name}.
                        </p>
                        <form onSubmit={submit} noValidate>
                            <label
                                className="field-label"
                                htmlFor="meeting-title"
                            >
                                Meeting title
                            </label>
                            <input
                                id="meeting-title"
                                className={`form-input ${errors.title ? "invalid" : ""}`}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Product brainstorm"
                            />
                            {errors.title && (
                                <span className="field-error">
                                    {errors.title}
                                </span>
                            )}
                            <div className="time-fields">
                                <div>
                                    <label
                                        className="field-label"
                                        htmlFor="start-time"
                                    >
                                        Starts
                                    </label>
                                    <select
                                        id="start-time"
                                        className={`form-input ${errors.time ? "invalid" : ""}`}
                                        value={start}
                                        onChange={(e) =>
                                            setStart(e.target.value)
                                        }
                                    >
                                        {times.slice(0, -1).map((time) => (
                                            <option key={time}>{time}</option>
                                        ))}
                                    </select>
                                </div>
                                <span className="time-separator">to</span>
                                <div>
                                    <label
                                        className="field-label"
                                        htmlFor="end-time"
                                    >
                                        Ends
                                    </label>
                                    <select
                                        id="end-time"
                                        className={`form-input ${errors.time ? "invalid" : ""}`}
                                        value={end}
                                        onChange={(e) => setEnd(e.target.value)}
                                    >
                                        {times.slice(1).map((time) => (
                                            <option key={time}>{time}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {errors.time && (
                                <span className="field-error">
                                    {errors.time}
                                </span>
                            )}
                            <div className="attendee-heading">
                                <label
                                    className="field-label"
                                    htmlFor="attendee-0"
                                >
                                    Attendees
                                </label>
                                <span>Up to 8</span>
                            </div>
                            {attendees.map((email, index) => (
                                <div className="attendee-input-row" key={index}>
                                    <input
                                        id={`attendee-${index}`}
                                        className={`form-input ${errors.attendees ? "invalid" : ""}`}
                                        type="email"
                                        value={email}
                                        onChange={(e) =>
                                            updateAttendee(
                                                index,
                                                e.target.value,
                                            )
                                        }
                                        placeholder="name@company.com"
                                    />
                                    {attendees.length > 1 && (
                                        <button
                                            type="button"
                                            className="remove-attendee"
                                            aria-label="Remove attendee"
                                            onClick={() =>
                                                setAttendees((items) =>
                                                    items.filter(
                                                        (_, i) => i !== index,
                                                    ),
                                                )
                                            }
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                            {errors.attendees && (
                                <span className="field-error">
                                    {errors.attendees}
                                </span>
                            )}
                            {attendees.length < 8 && (
                                <button
                                    type="button"
                                    className="add-attendee"
                                    onClick={() =>
                                        setAttendees((items) => [...items, ""])
                                    }
                                >
                                    ＋ Add an attendee
                                </button>
                            )}
                            <div className="form-context">
                                <span
                                    className={`room-icon tiny ${room.color}`}
                                >
                                    {room.initials}
                                </span>
                                <span>
                                    {room.name} · {formattedDate(date)}
                                </span>
                                <span>09:00–18:00</span>
                            </div>
                            {apiError && (
                                <div className="api-error" role="alert">
                                    {apiError}
                                </div>
                            )}
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => setFormOpen(false)}
                                >
                                    Not now
                                </button>
                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <span className="spinner light" />{" "}
                                            Saving…
                                        </>
                                    ) : (
                                        "Confirm booking →"
                                    )}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
            {cancelError && (
                <div className="toast-error" role="alert">
                    <span>!</span>
                    {cancelError}
                    <button
                        onClick={() => setCancelError("")}
                        aria-label="Dismiss error"
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
}
export default App;
