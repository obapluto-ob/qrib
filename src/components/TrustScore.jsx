import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldX, Shield } from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

const CONFIG = {
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: ShieldCheck },
  blue:    { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    icon: ShieldCheck },
  amber:   { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   icon: ShieldAlert },
  red:     { bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700",     icon: ShieldX },
};

// Compact badge for property cards
export function TrustBadge({ propertyId, score: initialScore, label: initialLabel, color: initialColor }) {
  const [data, setData] = useState(
    initialScore != null ? { score: initialScore, label: initialLabel, color: initialColor } : null
  );

  useEffect(() => {
    if (data || !propertyId) return;
    fetch(`${API_URL}/trust-score/${propertyId}`)
      .then((r) => r.json())
      .then((d) => setData({ score: d.score, label: d.label, color: d.color }))
      .catch(() => {});
  }, [propertyId]);

  if (!data) return null;

  const cfg = CONFIG[data.color] || CONFIG.blue;
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <Icon className="h-3 w-3" />
      {data.score}/100 · {data.label}
    </span>
  );
}

// Full breakdown panel for AccommodationDetails
export function TrustScorePanel({ propertyId }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!propertyId) return;
    fetch(`${API_URL}/trust-score/${propertyId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [propertyId]);

  if (!data) return null;

  const cfg = CONFIG[data.color] || CONFIG.blue;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.bg} border ${cfg.border}`}>
            <Icon className={`h-5 w-5 ${cfg.text}`} />
          </div>
          <div>
            <p className={`font-extrabold ${cfg.text}`}>{data.label}</p>
            <p className="text-xs text-slate-500">Trust score: {data.score}/100</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={data.color === "emerald" ? "#10b981" : data.color === "blue" ? "#3b82f6" : data.color === "amber" ? "#f59e0b" : "#ef4444"}
                strokeWidth="3"
                strokeDasharray={`${data.score} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-xs font-black ${cfg.text}`}>
              {data.score}
            </span>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className={`text-xs font-bold underline ${cfg.text}`}
          >
            {open ? "Hide" : "See why"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
          {data.breakdown.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className={item.points > 0 ? "text-slate-700" : "text-slate-400 line-through"}>
                {item.label}
              </span>
              <span className={`font-bold ${item.points > 0 ? cfg.text : "text-slate-300"}`}>
                {item.points > 0 ? `+${item.points}` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
