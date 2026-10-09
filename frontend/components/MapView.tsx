"use client";

import L from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { img } from "@/lib/api";
import { money } from "@/lib/format";
import type { ListingCard } from "@/lib/types";

const TILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join()).join("|");
  useEffect(() => {
    if (points.length) map.fitBounds(points, { padding: [48, 48], maxZoom: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

/** Explore map with price pins. Loaded with next/dynamic (ssr: false) because Leaflet touches window. */
export default function MapView({ listings, activeId }: { listings: ListingCard[]; activeId?: number | null }) {
  return (
    <MapContainer center={[22.5, 79]} zoom={5} scrollWheelZoom className="h-full w-full">
      <TileLayer url={TILES} attribution={ATTRIBUTION} />
      <FitBounds points={listings.map((l) => [l.lat, l.lng])} />
      {listings.map((l) => (
        <Marker
          key={l.id}
          position={[l.lat, l.lng]}
          zIndexOffset={l.id === activeId ? 1000 : 0}
          icon={L.divIcon({ html: `<span class="price-pin ${l.id === activeId ? "active" : ""}">${money(l.base_price)}</span>`, className: "" })}
        >
          <Popup closeButton={false} minWidth={260}>
            <Link href={`/rooms/${l.id}`} className="block !text-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(l.photos[0])} alt={l.title} className="mb-2 h-40 w-full rounded-lg object-cover" />
              <div className="font-semibold">{l.property_type} in {l.city}</div>
              <div className="text-muted">{l.title}</div>
              <div className="mt-1"><b>{money(l.base_price)}</b> night</div>
            </Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

/** Single-pin map for the listing page and the host form (click to move the pin). */
export function PinMap({
  lat, lng, zoom = 12, onPick, height = 480,
}: { lat: number; lng: number; zoom?: number; onPick?: (lat: number, lng: number) => void; height?: number }) {
  return (
    <MapContainer center={[lat, lng]} zoom={zoom} scrollWheelZoom={false} style={{ height }} className="w-full rounded-xl">
      <TileLayer url={TILES} attribution={ATTRIBUTION} />
      <Recenter lat={lat} lng={lng} />
      {onPick && <ClickToPick onPick={onPick} />}
      <Marker
        position={[lat, lng]}
        icon={L.divIcon({
          html: `<span style="display:flex;width:56px;height:56px;border-radius:50%;background:#ff385c;color:white;align-items:center;justify-content:center;transform:translate(-50%,-50%);box-shadow:0 0 0 12px rgba(255,56,92,.2)"><svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M12 3 2 12h3v8h5v-6h4v6h5v-8h3z"/></svg></span>`,
          className: "",
        })}
      />
    </MapContainer>
  );
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const h = (e: L.LeafletMouseEvent) => onPick(+e.latlng.lat.toFixed(5), +e.latlng.lng.toFixed(5));
    map.on("click", h);
    return () => {
      map.off("click", h);
    };
  }, [map, onPick]);
  return null;
}
