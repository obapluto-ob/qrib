import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const TOKEN_KEY = "qrib_access_token";

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

export default function BookingConfirmation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [listing, setListing] = useState(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [error, setError] = useState("");
  const [moveInDate, setMoveInDate] = useState(addDays(14));

  // Only load the property — do NOT auto-submit booking
  useEffect(() => {
    if (!id) {
      setError("No property selected.");
      setLoadingListing(false);
      return;
    }

    fetch(`${API_URL}/properties/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setListing(data.property || data);
      })
      .catch((err) => setError(err.message || "Could not load property."))
      .finally(() => setLoadingListing(false));
  }, [id]);

  const handleConfirmBooking = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const today = addDays(0);
    if (!moveInDate || moveInDate < today) {
      showToast("Please select a valid move-in date (today or later).", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          property_id: Number(id),
          student_id: Number(user.id),
          move_in_date: moveInDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed.");

      const booking = data.booking || data;
      setBookingId(booking.id);
      setBooked(true);
      showToast("Booking request submitted successfully!", "success");
    } catch (err) {
      showToast(err.message || "Booking failed. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-2xl px-6 py-16">
        {loadingListing ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="mt-4 text-slate-600">Loading property details...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
            <h1 className="text-2xl font-black text-red-700">Something went wrong</h1>
            <p className="mt-2 text-red-600">{error}</p>
            <Link to="/search" className="mt-6 inline-block rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white">
              Browse listings
            </Link>
          </div>
        ) : booked ? (
          // ── SUCCESS STATE ──
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="mt-6 text-3xl font-black text-slate-900">Booking Request Sent!</h1>
            <p className="mt-3 text-slate-500">
              Hi {user?.name?.split(" ")[0] || "there"}, your request has been sent to the host. You'll be notified once they respond.
            </p>

            {listing && (
              <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
                <p className="font-bold text-slate-900">{listing.title}</p>
                <p className="mt-1 text-sm text-slate-500">{listing.area}, {listing.city}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Move-in date</span>
                  <span className="text-sm font-bold text-slate-800">{moveInDate}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Monthly rent</span>
                  <span className="text-sm font-bold text-slate-800">KSh {Number(listing.price_per_month || 0).toLocaleString()}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Status</span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">Pending host approval</span>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate(`/payment/${bookingId}`)}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                Continue to payment
              </button>
              <Link
                to="/student/dashboard"
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Go to dashboard
              </Link>
            </div>
          </div>
        ) : (
          // ── CONFIRMATION STEP ──
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">1</div>
              <div className="h-px flex-1 bg-slate-200" />
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500">2</div>
              <div className="h-px flex-1 bg-slate-200" />
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500">3</div>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">Step 1 of 3</p>
            <h1 className="text-2xl font-black text-slate-900">Confirm your booking</h1>
            <p className="mt-2 text-slate-500">Review the details below before submitting your request to the host.</p>

            {listing && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                {listing.image && (
                  <img src={listing.image} alt={listing.title} className="w-full h-40 object-cover rounded-lg mb-4" />
                )}
                <h2 className="font-bold text-slate-900 text-lg">{listing.title}</h2>
                <p className="text-sm text-slate-500 mt-1">{listing.area}, {listing.city}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                    <p className="text-slate-500">Monthly rent</p>
                    <p className="font-black text-slate-900 text-lg">KSh {Number(listing.price_per_month || 0).toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                    <p className="text-slate-500">Property type</p>
                    <p className="font-bold text-slate-900 capitalize">{listing.property_type || "Apartment"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Move-in date picker */}
            <div className="mt-6">
              <label className="block text-sm font-bold text-slate-900 mb-2">Preferred move-in date</label>
              <input
                type="date"
                value={moveInDate}
                min={addDays(0)}
                onChange={(e) => {
                  const val = e.target.value;
                  setMoveInDate(val < addDays(0) ? addDays(0) : val);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Logged-in check */}
            {!user && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                You need to <Link to="/login" className="font-bold underline">log in</Link> to confirm this booking.
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleConfirmBooking}
                disabled={submitting || !user}
                className="flex-1 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Submitting...
                  </>
                ) : "Confirm booking request"}
              </button>
              <Link
                to={`/property/${id}`}
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 text-center"
              >
                Back to property
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
