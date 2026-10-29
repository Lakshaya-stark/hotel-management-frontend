import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";
import "./GuestDashboard.css";

const API = "http://localhost:8080/api";

function formatDate(value) {
  if (!value) return "—";

  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function canCancel(booking) {
  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return (
    ["PENDING", "CONFIRMED"].includes(booking.status) &&
    booking.checkIn > todayString
  );
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || data.message || `Request failed (${response.status})`,
    );
  }

  return data;
}

export default function GuestDashboard({ user, onBack }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  async function loadBookings() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/bookings`, {
        credentials: "include",
      });

      const data = await parseResponse(response);
      setBookings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function cancelBooking(booking) {
    if (!canCancel(booking)) return;

    const confirmed = window.confirm(
      `Cancel your booking at ${booking.hotelName}?`,
    );

    if (!confirmed) return;

    setCancellingId(booking.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API}/bookings/${booking.id}/cancel`, {
        method: "PATCH",
        credentials: "include",
      });

      const updated = await parseResponse(response);

      setBookings((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );

      setNotice("Your booking has been cancelled.");
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  const total = bookings.length;
  const pending = bookings.filter(
    (booking) => booking.status === "PENDING",
  ).length;
  const confirmed = bookings.filter(
    (booking) => booking.status === "CONFIRMED",
  ).length;
  const cancelled = bookings.filter(
    (booking) => booking.status === "CANCELLED",
  ).length;

  return (
    <main className="guest-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-topbar">
          <button className="dashboard-back" onClick={onBack}>
            <ArrowLeft size={17} /> Back to hotels
          </button>

          <button
            className="dashboard-refresh"
            onClick={loadBookings}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="dashboard-heading">
          <span className="dashboard-eyebrow">YOUR PERSONAL SPACE</span>

          <h1>
            My Dashboard<span>.</span>
          </h1>

          <p>
            Welcome back, <strong>{user.name}</strong>. Manage your stays and
            keep track of your reservations.
          </p>
        </div>

        <div className="dashboard-stats">
          <div className="dashboard-stat">
            <CalendarDays size={23} />
            <span>Total bookings</span>
            <strong>{total}</strong>
          </div>

          <div className="dashboard-stat">
            <Clock3 size={23} />
            <span>Pending</span>
            <strong>{pending}</strong>
          </div>

          <div className="dashboard-stat">
            <CheckCircle2 size={23} />
            <span>Confirmed</span>
            <strong>{confirmed}</strong>
          </div>

          <div className="dashboard-stat">
            <XCircle size={23} />
            <span>Cancelled</span>
            <strong>{cancelled}</strong>
          </div>
        </div>

        <div className="dashboard-section-heading">
          <div>
            <h2>Your reservations</h2>
            <p>Review the details of your hotel bookings.</p>
          </div>
        </div>

        {error && (
          <div className="dashboard-alert dashboard-error" role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div className="dashboard-alert dashboard-success" role="status">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="dashboard-empty">
            <RefreshCw className="dashboard-spinning" size={27} />
            <h3>Loading your bookings...</h3>
          </div>
        ) : bookings.length === 0 ? (
          <div className="dashboard-empty">
            <CalendarDays size={35} />
            <h3>No bookings yet</h3>
            <p>
              Your reservations will appear here once you book your first stay.
            </p>
            <button className="dashboard-primary" onClick={onBack}>
              Explore hotels
            </button>
          </div>
        ) : (
          <div className="dashboard-booking-list">
            {bookings.map((booking) => (
              <article className="dashboard-booking" key={booking.id}>
                <div className="dashboard-booking-header">
                  <div>
                    <span className="dashboard-booking-label">
                      HOTEL RESERVATION
                    </span>
                    <h3>{booking.hotelName}</h3>
                  </div>

                  <span
                    className={`dashboard-status status-${String(
                      booking.status,
                    ).toLowerCase()}`}
                  >
                    {booking.status}
                  </span>
                </div>

                <div className="dashboard-booking-details">
                  <div>
                    <CalendarDays size={17} />
                    <span>
                      Check-in
                      <strong>{formatDate(booking.checkIn)}</strong>
                    </span>
                  </div>

                  <div>
                    <CalendarDays size={17} />
                    <span>
                      Check-out
                      <strong>{formatDate(booking.checkOut)}</strong>
                    </span>
                  </div>

                  <div>
                    <Users size={17} />
                    <span>
                      Guests
                      <strong>{booking.guests}</strong>
                    </span>
                  </div>

                  <div>
                    <MapPin size={17} />
                    <span>
                      Total price
                      <strong>{formatPrice(booking.totalPrice)}</strong>
                    </span>
                  </div>
                </div>

                <div className="dashboard-booking-footer">
                  <span className="dashboard-reference">
                    Booking ID: {booking.id}
                  </span>

                  {canCancel(booking) && (
                    <button
                      className="dashboard-cancel"
                      disabled={cancellingId === booking.id}
                      onClick={() => cancelBooking(booking)}
                    >
                      {cancellingId === booking.id
                        ? "Cancelling..."
                        : "Cancel booking"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
