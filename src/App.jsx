import { useEffect, useMemo, useState } from "react";
import AdminDashboard from "./components/AdminDashboard";
import GuestDashboard from "./components/GuestDashboard";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  LogIn,
  LogOut,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  UserRound,
  UserRoundPlus,
  X,
} from "lucide-react";
import "./index.css";

const API = "http://localhost:8080/api";
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85";

function price(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function countNights(start, end) {
  if (!start || !end || end <= start) return 0;
  return Math.round(
    (new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000,
  );
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data.detail ||
        data.message ||
        (response.status === 401
          ? "Please log in to continue."
          : `Request failed (${response.status}).`),
    );
  }
  return data;
}

function App() {
  const [hotels, setHotels] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [hotelError, setHotelError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCity, setActiveCity] = useState("");
  const [sort, setSort] = useState("recommended");
  const [showDashboard, setShowDashboard] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("");
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [selectedHotel, setSelectedHotel] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    checkIn: "",
    checkOut: "",
    guests: "1",
  });
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingConfirmation, setBookingConfirmation] = useState(null);

  useEffect(() => {
    fetchHotels();
    loadCurrentUser();
  }, []);

  async function fetchHotels(city = "") {
    setLoadingHotels(true);
    setHotelError("");

    try {
      const query = city ? `?city=${encodeURIComponent(city)}` : "";
      const response = await fetch(`${API}/hotels${query}`);
      const data = await readResponse(response);

      if (!Array.isArray(data)) {
        throw new Error("Unexpected response from the hotel service.");
      }

      setHotels(data);
    } catch (error) {
      console.error(error);
      setHotelError(
        "Unable to load hotels. Check that Spring Boot and MongoDB are running.",
      );
    } finally {
      setLoadingHotels(false);
    }
  }

  async function loadCurrentUser() {
    setAuthLoading(true);

    try {
      const response = await fetch(`${API}/auth/me`, {
        credentials: "include",
      });
      if (!response.ok) {
        setUser(null);
        return;
      }

      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error("Session check failed:", error);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }

  const displayedHotels = useMemo(() => {
    const result = [...hotels];

    if (sort === "price-low") {
      result.sort(
        (a, b) => Number(a.pricePerNight || 0) - Number(b.pricePerNight || 0),
      );
    } else if (sort === "price-high") {
      result.sort(
        (a, b) => Number(b.pricePerNight || 0) - Number(a.pricePerNight || 0),
      );
    } else if (sort === "rating") {
      result.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    }

    return result;
  }, [hotels, sort]);

  function handleSearch(event) {
    event.preventDefault();
    const city = search.trim();
    setActiveCity(city);
    fetchHotels(city);
  }

  function clearSearch() {
    setSearch("");
    setActiveCity("");
    fetchHotels("");
  }

  function openAuth(mode) {
    setAuthMode(mode);
    setAuthForm({ name: "", email: "", password: "" });
    setAuthError("");
    setAuthMessage("");
  }

  function closeAuth() {
    if (authBusy) return;
    setAuthMode("");
    setAuthError("");
    setAuthMessage("");
  }

  async function handleAuth(event) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");

    try {
      const isRegister = authMode === "register";
      const payload = {
        email: authForm.email.trim(),
        password: authForm.password,
      };

      if (isRegister) {
        payload.name = authForm.name.trim();
      }

      const response = await fetch(
        `${API}/auth/${isRegister ? "register" : "login"}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await readResponse(response);

      if (isRegister) {
        setAuthMessage("Account created. You can now log in.");
        setAuthMode("login");
        setAuthForm({
          name: "",
          email: authForm.email.trim(),
          password: "",
        });
      } else {
        const meResponse = await fetch(`${API}/auth/me`, {
          credentials: "include",
        });

        const me = await readResponse(meResponse);
        setUser(me);
        setAuthMode("");
        setAuthForm({ name: "", email: "", password: "" });
        setAuthMessage("");
      }
    } catch (error) {
      setAuthError(error.message || "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Could not log out. Please try again.");
      }

      setUser(null);
      setShowDashboard(false);
      setShowAdminDashboard(false);
      setBookingConfirmation(null);
      setSelectedHotel(null);
      setAuthError("");
      setAuthMessage("You have logged out.");
    } catch (error) {
      setAuthError(error.message);
      setAuthMode("login");
    }
  }

  function openHotel(hotel) {
    setSelectedHotel(hotel);
    setBookingForm({ checkIn: "", checkOut: "", guests: "1" });
    setBookingError("");
    setBookingConfirmation(null);
  }

  function closeHotel() {
    if (bookingBusy) return;
    setSelectedHotel(null);
    setBookingError("");
    setBookingConfirmation(null);
  }

  function updateBooking(event) {
    const { name, value } = event.target;

    setBookingForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "checkIn" && current.checkOut && value >= current.checkOut
        ? { checkOut: "" }
        : {}),
    }));

    setBookingError("");
  }

  const nights = countNights(bookingForm.checkIn, bookingForm.checkOut);
  const total = selectedHotel
    ? Number(selectedHotel.pricePerNight || 0) * nights
    : 0;

  async function handleBooking(event) {
    event.preventDefault();
    setBookingError("");
    setBookingConfirmation(null);

    if (!user) {
      closeHotel();
      openAuth("login");
      setAuthError("Please log in before submitting a booking.");
      return;
    }

    if (!selectedHotel || bookingBusy) return;

    if (
      !bookingForm.checkIn ||
      bookingForm.checkIn < todayString() ||
      !bookingForm.checkOut ||
      bookingForm.checkOut <= bookingForm.checkIn
    ) {
      setBookingError("Choose valid check-in and check-out dates.");
      return;
    }

    setBookingBusy(true);

    try {
      const response = await fetch(`${API}/bookings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: selectedHotel.id,
          guestName: user.name,
          guestEmail: user.email,
          checkIn: bookingForm.checkIn,
          checkOut: bookingForm.checkOut,
          guests: Number(bookingForm.guests),
        }),
      });

      const data = await readResponse(response);
      setBookingConfirmation(data);
    } catch (error) {
      setBookingError(error.message || "Could not submit the booking request.");
    } finally {
      setBookingBusy(false);
    }
  }

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="#home">
          <span className="brand-icon">
            <BedDouble size={23} />
          </span>
          <span>
            Stay<span className="brand-accent">Scape</span>
          </span>
        </a>

        <nav className="nav-links">
          <a href="#hotels">Explore stays</a>
          <a href="#why-us">Why StayScape?</a>
        </nav>

        <div className="nav-account">
          {authLoading ? (
            <span className="account-loading">Checking session...</span>
          ) : user ? (
            <>
              <span className="user-chip">
                <UserRound size={16} />
                <span>{user.name}</span>
              </span>
              <button
                className="nav-action"
                onClick={() => {
                  setShowDashboard(true);
                  setShowAdminDashboard(false);
                }}
              >
                My Dashboard
              </button>
              {user.role === "ADMIN" && (
                <button
                  className="nav-action"
                  onClick={() => {
                    setShowAdminDashboard(true);
                    setShowDashboard(false);
                  }}
                >
                  Admin Panel
                </button>
              )}
              <button className="nav-action" onClick={handleLogout}>
                <LogOut size={15} /> Log out
              </button>
            </>
          ) : (
            <>
              <button className="nav-login" onClick={() => openAuth("login")}>
                <LogIn size={16} /> Log in
              </button>
              <button
                className="nav-action"
                onClick={() => openAuth("register")}
              >
                <UserRoundPlus size={16} /> Sign up
              </button>
            </>
          )}
        </div>
      </header>
      {showAdminDashboard && user?.role === "ADMIN" ? (
        <AdminDashboard onBack={() => setShowAdminDashboard(false)} />
      ) : showDashboard && user ? (
        <GuestDashboard user={user} onBack={() => setShowDashboard(false)} />
      ) : (
        <main id="home">
          <section className="hero">
            <div className="hero-overlay" />
            <div className="hero-content">
              <span className="eyebrow">YOUR NEXT ADVENTURE STARTS HERE</span>
              <h1>
                Find your place
                <br />
                <span>in the world.</span>
              </h1>
              <p className="hero-description">
                From peaceful mountain escapes to vibrant city stays, discover a
                place worth travelling for.
              </p>

              <form className="search-box" onSubmit={handleSearch}>
                <div className="search-field">
                  <MapPin size={21} />
                  <div className="search-input-wrap">
                    <label htmlFor="city-search">Destination</label>
                    <input
                      id="city-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Which city?"
                    />
                  </div>
                </div>
                <button className="search-button" type="submit">
                  <Search size={18} /> Search hotels
                </button>
              </form>

              <div className="hero-note">
                <span className="note-dot" />
                Find a stay that makes every journey memorable
              </div>
            </div>
            <div className="hero-caption">
              <span>CURATED STAYS</span>
              <span>UNFORGETTABLE EXPERIENCES</span>
            </div>
          </section>

          <section className="hotel-section" id="hotels">
            <div className="section-heading">
              <div>
                <span className="eyebrow dark-eyebrow">
                  EXPLORE OUR COLLECTION
                </span>
                <h2>
                  Find your perfect stay<span>.</span>
                </h2>
                <p className="section-description">
                  Discover hotels and plan your next getaway.
                </p>
              </div>
              <div className="sort-control">
                <SlidersHorizontal size={17} />
                <label htmlFor="sort-hotels">Sort by</label>
                <select
                  id="sort-hotels"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="recommended">Recommended</option>
                  <option value="rating">Highest rated</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
              </div>
            </div>

            {activeCity && (
              <div className="search-summary">
                <span>
                  Results for <strong>{activeCity}</strong>
                </span>
                <button className="clear-search" onClick={clearSearch}>
                  Clear search <X size={14} />
                </button>
              </div>
            )}

            {loadingHotels ? (
              <div className="status-panel">
                <div className="spinner" />
                <h3>Finding your next stay...</h3>
              </div>
            ) : hotelError ? (
              <div className="status-panel">
                <h3>Hotels are temporarily unavailable</h3>
                <p>{hotelError}</p>
                <button
                  className="primary-button"
                  onClick={() => fetchHotels(activeCity)}
                >
                  Try again
                </button>
              </div>
            ) : displayedHotels.length === 0 ? (
              <div className="status-panel">
                <Search size={32} />
                <h3>No hotels found</h3>
                <p>Try another city or display all hotels.</p>
                <button className="primary-button" onClick={clearSearch}>
                  Show all hotels
                </button>
              </div>
            ) : (
              <>
                <div className="results-count">
                  {displayedHotels.length} stays to explore
                </div>
                <div className="hotel-grid">
                  {displayedHotels.map((hotel) => (
                    <article className="hotel-card" key={hotel.id}>
                      <button
                        className="hotel-image-button"
                        onClick={() => openHotel(hotel)}
                        aria-label={`View ${hotel.name}`}
                      >
                        <img
                          className="hotel-image"
                          src={hotel.imageUrl || DEFAULT_IMAGE}
                          alt={hotel.name}
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = DEFAULT_IMAGE;
                          }}
                        />
                        <span className="image-label">STAYSCAPE PICK</span>
                      </button>
                      <div className="hotel-card-body">
                        <div className="hotel-location">
                          <MapPin size={14} />
                          {hotel.city}
                        </div>
                        <div className="hotel-title-row">
                          <h3>{hotel.name}</h3>
                          <span className="rating">
                            <Star size={15} fill="currentColor" />
                            {Number(hotel.rating || 0).toFixed(1)}
                          </span>
                        </div>
                        <p className="hotel-description">
                          {hotel.description ||
                            "A comfortable place for your next getaway."}
                        </p>
                        <div className="hotel-card-footer">
                          <div className="price">
                            <strong>{price(hotel.pricePerNight)}</strong>
                            <span>/ night</span>
                          </div>
                          <button
                            className="details-button"
                            onClick={() => openHotel(hotel)}
                          >
                            View & book <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="why-section" id="why-us">
            <span className="eyebrow">THE STAYSCAPE DIFFERENCE</span>
            <h2>Travel well. Stay better.</h2>
            <div className="benefit-grid">
              <article className="benefit">
                <span className="benefit-number">01</span>
                <h3>Discover new places</h3>
                <p>Explore our collection of hotels for your next trip.</p>
              </article>
              <article className="benefit">
                <span className="benefit-number">02</span>
                <h3>Know your price</h3>
                <p>
                  See the estimated price before submitting a booking request.
                </p>
              </article>
              <article className="benefit">
                <span className="benefit-number">03</span>
                <h3>Book with an account</h3>
                <p>Sign in to submit a reservation request.</p>
              </article>
            </div>
          </section>
        </main>
      )}

      <footer className="footer">
        <a className="brand footer-brand" href="#home">
          <span className="brand-icon">
            <BedDouble size={21} />
          </span>
          <span>
            Stay<span className="brand-accent">Scape</span>
          </span>
        </a>
        <p>Find a stay. Make a memory.</p>
        <span>© {new Date().getFullYear()} StayScape</span>
      </footer>

      {authMode && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAuth();
          }}
        >
          <section
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
          >
            <button
              className="modal-close"
              onClick={closeAuth}
              disabled={authBusy}
              aria-label="Close"
            >
              <X size={22} />
            </button>
            <div className="auth-brand-icon">
              <BedDouble size={27} />
            </div>
            <span className="eyebrow dark-eyebrow">WELCOME TO STAYSCAPE</span>
            <h2 id="auth-title">
              {authMode === "register" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="auth-description">
              {authMode === "register"
                ? "Create an account to start planning your next stay."
                : "Log in to submit bookings and access your account."}
            </p>

            <form className="booking-form" onSubmit={handleAuth}>
              {authMode === "register" && (
                <div className="form-field">
                  <label htmlFor="auth-name">Full name</label>
                  <input
                    id="auth-name"
                    value={authForm.name}
                    onChange={(event) =>
                      setAuthForm({ ...authForm, name: event.target.value })
                    }
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    required
                    placeholder="Your name"
                  />
                </div>
              )}
              <div className="form-field">
                <label htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  type="email"
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm({ ...authForm, email: event.target.value })
                  }
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder="you@example.com"
                />
              </div>
              <div className="form-field">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm({ ...authForm, password: event.target.value })
                  }
                  autoComplete={
                    authMode === "register"
                      ? "new-password"
                      : "current-password"
                  }
                  minLength={authMode === "register" ? 8 : undefined}
                  maxLength={72}
                  required
                  placeholder={
                    authMode === "register"
                      ? "At least 8 characters"
                      : "Your password"
                  }
                />
              </div>

              {authError && (
                <p className="form-error" role="alert">
                  {authError}
                </p>
              )}
              {authMessage && (
                <p className="form-success" role="status">
                  {authMessage}
                </p>
              )}

              <button
                className="primary-button booking-submit"
                disabled={authBusy}
                type="submit"
              >
                {authBusy
                  ? "Please wait..."
                  : authMode === "register"
                    ? "Create account"
                    : "Log in"}
                {!authBusy && <ArrowRight size={17} />}
              </button>
            </form>

            <p className="auth-switch">
              {authMode === "register"
                ? "Already have an account?"
                : "New to StayScape?"}
              <button
                onClick={() =>
                  openAuth(authMode === "register" ? "login" : "register")
                }
                disabled={authBusy}
              >
                {authMode === "register" ? "Log in" : "Create an account"}
              </button>
            </p>
          </section>
        </div>
      )}

      {selectedHotel && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeHotel();
          }}
        >
          <section
            className="hotel-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hotel-modal-title"
          >
            <button
              className="modal-close"
              onClick={closeHotel}
              disabled={bookingBusy}
              aria-label="Close"
            >
              <X size={22} />
            </button>
            <img
              className="modal-image"
              src={selectedHotel.imageUrl || DEFAULT_IMAGE}
              alt={selectedHotel.name}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = DEFAULT_IMAGE;
              }}
            />
            <div className="modal-content">
              {bookingConfirmation ? (
                <div className="confirmation-panel">
                  <span className="confirmation-icon">
                    <CheckCircle2 size={34} />
                  </span>
                  <span className="eyebrow dark-eyebrow">
                    REQUEST SUBMITTED
                  </span>
                  <h2>Thank you!</h2>
                  <p>
                    Your booking request for{" "}
                    <strong>{selectedHotel.name}</strong> was saved.
                  </p>
                  <div className="confirmation-details">
                    <div>
                      <span>Booking reference</span>
                      <strong>{bookingConfirmation.id || "Saved"}</strong>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong>{bookingConfirmation.status || "PENDING"}</strong>
                    </div>
                    <div>
                      <span>Check-in</span>
                      <strong>{bookingForm.checkIn}</strong>
                    </div>
                    <div>
                      <span>Check-out</span>
                      <strong>{bookingForm.checkOut}</strong>
                    </div>
                    <div>
                      <span>Estimated total</span>
                      <strong>{price(total)}</strong>
                    </div>
                  </div>
                  <p className="booking-note">
                    This is a pending reservation request, not a paid or
                    confirmed booking.
                  </p>
                  <button
                    className="primary-button booking-submit"
                    onClick={() => {
                      setSelectedHotel(null);
                      setBookingConfirmation(null);
                    }}
                  >
                    Continue exploring
                  </button>
                </div>
              ) : (
                <>
                  <div className="hotel-location">
                    <MapPin size={15} />
                    {selectedHotel.city}
                  </div>
                  <div className="modal-title-row">
                    <h2 id="hotel-modal-title">{selectedHotel.name}</h2>
                    <span className="rating">
                      <Star size={15} fill="currentColor" />
                      {Number(selectedHotel.rating || 0).toFixed(1)}
                    </span>
                  </div>
                  <p className="modal-description">
                    {selectedHotel.description ||
                      "Enjoy a comfortable stay at this property."}
                  </p>
                  <p className="address-row">
                    <MapPin size={16} />
                    {selectedHotel.address || "Address not available"}
                  </p>
                  <div className="modal-price">
                    <div className="price">
                      <strong>{price(selectedHotel.pricePerNight)}</strong>
                      <span>/ night</span>
                    </div>
                    <span className="secure-note">
                      <ShieldCheck size={15} /> Booking request
                    </span>
                  </div>

                  {!user ? (
                    <div className="login-required">
                      <h3>Log in to book this stay</h3>
                      <p>
                        Your account is required to submit a reservation
                        request.
                      </p>
                      <button
                        className="primary-button booking-submit"
                        onClick={() => {
                          setSelectedHotel(null);
                          openAuth("login");
                        }}
                      >
                        Log in to continue <ArrowRight size={17} />
                      </button>
                    </div>
                  ) : (
                    <form className="booking-form" onSubmit={handleBooking}>
                      <h3>Reserve your stay</h3>
                      <div className="signed-in-note">
                        <UserRound size={16} />
                        Booking as <strong>{user.name}</strong> ({user.email})
                      </div>
                      <div className="booking-date-grid">
                        <div className="form-field">
                          <label htmlFor="checkIn">
                            <CalendarDays size={14} /> Check-in
                          </label>
                          <input
                            id="checkIn"
                            name="checkIn"
                            type="date"
                            min={todayString()}
                            required
                            value={bookingForm.checkIn}
                            onChange={updateBooking}
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor="checkOut">
                            <CalendarDays size={14} /> Check-out
                          </label>
                          <input
                            id="checkOut"
                            name="checkOut"
                            type="date"
                            min={bookingForm.checkIn || todayString()}
                            required
                            value={bookingForm.checkOut}
                            onChange={updateBooking}
                          />
                        </div>
                      </div>
                      <div className="form-field">
                        <label htmlFor="guests">Number of guests</label>
                        <select
                          id="guests"
                          name="guests"
                          value={bookingForm.guests}
                          onChange={updateBooking}
                        >
                          {Array.from({ length: 20 }, (_, i) => i + 1).map(
                            (n) => (
                              <option key={n} value={String(n)}>
                                {n} {n === 1 ? "guest" : "guests"}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                      {nights > 0 && (
                        <div className="total-summary">
                          <div>
                            <span>
                              {price(selectedHotel.pricePerNight)} × {nights}{" "}
                              {nights === 1 ? "night" : "nights"}
                            </span>
                            <strong>Estimated total</strong>
                          </div>
                          <strong className="total-price">
                            {price(total)}
                          </strong>
                        </div>
                      )}
                      {bookingError && (
                        <p className="form-error" role="alert">
                          {bookingError}
                        </p>
                      )}
                      <button
                        className="primary-button booking-submit"
                        disabled={bookingBusy}
                        type="submit"
                      >
                        {bookingBusy
                          ? "Submitting request..."
                          : "Submit booking request"}{" "}
                        <ArrowRight size={17} />
                      </button>
                      <p className="booking-note">
                        Payment and final reservation confirmation are not
                        included.
                      </p>
                    </form>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
