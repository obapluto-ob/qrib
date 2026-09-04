import { useState } from "react";
import { Check, MapPin, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const TOKEN_KEY = "qrib_access_token";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { universities, resolveUniversityId } from "../data/universities";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";

const amenitiesList = [
  "WiFi",
  "Water",
  "Security",
  "Laundry",
  "Parking",
  "Study Room",
  "Gym",
];

export default function AddProperty() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    area: "",
    city: "Nairobi",
    universityId: "",
    pricePerMonth: "",
    type: "Apartment",
    bedrooms: "1",
    bathrooms: "1",
    furnished: true,
    images: [""],
    image: "",
    description: "",
    distanceKm: "",
    waterCost: "",
    electricityCost: "",
    latitude: "",
    longitude: "",
    semesterLabel: "",
    availableFrom: "",
    availableTo: "",
  });

  const [amenities, setAmenities] = useState([]);
  const [locating, setLocating] = useState(false);

  const update = (key) => (e) => {
    setForm((current) => ({
      ...current,
      [key]: e.target.value,
    }));
  };

  const toggleAmenity = (amenity) => {
    setAmenities((current) =>
      current.includes(amenity)
        ? current.filter((item) => item !== amenity)
        : [...current, amenity]
    );
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file.", "error");
      return;
    }
    // Warn host — base64 bloats the DB. Ask them to use a URL instead.
    showToast("For best results, upload your image to Cloudinary or ImgBB and paste the URL below.", "info");
    event.target.value = "";
  };

  const [submitting, setSubmitting] = useState(false);

  const isValidImageValue = (value) => {
    if (!value) {
      return true;
    }

    return /^https?:\/\//i.test(value.trim()) || /^data:image\//i.test(value.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || user.role !== "host") {
      showToast("Only hosts can create properties.", "error");
      navigate("/login");
      return;
    }

    if (!form.title.trim()) {
      showToast("Please enter a property title.", "error");
      return;
    }

    const normalizedUniversityId = resolveUniversityId(form.universityId);

    if (!normalizedUniversityId) {
      showToast("Please select a nearby university.", "error");
      return;
    }

    if (!form.pricePerMonth || Number(form.pricePerMonth) <= 0) {
      showToast("Please enter a valid monthly rent.", "error");
      return;
    }

    if (!form.description.trim()) {
      showToast("Please enter a property description.", "error");
      return;
    }

    const validImages = form.images.filter((u) => u.trim());
    for (const u of validImages) {
      if (!isValidImageValue(u)) {
        showToast("Please enter valid image URLs (must start with https://).", "error");
        return;
      }
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem(TOKEN_KEY);

      const response = await fetch(`${API_URL}/properties`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title.trim(),
          area: form.area.trim(),
          city: form.city,
          description: form.description.trim(),
          price_per_month: Number(form.pricePerMonth),
          property_type: form.type,
          university_id: normalizedUniversityId,
          bedrooms: Number(form.bedrooms),
          bathrooms: Number(form.bathrooms),
          furnished: form.furnished,
          image: form.images[0]?.trim() || null,
          images: form.images.filter((u) => u.trim()),
          distance_km: Number(form.distanceKm) || 0,
          water_cost: Number(form.waterCost) || 0,
          electricity_cost: Number(form.electricityCost) || 0,
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null,
          semester_label: form.semesterLabel || null,
          available_from: form.availableFrom || null,
          available_to: form.availableTo || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to publish property.");
      }

      showToast("Property published successfully!", "success");
      navigate("/host/dashboard");
    } catch (err) {
      showToast(err.message || "Unable to connect to server.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 lg:px-10 py-12">
        <button
          type="button"
          onClick={() => navigate("/host/dashboard")}
          className="text-sm font-semibold text-brand hover:underline"
        >
          ← Back to dashboard
        </button>

        <div className="mt-6">
          <h1 className="text-3xl font-extrabold text-ink">
            Add a property
          </h1>

          <p className="text-muted mt-2">
            Tell students about your accommodation and publish your listing
            on Qrib.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-10 border border-line rounded-2xl p-6 md:p-8 space-y-8"
        >
          {/* BASIC INFORMATION */}
          <section>
            <h2 className="text-xl font-bold text-ink">
              Property information
            </h2>

            <div className="grid md:grid-cols-2 gap-5 mt-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-ink mb-2">
                  Property title
                </label>

                <input
                  required
                  value={form.title}
                  onChange={update("title")}
                  placeholder="e.g. Sunrise Student Apartments"
                  className="w-full border border-slate-200 rounded-lg p-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Area
                </label>

                <input
                  required
                  value={form.area}
                  onChange={update("area")}
                  placeholder="e.g. Juja"
                  className="w-full border border-slate-200 rounded-lg p-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  City
                </label>

                <select
                  value={form.city}
                  onChange={update("city")}
                  className="w-full border border-slate-200 rounded-lg p-3.5 bg-white"
                >
                  <option>Nairobi</option>
                  <option>Kiambu</option>
                  <option>Eldoret</option>
                  <option>Njoro</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-ink mb-2">
                  Nearby university
                </label>

                <select
                  required
                  value={form.universityId}
                  onChange={update("universityId")}
                  className="w-full border border-slate-200 rounded-lg p-3.5 bg-white"
                >
                  <option value="">Select university</option>

                  {universities.map((university) => (
                    <option key={university.id} value={university.dbId}>
                      {university.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* RENT & PROPERTY DETAILS */}
          <section>
            <h2 className="text-xl font-bold text-ink">
              Rent and details
            </h2>

            <div className="grid md:grid-cols-2 gap-5 mt-5">
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Monthly rent (KSh)
                </label>

                <input
                  required
                  type="number"
                  min="1"
                  value={form.pricePerMonth}
                  onChange={update("pricePerMonth")}
                  placeholder="10000"
                  className="w-full border border-slate-200 rounded-lg p-3.5"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Property type
                </label>

                <select
                  value={form.type}
                  onChange={update("type")}
                  className="w-full border border-slate-200 rounded-lg p-3.5 bg-white"
                >
                  <option>Apartment</option>
                  <option>Hostel</option>
                  <option>Bedsitter</option>
                  <option>Studio</option>
                  <option>House</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Bedrooms
                </label>

                <input
                  type="number"
                  min="0"
                  value={form.bedrooms}
                  onChange={update("bedrooms")}
                  className="w-full border border-slate-200 rounded-lg p-3.5"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Bathrooms
                </label>

                <input
                  type="number"
                  min="0"
                  value={form.bathrooms}
                  onChange={update("bathrooms")}
                  className="w-full border border-slate-200 rounded-lg p-3.5"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Distance from university (km)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.distanceKm}
                  onChange={update("distanceKm")}
                  placeholder="0.8"
                  className="w-full border border-slate-200 rounded-lg p-3.5"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-ink mb-2">Property location</label>
                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.geolocation) return;
                    setLocating(true);
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setForm((f) => ({
                          ...f,
                          latitude: pos.coords.latitude.toFixed(6),
                          longitude: pos.coords.longitude.toFixed(6),
                        }));
                        setLocating(false);
                      },
                      () => {
                        showToast("Could not get location. Enter coordinates manually.", "error");
                        setLocating(false);
                      }
                    );
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-brand text-brand text-sm font-semibold hover:bg-brand/5 transition"
                >
                  <MapPin className="h-4 w-4" />
                  {locating ? "Detecting…" : form.latitude ? `${form.latitude}, ${form.longitude}` : "Detect my location"}
                </button>
                <p className="text-xs text-muted mt-1">Stand at the property and tap — uses your device GPS for accurate walking time calculation.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Avg. water cost / month (KSh)</label>
                <input
                  type="number" min="0"
                  value={form.waterCost}
                  onChange={update("waterCost")}
                  placeholder="500"
                  className="w-full border border-slate-200 rounded-lg p-3.5"
                />
                <p className="text-xs text-muted mt-1">Leave 0 if included in rent</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Avg. electricity cost / month (KSh)</label>
                <input
                  type="number" min="0"
                  value={form.electricityCost}
                  onChange={update("electricityCost")}
                  placeholder="800"
                  className="w-full border border-slate-200 rounded-lg p-3.5"
                />
                <p className="text-xs text-muted mt-1">Leave 0 if included in rent</p>
              </div>

              <div className="flex items-center gap-3 md:pt-8">
                <input
                  id="furnished"
                  type="checkbox"
                  checked={form.furnished}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      furnished: e.target.checked,
                    }))
                  }
                  className="w-5 h-5"
                />

                <label
                  htmlFor="furnished"
                  className="text-sm font-semibold text-ink"
                >
                  Furnished property
                </label>
              </div>
            </div>
          </section>

          {/* AMENITIES */}
          <section>
            <h2 className="text-xl font-bold text-ink">
              Amenities
            </h2>

            <div className="flex flex-wrap gap-3 mt-5">
              {amenitiesList.map((amenity) => {
                const selected = amenities.includes(amenity);

                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-4 py-2.5 rounded-lg border text-sm font-semibold transition ${
                      selected
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-line text-muted hover:border-brand"
                    }`}
                  >
                    {selected && <Check className="inline h-3.5 w-3.5 mr-1" />}
                    {amenity}
                  </button>
                );
              })}
            </div>
          </section>

          {/* IMAGE & DESCRIPTION */}
          <section>
            <h2 className="text-xl font-bold text-ink">
              Listing content
            </h2>

            <div className="space-y-5 mt-5">
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Property photos (up to 5)
                </label>
                <p className="text-xs text-muted mb-3">
                  Upload photos to <a href="https://imgbb.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">ImgBB</a> (free) and paste the direct links below. First photo is the cover.
                </p>
                <div className="space-y-2">
                  {form.images.map((url, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => {
                          const next = [...form.images];
                          next[idx] = e.target.value;
                          setForm((f) => ({ ...f, images: next }));
                        }}
                        placeholder={idx === 0 ? "Cover photo URL (required)" : `Photo ${idx + 1} URL`}
                        className="flex-1 border border-slate-200 rounded-lg p-3.5 text-sm"
                      />
                      {form.images.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))}
                          className="p-2 text-slate-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {form.images.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, images: [...f.images, ""] }))}
                    className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
                  >
                    <Plus className="h-4 w-4" /> Add another photo
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-2">
                  Description
                </label>

                <textarea
                  required
                  rows={6}
                  value={form.description}
                  onChange={update("description")}
                  placeholder="Describe the property, security, nearby facilities, transport, rules, etc."
                  className="w-full border border-slate-200 rounded-lg p-3.5 resize-none"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink">Semester availability</h2>
            <p className="text-sm text-muted mt-1">Let students know which semester this property is available for.</p>
            <div className="grid md:grid-cols-3 gap-5 mt-5">
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Semester</label>
                <select
                  value={form.semesterLabel}
                  onChange={update("semesterLabel")}
                  className="w-full border border-slate-200 rounded-lg p-3.5 bg-white"
                >
                  <option value="">Any / Always available</option>
                  <option value="Semester 1 (Jan – Apr)">Semester 1 (Jan – Apr)</option>
                  <option value="Semester 2 (May – Aug)">Semester 2 (May – Aug)</option>
                  <option value="Semester 3 (Sep – Dec)">Semester 3 (Sep – Dec)</option>
                  <option value="Full Year">Full Year</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Available from</label>
                <input
                  type="date"
                  value={form.availableFrom}
                  onChange={update("availableFrom")}
                  className="w-full border border-slate-200 rounded-lg p-3.5"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Available to</label>
                <input
                  type="date"
                  value={form.availableTo}
                  onChange={update("availableTo")}
                  className="w-full border border-slate-200 rounded-lg p-3.5"
                />
              </div>
            </div>
          </section>

          {/* SUBMIT */}
          <div className="border-t border-line pt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/host/dashboard")}
              className="border border-line px-6 py-3 rounded-lg font-bold text-ink"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="bg-brand text-white px-7 py-3 rounded-lg font-extrabold hover:opacity-90 transition disabled:opacity-60"
            >
              {submitting ? "Publishing…" : "Publish property"}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}