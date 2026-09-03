import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import { CheckCircle, Clock, AlertCircle, Upload, ArrowRight, Shield, Star, Zap } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

const STEPS = [
  { id: 1, label: "Personal Info" },
  { id: 2, label: "Document Upload" },
  { id: 3, label: "Review & Submit" },
];

export default function HostVerification() {
  const { user, getToken } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    id_number: "",
    document_url: "",
  });

  useEffect(() => {
    if (!getToken() || user?.role !== "host") {
      setLoading(false);
      return;
    }
    fetchStatus();
  }, [user]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/host-verification/me`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVerification(data);
        // Pre-fill form if data exists
        if (data.id_number) {
          setForm((f) => ({ ...f, id_number: data.id_number, document_url: data.document_url || "" }));
        }
      }
    } catch (err) {
      console.error("Error fetching verification:", err);
    } finally {
      setLoading(false);
    }
  };

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleNextStep = () => {
    if (step === 1) {
      if (!form.full_name.trim()) { showToast("Please enter your full name.", "error"); return; }
      if (!form.phone.trim()) { showToast("Please enter your phone number.", "error"); return; }
      if (!form.id_number.trim() || form.id_number.trim().length < 5) {
        showToast("Please enter a valid ID number (at least 5 characters).", "error"); return;
      }
    }
    if (step === 2) {
      if (!form.document_url.trim() || !form.document_url.startsWith("http")) {
        showToast("Please enter a valid document URL starting with http.", "error"); return;
      }
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/host-verification`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_number: form.id_number.trim(),
          document_url: form.document_url.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed.");

      showToast("Verification submitted successfully!", "success");
      await fetchStatus();
      navigate("/host/verification");
    } catch (err) {
      showToast(err.message || "Submission failed. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── ACCESS GUARD ──
  if (!user || user.role !== "host") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <AlertCircle className="mx-auto h-14 w-14 text-amber-500 mb-4" />
          <h1 className="text-2xl font-black text-slate-900">Hosts only</h1>
          <p className="mt-2 text-slate-500">This page is only accessible to host accounts.</p>
          <Link to="/" className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
            Go home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        </div>
        <Footer />
      </div>
    );
  }

  // ── ALREADY APPROVED ──
  if (verification?.verified) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-lg px-6 py-20 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="mt-6 text-3xl font-black text-slate-900">You're Verified!</h1>
          <p className="mt-3 text-slate-500">Your host account is fully verified. You can now list unlimited properties.</p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { icon: <Shield className="h-5 w-5 text-blue-600" />, label: "Verified badge" },
              { icon: <Star className="h-5 w-5 text-amber-500" />, label: "Higher visibility" },
              { icon: <Zap className="h-5 w-5 text-emerald-600" />, label: "Unlimited listings" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                <div className="flex justify-center mb-2">{item.icon}</div>
                <p className="text-xs font-bold text-slate-700">{item.label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate("/host/dashboard")}
            className="mt-8 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            Go to dashboard
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  // ── PENDING ──
  if (verification?.status === "pending") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-lg px-6 py-20 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="mt-6 text-3xl font-black text-slate-900">Under Review</h1>
          <p className="mt-3 text-slate-500">
            Your verification documents are being reviewed by our team. This usually takes 1–2 business days.
          </p>
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-left text-sm text-amber-800">
            <p className="font-bold mb-1">Submitted on</p>
            <p>{new Date(verification.created_at).toLocaleDateString("en-KE", { dateStyle: "long" })}</p>
          </div>
          <p className="mt-4 text-sm text-slate-500">You'll receive a notification once the review is complete.</p>
          <button
            onClick={() => navigate("/host/dashboard")}
            className="mt-8 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            Back to dashboard
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  // ── MULTI-STEP FORM ──
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-xl px-6 py-12">
        {/* Rejected banner */}
        {verification?.status === "rejected" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-900">Previous submission rejected</p>
              <p className="text-sm text-red-700 mt-1">{verification.notes || "Please resubmit with updated information."}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                  step > s.id ? "bg-emerald-500 text-white" :
                  step === s.id ? "bg-blue-600 text-white" :
                  "bg-slate-200 text-slate-500"
                }`}>
                  {step > s.id ? "✓" : s.id}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 transition ${step > s.id ? "bg-emerald-300" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">
            Step {step} of {STEPS.length} — {STEPS[step - 1].label}
          </p>

          {/* ── STEP 1: Personal Info ── */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-black text-slate-900">Personal information</h1>
              <p className="mt-2 text-slate-500">We need to verify your identity before you can list properties.</p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Full name</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={update("full_name")}
                    placeholder="As it appears on your ID"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Phone number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={update("phone")}
                    placeholder="+254 7XX XXX XXX"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">National ID number</label>
                  <input
                    type="text"
                    value={form.id_number}
                    onChange={update("id_number")}
                    placeholder="e.g. 12345678"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-slate-400">At least 5 characters</p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Document Upload ── */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-black text-slate-900">Upload your document</h1>
              <p className="mt-2 text-slate-500">Provide a URL to a clear photo of your national ID or passport.</p>

              <div className="mt-6">
                <label className="block text-sm font-bold text-slate-900 mb-2">Document URL</label>
                <input
                  type="url"
                  value={form.document_url}
                  onChange={update("document_url")}
                  placeholder="https://res.cloudinary.com/..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-bold text-blue-900 mb-2">How to get a document URL:</p>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Take a clear photo of your national ID (both sides)</li>
                  <li>Upload to <a href="https://cloudinary.com" target="_blank" rel="noreferrer" className="underline font-semibold">Cloudinary</a> (free) or Google Drive</li>
                  <li>Copy the direct image link</li>
                  <li>Paste it above</li>
                </ol>
              </div>

              {form.document_url && form.document_url.startsWith("http") && (
                <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden">
                  <img
                    src={form.document_url}
                    alt="Document preview"
                    className="w-full max-h-48 object-contain bg-slate-100"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                  <p className="text-xs text-slate-500 p-2 text-center">Document preview</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Review & Submit ── */}
          {step === 3 && (
            <div>
              <h1 className="text-2xl font-black text-slate-900">Review & submit</h1>
              <p className="mt-2 text-slate-500">Please confirm your details before submitting.</p>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-200">
                {[
                  { label: "Full name", value: form.full_name },
                  { label: "Phone", value: form.phone },
                  { label: "ID number", value: form.id_number },
                  { label: "Document", value: form.document_url ? "Uploaded ✓" : "Not provided" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-slate-500">{item.label}</span>
                    <span className="text-sm font-bold text-slate-800 max-w-[60%] text-right truncate">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                By submitting, you confirm that all information provided is accurate and belongs to you. False information may result in account suspension.
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={handleNextStep}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Submit verification
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-bold text-slate-900 mb-4">Why get verified?</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Shield className="h-5 w-5 text-blue-600" />, label: "Verified badge on profile" },
              { icon: <Star className="h-5 w-5 text-amber-500" />, label: "Higher search ranking" },
              { icon: <Zap className="h-5 w-5 text-emerald-600" />, label: "Unlimited listings" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 p-3 text-center">
                <div className="flex justify-center mb-2">{item.icon}</div>
                <p className="text-xs text-slate-600">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
