import { Footprints, MapPin } from "lucide-react";
import { getUniversity } from "../data/universities";

const WALKING_SPEED_KMH = 5;

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatWalkTime(minutes) {
  if (minutes < 1) return "< 1 min walk";
  if (minutes < 60) return `${Math.round(minutes)} min walk`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min walk` : `${h}h walk`;
}

function getWalkLabel(minutes) {
  if (minutes <= 10) return { text: "Very close", color: "bg-green-100 text-green-700 border-green-200" };
  if (minutes <= 20) return { text: "Close", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (minutes <= 40) return { text: "Moderate", color: "bg-yellow-100 text-yellow-700 border-yellow-200" };
  return { text: "Far", color: "bg-red-100 text-red-700 border-red-200" };
}

export default function WalkingTime({ universityId, propertyLat, propertyLng, compact = false }) {
  const uni = getUniversity(universityId);

  if (!uni?.gateLat || !propertyLat || !propertyLng) return null;

  const distKm = haversineKm(propertyLat, propertyLng, uni.gateLat, uni.gateLng);
  const minutes = (distKm / WALKING_SPEED_KMH) * 60;
  const label = getWalkLabel(minutes);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${label.color}`}>
        <Footprints className="h-3 w-3" />
        {formatWalkTime(minutes)}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${label.color}`}>
      <Footprints className="h-5 w-5 shrink-0" />
      <div>
        <p className="text-sm font-extrabold">{formatWalkTime(minutes)} to {uni.name} gate</p>
        <p className="text-xs font-medium opacity-80">{distKm.toFixed(2)} km · {label.text}</p>
      </div>
      <MapPin className="ml-auto h-4 w-4 shrink-0 opacity-50" />
    </div>
  );
}
