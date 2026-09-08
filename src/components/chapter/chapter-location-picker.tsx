"use client";

import { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Navigation,
  ExternalLink,
  Crosshair,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/input";

export interface ChapterLocationValue {
  coordinates?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  mapUrl?: string;
}

interface CampusPreset {
  name: string;
  city: string;
  district?: string;
  state?: string;
  lat: number;
  lng: number;
  locationName: string;
}

const CAMPUS_PRESETS: CampusPreset[] = [
  {
    name: "NIT Calicut",
    city: "Kozhikode (Calicut)",
    district: "Kozhikode",
    state: "Kerala",
    lat: 11.3216,
    lng: 75.9336,
    locationName: "NIT Calicut Campus, Kattangal, Kozhikode",
  },
  {
    name: "CET Trivandrum",
    city: "Thiruvananthapuram (Trivandrum)",
    district: "Thiruvananthapuram",
    state: "Kerala",
    lat: 8.5456,
    lng: 76.9064,
    locationName: "College of Engineering Trivandrum, Sreekaryam",
  },
  {
    name: "CUSAT Kochi",
    city: "Kochi (Cochin)",
    district: "Ernakulam",
    state: "Kerala",
    lat: 10.0436,
    lng: 76.3244,
    locationName: "CUSAT Main Campus, South Kalamassery, Kochi",
  },
  {
    name: "GEC Thrissur",
    city: "Thrissur",
    district: "Thrissur",
    state: "Kerala",
    lat: 10.5534,
    lng: 76.2227,
    locationName: "Govt. Engineering College, Ramavarmapuram, Thrissur",
  },
  {
    name: "IIT Palakkad",
    city: "Palakkad",
    district: "Palakkad",
    state: "Kerala",
    lat: 10.8164,
    lng: 76.7441,
    locationName: "IIT Palakkad Nila Campus, Kanjikode",
  },
  {
    name: "TKM Kollam",
    city: "Kollam (Quilon)",
    district: "Kollam",
    state: "Kerala",
    lat: 8.9037,
    lng: 76.6346,
    locationName: "TKM College of Engineering, Karicode, Kollam",
  },
  {
    name: "MEC Kochi",
    city: "Kochi (Cochin)",
    district: "Ernakulam",
    state: "Kerala",
    lat: 10.0284,
    lng: 76.3284,
    locationName: "Govt. Model Engineering College, Thrikkakara, Kochi",
  },
  {
    name: "GEC Barton Hill",
    city: "Thiruvananthapuram (Trivandrum)",
    district: "Thiruvananthapuram",
    state: "Kerala",
    lat: 8.5089,
    lng: 76.9538,
    locationName: "GEC Barton Hill, Vanchiyoor, Thiruvananthapuram",
  },
  {
    name: "EKC Manjeri",
    city: "Manjeri",
    district: "Malappuram",
    state: "Kerala",
    lat: 11.1345,
    lng: 76.1086,
    locationName: "Eranad Knowledge City Technical Campus, Manjeri",
  },
];

// Calibration bounding box for regional interactive map (Kerala / South India)
const REGION_BOUNDS = {
  north: 12.85,
  south: 8.25,
  west: 74.8,
  east: 77.6,
};

export function ChapterLocationPicker({
  value,
  onChange,
  onCityChange,
}: {
  value: ChapterLocationValue;
  onChange: (val: ChapterLocationValue) => void;
  onCityChange?: (city: string, district?: string, state?: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"map" | "type">("map");
  const [coordsInput, setCoordsInput] = useState<string>(
    value.coordinates ||
      (value.latitude != null && value.longitude != null
        ? `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`
        : ""),
  );
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes into local input
  useEffect(() => {
    if (value.coordinates) {
      setCoordsInput(value.coordinates);
    } else if (value.latitude != null && value.longitude != null) {
      setCoordsInput(`${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`);
    }
  }, [value.coordinates, value.latitude, value.longitude]);

  function parseCoordinates(raw: string): { lat: number; lng: number } | null {
    if (!raw) return null;
    // Extract numbers, supporting formats like "11.3216, 75.9336" or "11.3216 N 75.9336 E"
    const cleaned = raw.replace(/[^\d.,\-+ ]/g, " ").trim();
    const parts = cleaned.split(/[\s,]+/).filter(Boolean);
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    return null;
  }

  function handleCoordinatesType(input: string) {
    setCoordsInput(input);
    const parsed = parseCoordinates(input);
    if (parsed) {
      const formatted = `${parsed.lat.toFixed(6)}, ${parsed.lng.toFixed(6)}`;
      onChange({
        ...value,
        coordinates: formatted,
        latitude: parsed.lat,
        longitude: parsed.lng,
        mapUrl: `https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`,
      });
    } else {
      onChange({
        ...value,
        coordinates: input,
      });
    }
  }

  function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const xRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const yRatio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    // Linear projection across regional bounds
    const lat = REGION_BOUNDS.north - yRatio * (REGION_BOUNDS.north - REGION_BOUNDS.south);
    const lng = REGION_BOUNDS.west + xRatio * (REGION_BOUNDS.east - REGION_BOUNDS.west);

    const formatted = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    setCoordsInput(formatted);
    onChange({
      ...value,
      coordinates: formatted,
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      mapUrl: `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`,
    });
  }

  function handlePresetSelect(preset: CampusPreset) {
    const formatted = `${preset.lat.toFixed(6)}, ${preset.lng.toFixed(6)}`;
    setCoordsInput(formatted);
    onChange({
      ...value,
      coordinates: formatted,
      latitude: preset.lat,
      longitude: preset.lng,
      location: preset.locationName,
      mapUrl: `https://www.google.com/maps?q=${preset.lat},${preset.lng}`,
    });
    if (onCityChange && preset.city) {
      onCityChange(preset.city, preset.district, preset.state);
    }
  }

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const formatted = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setCoordsInput(formatted);
        onChange({
          ...value,
          coordinates: formatted,
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
          mapUrl: `https://www.google.com/maps?q=${lat},${lng}`,
        });
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(err.message || "Failed to fetch device location.");
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  const hasCoordinates =
    value.latitude != null &&
    value.longitude != null &&
    !isNaN(value.latitude) &&
    !isNaN(value.longitude);

  // Relative pin position on interactive map surface (0% to 100%)
  const pinX = hasCoordinates
    ? Math.max(
        0,
        Math.min(
          100,
          ((value.longitude! - REGION_BOUNDS.west) /
            (REGION_BOUNDS.east - REGION_BOUNDS.west)) *
            100,
        ),
      )
    : 50;

  const pinY = hasCoordinates
    ? Math.max(
        0,
        Math.min(
          100,
          ((REGION_BOUNDS.north - value.latitude!) /
            (REGION_BOUNDS.north - REGION_BOUNDS.south)) *
            100,
        ),
      )
    : 50;

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-bg-card/60 p-3.5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <MapPin size={15} className="text-[var(--accent)]" />
          <span className="text-[12px] font-semibold text-text">
            Campus Location & Coordinates
          </span>
          <span className="text-[11px] text-[var(--accent)] font-medium">
            (Required)
          </span>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-md border border-border bg-bg p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab("map")}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === "map"
                ? "bg-[var(--accent)] text-white font-medium"
                : "text-text-dim hover:text-text"
            }`}
          >
            🗺️ Interactive Map
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("type")}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === "type"
                ? "bg-[var(--accent)] text-white font-medium"
                : "text-text-dim hover:text-text"
            }`}
          >
            ⌨️ Type Coordinates
          </button>
        </div>
      </div>

      {/* ── MODE 1: INTERACTIVE MAP ── */}
      {activeTab === "map" && (
        <div className="space-y-2.5">
          {/* Quick Campus Presets - Directly Above the Map */}
          <div className="space-y-1.5 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-dim flex items-center gap-1">
                <Sparkles size={12} className="text-[var(--accent)]" /> Quick Select Campus Preset:
              </span>
              <button
                type="button"
                onClick={handleGeolocate}
                disabled={geoLoading}
                className="text-[10px] text-[var(--accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Navigation size={10} />
                {geoLoading ? "Detecting GPS..." : "Auto-detect Location"}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {CAMPUS_PRESETS.map((preset) => {
                const isSelected =
                  value.latitude != null &&
                  Math.abs(value.latitude - preset.lat) < 0.001 &&
                  value.longitude != null &&
                  Math.abs(value.longitude - preset.lng) < 0.001;

                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[var(--accent)] text-white border-[var(--accent)] font-semibold shadow-sm"
                        : "bg-bg border-border text-text-dim hover:text-text hover:border-border-hover hover:bg-bg-hover"
                    }`}
                  >
                    📍 {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            ref={mapContainerRef}
            onClick={handleMapClick}
            className="relative h-48 w-full rounded-[var(--radius-md)] border border-border bg-[#0a0f18] cursor-crosshair overflow-hidden group select-none shadow-inner"
            title="Click anywhere to drop campus location pin"
          >
            {/* Embedded Live Map when coordinates are selected */}
            {hasCoordinates ? (
              <iframe
                title="Chapter Map Location"
                className="w-full h-full pointer-events-none opacity-85 brightness-90 contrast-110"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${value.longitude! - 0.02}%2C${value.latitude! - 0.015}%2C${value.longitude! + 0.02}%2C${value.latitude! + 0.015}&layer=mapnik&marker=${value.latitude}%2C${value.longitude}`}
              />
            ) : (
              /* Regional Interactive SVG Grid */
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
                <div className="text-center space-y-1 z-10 pointer-events-none">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] mb-1">
                    <Crosshair size={22} className="animate-pulse" />
                  </div>
                  <p className="text-xs font-semibold text-text">
                    Click anywhere on the map to drop a pin
                  </p>
                  <p className="text-[10px] text-text-dim">
                    Or select from popular college campus presets below
                  </p>
                </div>
              </div>
            )}

            {/* Click overlay layer */}
            <div className="absolute inset-0 bg-transparent" />

            {/* Map pin marker */}
            {hasCoordinates && (
              <div
                className="absolute -translate-x-1/2 -translate-y-full pointer-events-none transition-all duration-300"
                style={{ left: `${pinX}%`, top: `${pinY}%` }}
              >
                <div className="flex flex-col items-center">
                  <div className="bg-[var(--accent)] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap mb-0.5">
                    {value.location || "Campus Pin"}
                  </div>
                  <MapPin
                    size={26}
                    className="text-[var(--accent)] drop-shadow-[0_2px_8px_rgba(255,100,50,0.8)] fill-[var(--accent)]"
                  />
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping -mt-1" />
                </div>
              </div>
            )}

            {/* Floating indicator */}
            <div className="absolute bottom-2 left-2 z-10 pointer-events-none bg-black/75 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-text-dim border border-white/10">
              {hasCoordinates
                ? `📍 ${value.latitude?.toFixed(6)}, ${value.longitude?.toFixed(6)}`
                : "👆 Click to pin campus position"}
            </div>
          </div>

          <p className="text-[11px] text-text-dim flex items-center justify-between">
            <span>
              💡 Click anywhere on the map to position the chapter pin.
            </span>
            {hasCoordinates && (
              <a
                href={value.mapUrl || `https://www.google.com/maps?q=${value.latitude},${value.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] hover:underline inline-flex items-center gap-1 font-medium"
              >
                Open in Google Maps <ExternalLink size={11} />
              </a>
            )}
          </p>
        </div>
      )}

      {/* ── MODE 2: TYPE COORDINATES ── */}
      {activeTab === "type" && (
        <div className="space-y-3">
          <div>
            <FieldLabel>Coordinates (Latitude, Longitude)</FieldLabel>
            <div className="relative">
              <Input
                value={coordsInput}
                onChange={(e) => handleCoordinatesType(e.target.value)}
                placeholder="e.g. 11.3216, 75.9336"
                className="font-mono text-xs pr-24"
              />
              <button
                type="button"
                onClick={handleGeolocate}
                disabled={geoLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[var(--accent)] hover:underline px-2 py-1 rounded flex items-center gap-1 bg-bg border border-border"
                title="Use device GPS"
              >
                <Crosshair size={12} />
                {geoLoading ? "Locating…" : "GPS"}
              </button>
            </div>
            <p className="text-[10px] text-text-dim mt-1">
              Supports formats like <code className="font-mono bg-bg px-1 rounded">11.3216, 75.9336</code> or decimal coordinates.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Latitude</FieldLabel>
              <Input
                type="number"
                step="any"
                value={value.latitude ?? ""}
                onChange={(e) => {
                  const lat = parseFloat(e.target.value);
                  const lng = value.longitude ?? 75.9336;
                  if (!isNaN(lat)) {
                    const formatted = `${lat}, ${lng}`;
                    setCoordsInput(formatted);
                    onChange({
                      ...value,
                      latitude: lat,
                      longitude: lng,
                      coordinates: formatted,
                      mapUrl: `https://www.google.com/maps?q=${lat},${lng}`,
                    });
                  }
                }}
                placeholder="11.3216"
                className="font-mono text-xs"
              />
            </div>
            <div>
              <FieldLabel>Longitude</FieldLabel>
              <Input
                type="number"
                step="any"
                value={value.longitude ?? ""}
                onChange={(e) => {
                  const lng = parseFloat(e.target.value);
                  const lat = value.latitude ?? 11.3216;
                  if (!isNaN(lng)) {
                    const formatted = `${lat}, ${lng}`;
                    setCoordsInput(formatted);
                    onChange({
                      ...value,
                      latitude: lat,
                      longitude: lng,
                      coordinates: formatted,
                      mapUrl: `https://www.google.com/maps?q=${lat},${lng}`,
                    });
                  }
                }}
                placeholder="75.9336"
                className="font-mono text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Campus Location / Landmark Name */}
      <div>
        <FieldLabel>Campus Area / Landmark Name (Optional)</FieldLabel>
        <Input
          value={value.location || ""}
          onChange={(e) =>
            onChange({
              ...value,
              location: e.target.value,
            })
          }
          placeholder="e.g. NIT Calicut Campus, Kattangal"
          className="text-xs"
        />
      </div>


      {geoError && (
        <p className="text-[11px] text-red-400 flex items-center gap-1">
          <AlertCircle size={12} /> {geoError}
        </p>
      )}

      {/* Selected Location Summary Badge */}
      {hasCoordinates ? (
        <div className="flex items-center justify-between bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded px-2.5 py-1.5 text-xs text-[var(--accent)]">
          <div className="flex items-center gap-1.5 truncate">
            <CheckCircle2 size={13} className="shrink-0" />
            <span className="font-mono text-[11px] truncate">
              {value.latitude?.toFixed(6)}, {value.longitude?.toFixed(6)}
              {value.location ? ` · ${value.location}` : ""}
            </span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider shrink-0 ml-2">
            Location Ready
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 bg-border/40 rounded px-2.5 py-1.5 text-[11px] text-text-dim">
          <AlertCircle size={13} className="text-orange-400 shrink-0" />
          <span>Please click on the map or type coordinates above to set location.</span>
        </div>
      )}
    </div>
  );
}
