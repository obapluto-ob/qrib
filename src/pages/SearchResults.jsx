import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PropertyCard from "../components/PropertyCard";
import MapView from "../components/MapView";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

function normalizeProperty(property) {
  return {
    id: property.id,
    title: property.title || "Student Accommodation",
    area: property.area || "",
    city: property.city || "",
    description: property.description || "",

    image:
      property.image ||
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=900&q=80",

    pricePerMonth: Number(property.price_per_month || 0),

    propertyType:
      property.property_type || "Accommodation",

    type:
      property.property_type || "Accommodation",

    bedrooms: Number(property.bedrooms || 0),
    bathrooms: Number(property.bathrooms || 0),

    distanceKm: Number(property.distance_km || 0),
    rating: Number(property.rating || 0),

    furnished: Boolean(property.furnished),
    verifiedHost: Boolean(property.verified_host),

    hostId: property.host_id,
    universityId: property.university_id,
    universityName: property.university_name || "",

    amenities: property.amenities || [],
    waterCost: Number(property.water_cost || 0),
    electricityCost: Number(property.electricity_cost || 0),
    latitude: property.latitude,
    longitude: property.longitude,
    semesterLabel: property.semester_label || null,
    availableFrom: property.available_from || null,
    availableTo: property.available_to || null,
  };
}

function getAffordability(trueCost, budget) {
  if (!budget || budget <= 0) return null;
  const ratio = trueCost / budget;
  if (ratio <= 0.3) return { label: "Affordable", color: "bg-green-100 text-green-700", icon: "check" };
  if (ratio <= 0.5) return { label: "Stretching", color: "bg-yellow-100 text-yellow-700", icon: "warn" };
  return { label: "Over budget", color: "bg-red-100 text-red-700", icon: "over" };
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const query = searchParams.get("q") || "";
  const area = searchParams.get("area") || "";
  const city = searchParams.get("city") || "";
  const budget = searchParams.get("budget") || "Any budget";
  const propertyType =
    searchParams.get("type") || "Any type";

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchProperties() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/properties`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              data.message ||
              "Unable to load properties."
          );
        }

        const normalized = Array.isArray(data)
          ? data.map(normalizeProperty)
          : [];

        if (!cancelled) {
          setListings(normalized);
        }
      } catch (err) {
        console.error("Search property loading error:", err);

        if (!cancelled) {
          setError(
            err.message ||
              "Unable to load accommodation."
          );
          setListings([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProperties();

    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    let result = [...listings];

    const normalizedQuery = query
      .trim()
      .toLowerCase();

    const normalizedArea = area
      .trim()
      .toLowerCase();

    const normalizedCity = city
      .trim()
      .toLowerCase();

    // SEARCH
    if (normalizedQuery) {
      result = result.filter((listing) => {
        const values = [
          listing.title,
          listing.area,
          listing.city,
          listing.propertyType,
          listing.universityName,
          listing.description,
        ];

        return values
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(normalizedQuery)
          );
      });
    }

    // AREA
    if (normalizedArea) {
      result = result.filter((listing) =>
        String(listing.area || "")
          .toLowerCase()
          .includes(normalizedArea)
      );
    }

    // CITY
    if (normalizedCity) {
      result = result.filter((listing) =>
        String(listing.city || "")
          .toLowerCase()
          .includes(normalizedCity)
      );
    }

    // BUDGET
    if (budget !== "Any budget") {
      result = result.filter((listing) => {
        const price = Number(
          listing.pricePerMonth || 0
        );

        switch (budget) {
          case "Under KSh 10,000":
            return price < 10000;

          case "KSh 10,000 - 15,000":
            return (
              price >= 10000 &&
              price <= 15000
            );

          case "KSh 15,000 - 25,000":
            return (
              price > 15000 &&
              price <= 25000
            );

          case "Above KSh 25,000":
            return price > 25000;

          default:
            return true;
        }
      });
    }

    // PROPERTY TYPE
    if (propertyType !== "Any type") {
      result = result.filter((listing) => {
        const type = String(
          listing.propertyType ||
            listing.type ||
            ""
        ).toLowerCase();

        return (
          type === propertyType.toLowerCase()
        );
      });
    }

    const budgetNum = Number(monthlyBudget) || 0;

    if (budgetNum > 0) {
      result.sort((a, b) => {
        const aCost = a.pricePerMonth + a.waterCost + a.electricityCost;
        const bCost = b.pricePerMonth + b.waterCost + b.electricityCost;
        return aCost / budgetNum - bCost / budgetNum;
      });
    }

    return result;
  }, [
    listings,
    query,
    area,
    city,
    budget,
    propertyType,
    monthlyBudget,
  ]);

  const activeFilters = [
    query,
    area,
    city,
    budget !== "Any budget" ? budget : "",
    propertyType !== "Any type"
      ? propertyType
      : "",
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Navbar />

      <main className="mx-auto max-w-[1440px] px-6 py-10 lg:px-20">

        {/* HEADER */}

        <div className="mb-8">
          <Link
            to="/student/dashboard"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            ← Back to dashboard
          </Link>

          <h1 className="mt-4 text-3xl font-black text-slate-900">
            Find accommodation
          </h1>

          <p className="mt-2 text-slate-500">
            Search student accommodation available
            on Qrib.
          </p>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
            <svg className="h-5 w-5 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/></svg>
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <label className="text-sm font-bold text-blue-800 whitespace-nowrap">
                My monthly budget (KSh)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 30000"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-44 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {monthlyBudget > 0 && (
                <span className="text-xs text-blue-600 font-medium">
                  Properties are sorted by affordability. Green ≤30% · Yellow 30–50% · Red &gt;50% of your budget
                </span>
              )}
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <span
                  key={filter}
                  className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
                >
                  {filter}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6">
            <p className="font-bold text-red-700">
              Could not load properties
            </p>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
            >
              Try again
            </button>
          </div>
        )}

        {/* RESULTS */}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[420px_1fr]">

          {/* MAP */}

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <MapView listings={results} />
            </div>
          </aside>

          <section>
            <div className="mb-5 flex items-center justify-between">
              <p className="font-bold text-slate-900">
                {loading
                  ? "Loading..."
                  : `${results.length} ${
                      results.length === 1
                        ? "property"
                        : "properties"
                    } found`}
              </p>

              <Link
                to="/search"
                className="text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </Link>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                <p className="mt-4 text-sm font-semibold text-slate-600">
                  Loading accommodation...
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <h2 className="text-xl font-black text-slate-900">
                  No accommodation found
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Try changing your search or filters.
                </p>

                <Link
                  to="/search"
                  className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                >
                  View all properties
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {results.map((listing) => {
                  const trueCost = listing.pricePerMonth + listing.waterCost + listing.electricityCost;
                  const affordability = getAffordability(trueCost, Number(monthlyBudget));
                  return (
                    <PropertyCard
                      key={listing.id}
                      listing={listing}
                      affordability={affordability}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
