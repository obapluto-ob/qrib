import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const { showToast } = useToast();

  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="text-red-600 font-bold text-lg">Invalid reset link.</p>
          <Link to="/login" className="mt-4 inline-block text-blue-600 font-semibold hover:underline">Back to login</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { showToast("Password must be at least 6 characters.", "error"); return; }
    if (password !== confirm) { showToast("Passwords do not match.", "error"); return; }
    setLoading(true);
    const result = await resetPassword({ token, newPassword: password });
    setLoading(false);
    if (!result.ok) { showToast(result.message || "Reset failed.", "error"); return; }
    setDone(true);
    showToast("Password updated! You can now log in.", "success");
    setTimeout(() => navigate("/login"), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-white">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-extrabold text-xl text-slate-900">Qrib</span>
        </Link>

        {done ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="font-extrabold text-emerald-800 text-xl">Password updated!</p>
            <p className="mt-2 text-sm text-emerald-700">Redirecting you to login...</p>
          </div>
        ) : (
          <>
            <h1 className="font-extrabold text-3xl text-slate-900">Set new password</h1>
            <p className="mt-2 text-slate-500 text-sm">Choose a strong password for your Qrib account.</p>

            <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min. 6 characters)"
                className="w-full border border-slate-200 rounded-xl p-3.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="w-full border border-slate-200 rounded-xl p-3.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-4 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>

            <Link to="/login" className="mt-5 block text-center text-sm text-slate-400 hover:text-slate-600">
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
