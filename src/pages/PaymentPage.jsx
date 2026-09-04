import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import { Smartphone } from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const TOKEN_KEY = "qrib_access_token";

export default function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [booking, setBooking] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!bookingId) {
      setError("Booking information is missing.");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const bookingRes = await fetch(`${API_URL}/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const bookingData = await bookingRes.json();
        if (!bookingRes.ok) throw new Error(bookingData.error || "Booking not found.");
        const nextBooking = bookingData.booking || bookingData;
        if (!cancelled) setBooking(nextBooking);

        const propRes = await fetch(`${API_URL}/properties/${nextBooking.property_id}`);
        const propData = await propRes.json();
        if (!propRes.ok) throw new Error(propData.error || "Property not found.");
        if (!cancelled) setProperty(propData.property || propData);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load payment details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [bookingId, navigate]);

  const amount = useMemo(() => {
    if (!property) return 0;
    return Number(property.price_per_month || 0);
  }, [property]);

  const handlePay = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    setPaying(true);

    try {
      if (!/^((\+?254)|0)?[17]\d{8}$/.test(phone.replace(/\s|-/g, ""))) {
        throw new Error("Enter a valid Kenyan M-Pesa number, for example 0712345678.");
      }

      const initRes = await fetch(`${API_URL}/payments/mpesa/stk-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          booking_id: Number(bookingId),
          phone,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || "Payment initiation failed.");

      const paymentId = initData.payment?.id;
      showToast("M-Pesa prompt sent. Enter your PIN on your phone.", "success");
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const statusRes = await fetch(`${API_URL}/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const statusData = await statusRes.json();
        const status = statusData.payment?.status;
        if (status === "successful") {
          setPaid(true);
          showToast("M-Pesa payment successful.", "success");
          return;
        }
        if (status === "failed" || status === "cancelled") {
          throw new Error(statusData.payment?.gateway_response || "M-Pesa payment was not completed.");
        }
      }
      throw new Error("Payment is still pending. Check your M-Pesa phone and try again later.");
    } catch (err) {
      showToast(err.message || "Payment failed. Please try again.", "error");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link to="/search" className="text-sm font-semibold text-blue-600 hover:underline">
          ← Back to listings
        </Link>

        {loading ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="mt-4 text-slate-600">Loading payment details...</p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8">
            <h1 className="text-2xl font-black text-red-700">Payment setup failed</h1>
            <p className="mt-2 text-red-600">{error}</p>
            <Link to="/search" className="mt-6 inline-block rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white">
              Browse listings
            </Link>
          </div>
        ) : paid ? (
          // ── SUCCESS STATE ──
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="mt-6 text-3xl font-black text-slate-900">Payment Confirmed!</h1>
            <p className="mt-3 text-slate-500">
              Your payment of <span className="font-bold text-slate-800">KSh {amount.toLocaleString()}</span> has been received.
            </p>
            {property && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
                <p className="font-bold text-slate-900">{property.title}</p>
                <p className="text-sm text-slate-500 mt-1">{property.area}, {property.city}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Booking ID</span>
                  <span className="font-bold text-slate-800">#{bookingId}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Amount paid</span>
                  <span className="font-bold text-emerald-700">KSh {amount.toLocaleString()}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Paid</span>
                </div>
              </div>
            )}

            {/* What happens next */}
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5 text-left">
              <p className="text-sm font-black text-blue-900 mb-3">What happens next</p>
              <ol className="space-y-2 text-sm text-blue-800">
                <li className="flex gap-2"><span className="font-bold">1.</span> The host has been notified of your payment.</li>
                <li className="flex gap-2"><span className="font-bold">2.</span> Contact the host via chat to arrange move-in details and key collection.</li>
                <li className="flex gap-2"><span className="font-bold">3.</span> After moving in, leave a review to help other students.</li>
              </ol>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate("/student/dashboard")}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                Go to dashboard
              </button>
              <Link
                to={`/messages`}
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Message host
              </Link>
            </div>
          </div>
        ) : (
          // ── PAYMENT FORM ──
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-4 w-4" /></div>
              <div className="h-px flex-1 bg-blue-200" />
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-4 w-4" /></div>
              <div className="h-px flex-1 bg-blue-200" />
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">3</div>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">Step 3 of 3</p>
            <h1 className="text-2xl font-black text-slate-900">Complete payment</h1>
            <p className="mt-2 text-slate-500">Choose your payment method and confirm.</p>

            {/* Order summary */}
            <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Order summary</p>
              {property && (
                <>
                  <p className="font-bold text-slate-900">{property.title}</p>
                  <p className="text-sm text-slate-500">{property.area}, {property.city}</p>
                </>
              )}
              <div className="mt-4 border-t border-slate-200 pt-4 flex items-center justify-between">
                <span className="text-sm text-slate-500">Booking ID</span>
                <span className="text-sm font-bold text-slate-800">#{bookingId}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-slate-500">Student</span>
                <span className="text-sm font-bold text-slate-800">{user?.name}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-bold text-slate-900">Total due</span>
                <span className="text-2xl font-black text-slate-900">KSh {amount.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="mt-6">
              <p className="text-sm font-bold text-slate-900 mb-3">Payment method</p>
              <div className="grid grid-cols-3 gap-3">
                {[{ id: "mpesa", label: "M-Pesa" }].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`rounded-xl border p-4 text-center transition ${
                      paymentMethod === method.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <Smartphone className="mx-auto h-7 w-7 text-emerald-600" />
                    <p className={`mt-1 text-xs font-bold ${paymentMethod === method.id ? "text-blue-700" : "text-slate-700"}`}>
                      {method.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-5 block text-sm font-bold text-slate-900">
              M-Pesa phone number
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="0712345678"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
              />
            </label>

            {/* Sandbox notice */}
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              <span className="font-bold">Sandbox:</span> Daraja will send an M-Pesa test prompt. Payment is confirmed only after Safaricom’s callback.
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handlePay}
                disabled={paying}
                className="flex-1 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {paying ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Processing payment...
                  </>
                ) : `Pay KSh ${amount.toLocaleString()}`}
              </button>
              <button
                onClick={() => navigate("/student/dashboard")}
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Pay later
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
