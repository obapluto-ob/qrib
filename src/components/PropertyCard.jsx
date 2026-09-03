import { Link } from "react-router-dom";
import { CalendarDays, ShieldCheck, Star } from "lucide-react";
import { getUniversity } from "../data/universities";
import WalkingTime from "./WalkingTime";
import { TrustBadge } from "./TrustScore";

const fallbackImage =
  "https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&q=80";

function getSafeImageUrl(imageUrl) {
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    return fallbackImage;
  }

  const trimmed = imageUrl.trim();

  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }

  return trimmed;
}

export default function PropertyCard({ listing, affordability }) {
  const uni = getUniversity(listing.universityId);
  const imageSrc = getSafeImageUrl(listing.image);

  return (
    <Link
      to={`/property/${listing.id}`}
      className="group block w-full overflow-hidden rounded-xl border border-line transition hover:shadow-lg"
    >
      <div className="relative h-[220px] overflow-hidden">
        <img
          src={imageSrc}
          alt={listing.title}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = fallbackImage;
          }}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />

        {listing.verifiedHost && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-brand">
            <ShieldCheck className="h-3 w-3" /> Verified
          </span>
        )}

        {listing.furnished && (
          <span className="absolute right-3 top-3 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-bold text-white">
            Furnished
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="mb-2 flex items-center justify-between text-sm text-muted">
          <span>{listing.area}</span>

          <span className="flex items-center gap-1 font-semibold text-ink">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {listing.rating}
          </span>
        </div>

        <h3 className="mb-1 line-clamp-2 text-lg font-bold leading-snug text-ink">
          {listing.title}
        </h3>

        <p className="mb-3 text-xs font-semibold text-brand">
          {listing.distanceKm} km from{" "}
          {uni?.name || listing.universityName || "campus"}
        </p>

        <WalkingTime
          universityId={listing.universityId}
          propertyLat={listing.latitude}
          propertyLng={listing.longitude}
          compact
        />

        <p className="text-xl font-extrabold text-ink">
          KSh {Number(listing.pricePerMonth || 0).toLocaleString()}
          <span className="text-sm font-medium text-muted">
            {" "}
            / month
          </span>
        </p>

        {affordability && (
          <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${affordability.color}`}>
            {affordability.icon === "check" && <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            {affordability.icon === "warn" && <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            {affordability.icon === "over" && <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/></svg>}
            {affordability.label}
          </span>
        )}

        {listing.type && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {listing.type}
            </span>
            {listing.semesterLabel && (
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <CalendarDays className="h-3 w-3" />
                {listing.semesterLabel}
              </span>
            )}
          </div>
        )}

        <div className="mt-3">
          <TrustBadge propertyId={listing.id} />
        </div>
      </div>
    </Link>
  );
}