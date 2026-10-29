import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  CircleDollarSign,
  Clock,
  Hotel,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import "./AdminDashboard.css";

const API = "http://localhost:8080/api";

const emptyHotel = {
  name: "",
  description: "",
  city: "",
  address: "",
  pricePerNight: "",
  rating: "4.0",
  imageUrl: "",
  amenities: "",
};

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || data.message || `Request failed (${response.status})`,
    );
  }

  return data;
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function AdminDashboard({ onBack }) {
  const [stats, setStats] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [hotelForm, setHotelForm] = useState(emptyHotel);

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    return readResponse(response);
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [statsData, hotelsData, bookingsData] = await Promise.all([
        request("/admin/stats"),
        request("/admin/hotels"),
        request("/admin/bookings"),
      ]);

      setStats(statsData);
      setHotels(hotelsData);
      setBookings(bookingsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function startCreate() {
    setEditing("new");
    setHotelForm(emptyHotel);
    setError("");
    setNotice("");
  }

  function startEdit(hotel) {
    setEditing(hotel.id);
    setHotelForm({
      name: hotel.name || "",
      description: hotel.description || "",
      city: hotel.city || "",
      address: hotel.address || "",
      pricePerNight: String(hotel.pricePerNight ?? ""),
      rating: String(hotel.rating ?? 4),
      imageUrl: hotel.imageUrl || "",
      amenities: Array.isArray(hotel.amenities)
        ? hotel.amenities.join(", ")
        : "",
    });
    setError("");
    setNotice("");
  }

  async function saveHotel(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        name: hotelForm.name.trim(),
        description: hotelForm.description.trim(),
        city: hotelForm.city.trim(),
        address: hotelForm.address.trim(),
        pricePerNight: Number(hotelForm.pricePerNight),
        rating: Number(hotelForm.rating),
        imageUrl: hotelForm.imageUrl.trim(),
        amenities: hotelForm.amenities
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      if (
        !payload.name ||
        !payload.city ||
        !Number.isFinite(payload.pricePerNight) ||
        payload.pricePerNight <= 0 ||
        !Number.isFinite(payload.rating) ||
        payload.rating < 0 ||
        payload.rating > 5
      ) {
        throw new Error("Enter a valid name, city, price, and rating.");
      }

      if (editing === "new") {
        await request("/admin/hotels", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("Hotel created successfully.");
      } else {
        await request(`/admin/hotels/${editing}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("Hotel updated successfully.");
      }

      setEditing(null);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleHotel(hotel) {
    setError("");
    setNotice("");

    try {
      await request(`/admin/hotels/${hotel.id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ active: !hotel.active }),
      });

      setNotice(hotel.active ? "Hotel deactivated." : "Hotel activated.");

      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function reviewBooking(booking, status) {
    if (booking.status !== "PENDING") return;

    const action = status === "CONFIRMED" ? "confirm" : "reject";
    if (!window.confirm(`Are you sure you want to ${action} this booking?`)) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await request(`/admin/bookings/${booking.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setNotice(`Booking ${action}ed successfully.`);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-loading">
          <RefreshCw size={25} />
          Loading administration dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        <div className="admin-topbar">
          <button className="admin-secondary" onClick={onBack}>
            <ArrowLeft size={16} /> Back to StayScape
          </button>
          <span className="admin-label">
            <ShieldCheck size={15} /> ADMINISTRATION
          </span>
          <button className="admin-secondary" onClick={loadDashboard}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        <header className="admin-heading">
          <span className="admin-eyebrow">STAYSCAPE CONTROL CENTER</span>
          <h1>
            Admin Dashboard<span>.</span>
          </h1>
          <p>Manage hotel listings and review guest reservations.</p>
        </header>

        {error && <div className="admin-alert admin-alert-error">{error}</div>}
        {notice && (
          <div className="admin-alert admin-alert-success">{notice}</div>
        )}

        <nav className="admin-tabs">
          {[
            ["overview", "Overview"],
            ["hotels", "Hotels"],
            ["bookings", "Bookings"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={tab === value ? "admin-tab active" : "admin-tab"}
              onClick={() => {
                setTab(value);
                setEditing(null);
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "overview" && stats && (
          <>
            <div className="admin-stat-grid">
              <div className="admin-stat">
                <Hotel />
                <span>Total hotels</span>
                <strong>{stats.totalHotels}</strong>
              </div>
              <div className="admin-stat">
                <Building2 />
                <span>Active hotels</span>
                <strong>{stats.activeHotels}</strong>
              </div>
              <div className="admin-stat">
                <Clock />
                <span>Pending bookings</span>
                <strong>{stats.pendingBookings}</strong>
              </div>
              <div className="admin-stat">
                <CircleDollarSign />
                <span>Confirmed booking value</span>
                <strong>{money(stats.confirmedBookingValue)}</strong>
              </div>
            </div>

            <div className="admin-summary-grid">
              <div className="admin-summary-card">
                <h3>Booking overview</h3>
                <div>
                  <span>Total bookings</span>
                  <strong>{stats.totalBookings}</strong>
                </div>
                <div>
                  <span>Confirmed</span>
                  <strong>{stats.confirmedBookings}</strong>
                </div>
                <div>
                  <span>Cancelled</span>
                  <strong>{stats.cancelledBookings}</strong>
                </div>
                <div>
                  <span>Rejected</span>
                  <strong>{stats.rejectedBookings}</strong>
                </div>
              </div>

              <div className="admin-summary-card">
                <h3>Quick actions</h3>
                <p>
                  Manage your properties or review reservations awaiting
                  approval.
                </p>
                <button
                  className="admin-primary"
                  onClick={() => setTab("hotels")}
                >
                  <Hotel size={16} /> Manage hotels
                </button>
                <button
                  className="admin-secondary"
                  onClick={() => setTab("bookings")}
                >
                  Review bookings
                </button>
              </div>
            </div>
          </>
        )}

        {tab === "hotels" && (
          <section className="admin-section">
            <div className="admin-section-header">
              <div>
                <h2>Hotel management</h2>
                <p>Add, edit, or deactivate hotel listings.</p>
              </div>
              <button className="admin-primary" onClick={startCreate}>
                + Add hotel
              </button>
            </div>

            {editing !== null && (
              <form className="admin-hotel-form" onSubmit={saveHotel}>
                <div className="admin-form-heading">
                  <h3>{editing === "new" ? "Create hotel" : "Edit hotel"}</h3>
                  <button
                    type="button"
                    className="admin-icon-button"
                    onClick={() => setEditing(null)}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="admin-form-grid">
                  {[
                    ["name", "Hotel name", "text"],
                    ["city", "City", "text"],
                    ["address", "Address", "text"],
                    ["pricePerNight", "Price per night (₹)", "number"],
                    ["rating", "Rating (0–5)", "number"],
                    ["imageUrl", "Image URL", "url"],
                  ].map(([key, label, type]) => (
                    <label className="admin-field" key={key}>
                      {label}
                      <input
                        type={type}
                        required={[
                          "name",
                          "city",
                          "pricePerNight",
                          "rating",
                        ].includes(key)}
                        min={
                          type === "number"
                            ? key === "rating"
                              ? 0
                              : 1
                            : undefined
                        }
                        max={key === "rating" ? 5 : undefined}
                        step={type === "number" ? "any" : undefined}
                        value={hotelForm[key]}
                        onChange={(event) =>
                          setHotelForm({
                            ...hotelForm,
                            [key]: event.target.value,
                          })
                        }
                      />
                    </label>
                  ))}
                  <label className="admin-field admin-field-wide">
                    Description
                    <textarea
                      rows="3"
                      value={hotelForm.description}
                      onChange={(event) =>
                        setHotelForm({
                          ...hotelForm,
                          description: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="admin-field admin-field-wide">
                    Amenities (comma-separated)
                    <input
                      value={hotelForm.amenities}
                      onChange={(event) =>
                        setHotelForm({
                          ...hotelForm,
                          amenities: event.target.value,
                        })
                      }
                      placeholder="Wi-Fi, Pool, Parking"
                    />
                  </label>
                </div>

                <button className="admin-primary" disabled={busy}>
                  {busy ? "Saving..." : "Save hotel"}
                </button>
              </form>
            )}

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Hotel</th>
                    <th>City</th>
                    <th>Price/night</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hotels.map((hotel) => (
                    <tr key={hotel.id}>
                      <td>
                        <strong>{hotel.name}</strong>
                      </td>
                      <td>{hotel.city}</td>
                      <td>{money(hotel.pricePerNight)}</td>
                      <td>
                        <span
                          className={
                            hotel.active
                              ? "admin-pill active"
                              : "admin-pill inactive"
                          }
                        >
                          {hotel.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            className="admin-small-button"
                            onClick={() => startEdit(hotel)}
                          >
                            Edit
                          </button>
                          <button
                            className="admin-small-button"
                            onClick={() => toggleHotel(hotel)}
                          >
                            {hotel.active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "bookings" && (
          <section className="admin-section">
            <div className="admin-section-header">
              <div>
                <h2>Booking management</h2>
                <p>Approve or reject pending reservation requests.</p>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Guest</th>
                    <th>Hotel</th>
                    <th>Dates</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <strong>{booking.guestName}</strong>
                        <small>{booking.guestEmail}</small>
                      </td>
                      <td>{booking.hotelName}</td>
                      <td>
                        {booking.checkIn}
                        <small>to {booking.checkOut}</small>
                      </td>
                      <td>{money(booking.totalPrice)}</td>
                      <td>
                        <span
                          className={`admin-pill ${String(booking.status).toLowerCase()}`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td>
                        {booking.status === "PENDING" ? (
                          <div className="admin-row-actions">
                            <button
                              className="admin-approve"
                              title="Confirm booking"
                              onClick={() =>
                                reviewBooking(booking, "CONFIRMED")
                              }
                            >
                              <Check size={15} />
                            </button>
                            <button
                              className="admin-reject"
                              title="Reject booking"
                              onClick={() => reviewBooking(booking, "REJECTED")}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {bookings.length === 0 && (
              <p className="admin-empty">No booking requests found.</p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
