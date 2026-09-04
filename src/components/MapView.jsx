import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix broken default marker icons in Vite/webpack builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const cityCoordinates = {
  Nairobi: [-1.286389, 36.817223],
  Eldoret: [0.514277, 35.269779],
  Kiambu: [-1.17139, 36.83556],
  Njoro: [-0.33083, 35.94444],
  Kisumu: [-0.10221, 34.76171],
  Kisii: [-0.67396, 34.78088],
  Narok: [-1.08333, 35.86722],
  Thika: [-1.03326, 37.06933],
  Embu: [-0.53111, 37.45444],
  Nyeri: [-0.41667, 36.94722],
  Machakos: [-1.51667, 37.26667],
  Nakuru: [-0.3031, 36.08003],
  Meru: [0.0462, 37.6553],
  "Murang'a": [-0.721, 37.1526],
  Limuru: [-1.10466, 36.63798],
  Karatina: [-0.483, 37.1324],
  Mombasa: [-4.04348, 39.66821],
  "Nairobi West": [-1.2995, 36.8190],
  Westlands: [-1.264, 36.8025],
  Kasarani: [-1.215, 36.894],
  Kilimani: [-1.287, 36.789],
};

// Re-centers map when listings change
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center[0], center[1]]);
  return null;
}

export default function MapView({ listings = [] }) {
  const first = listings[0];
  const center = (first?.latitude && first?.longitude)
    ? [Number(first.latitude), Number(first.longitude)]
    : cityCoordinates[first?.city] || cityCoordinates.Nairobi;

  return (
    <div className="h-[620px] w-full overflow-hidden rounded-2xl border border-line bg-slate-100 shadow-sm">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap center={center} />

        {listings.map((listing) => {
          const pos = (listing.latitude && listing.longitude)
            ? [Number(listing.latitude), Number(listing.longitude)]
            : cityCoordinates[listing.city] || cityCoordinates.Nairobi;

          return (
            <Marker key={listing.id} position={pos}>
              <Popup>
                <div className="text-sm min-w-[160px]">
                  <strong className="block text-slate-900">{listing.title}</strong>
                  <span className="block text-xs text-slate-500 mt-0.5">{listing.area}, {listing.city}</span>
                  <span className="block font-bold text-slate-900 mt-1">
                    KSh {Number(listing.pricePerMonth || 0).toLocaleString()} / mo
                  </span>
                  <a
                    href={`/property/${listing.id}`}
                    className="mt-2 block rounded-lg bg-blue-600 px-3 py-1.5 text-center text-xs font-bold text-white hover:bg-blue-700"
                  >
                    View listing
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
