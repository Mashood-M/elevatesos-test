"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  MapPin,
  Navigation,
  ExternalLink,
  Crosshair,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Search,
  Maximize2,
  Minimize2,
  ClipboardPaste,
  Check,
  X,
  HelpCircle,
  LocateFixed,
  ArrowUpRight,
  Loader2,
  Copy,
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

export interface CampusPreset {
  name: string;
  city: string;
  district?: string;
  state?: string;
  lat: number;
  lng: number;
  locationName: string;
}

export const CAMPUS_PRESETS: CampusPreset[] = [
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
  {
    name: "MACE Kothamangalam",
    city: "Kothamangalam",
    district: "Ernakulam",
    state: "Kerala",
    lat: 10.0537,
    lng: 76.6192,
    locationName: "Mar Athanasius College of Engineering, Kothamangalam",
  },
  {
    name: "RIT Kottayam",
    city: "Kottayam",
    district: "Kottayam",
    state: "Kerala",
    lat: 9.5815,
    lng: 76.6195,
    locationName: "Rajiv Gandhi Institute of Technology, Pampady, Kottayam",
  },
  {
    name: "Saintgits",
    city: "Kottayam",
    district: "Kottayam",
    state: "Kerala",
    lat: 9.5083,
    lng: 76.5516,
    locationName: "Saintgits College of Engineering, Pathamuttom, Kottayam",
  },
  {
    name: "Rajagiri (RSET)",
    city: "Kochi (Cochin)",
    district: "Ernakulam",
    state: "Kerala",
    lat: 9.9934,
    lng: 76.3582,
    locationName: "Rajagiri School of Engineering & Technology, Kakkanad",
  },
  {
    name: "FISAT Angamaly",
    city: "Angamaly",
    district: "Ernakulam",
    state: "Kerala",
    lat: 10.2312,
    lng: 76.4087,
    locationName: "Federal Institute of Science and Technology, Mookkannoor",
  },
  {
    name: "NSS Palakkad",
    city: "Palakkad",
    district: "Palakkad",
    state: "Kerala",
    lat: 10.8242,
    lng: 76.6428,
    locationName: "NSS College of Engineering, Akathethara, Palakkad",
  },
  {
    name: "Marian College",
    city: "Kuttikkanam",
    district: "Idukki",
    state: "Kerala",
    lat: 9.5828,
    lng: 76.9691,
    locationName: "Marian College Kuttikkanam Autonomous, Peermade",
  },
  {
    name: "St. Joseph's Devagiri",
    city: "Kozhikode (Calicut)",
    district: "Kozhikode",
    state: "Kerala",
    lat: 11.2675,
    lng: 75.8368,
    locationName: "St. Joseph's College Devagiri, Medical College Road, Calicut",
  },
  {
    name: "Farook College",
    city: "Kozhikode (Calicut)",
    district: "Kozhikode",
    state: "Kerala",
    lat: 11.1878,
    lng: 75.8504,
    locationName: "Farook College Autonomous Campus, Feroke, Calicut",
  },
  {
    name: "SCMS Cochin",
    city: "Kochi (Cochin)",
    district: "Ernakulam",
    state: "Kerala",
    lat: 10.2526,
    lng: 76.3888,
    locationName: "SCMS School of Engineering and Technology, Karukutty",
  },
  {
    name: "Christ University",
    city: "Bengaluru (Bangalore)",
    district: "Bengaluru Urban",
    state: "Karnataka",
    lat: 12.9343,
    lng: 77.606,
    locationName: "Christ University Central Campus, Hosur Road, Bengaluru",
  },
];

// Web Mercator projection calculations
function latLngToPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n * 256;
  const latRad = (lat * Math.PI) / 180;
  const clampedLatRad = Math.max(-1.4844, Math.min(1.4844, latRad)); // Clamp +-85 deg
  const y = ((1 - Math.log(Math.tan(clampedLatRad) + 1 / Math.cos(clampedLatRad)) / Math.PI) / 2) * n * 256;
  return { x, y };
}

function pixelToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const n = Math.pow(2, zoom);
  const lng = (x / (n * 256)) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / (n * 256))));
  const lat = (latRad * 180) / Math.PI;
  return {
    lat: Math.max(-85, Math.min(85, lat)),
    lng: Math.max(-180, Math.min(180, lng)),
  };
}

/**
 * Universal location input parser.
 * Supports:
 * - Google Maps place URLs (/@lat,lng,z)
 * - Google Maps search/coord query URLs (?q=lat,lng)
 * - DMS format (11°19'17.8"N 75°56'01.0"E)
 * - Plain decimal coordinates ("11.3216, 75.9336" or "11.3216 75.9336")
 */
export function parseLocationInput(input: string): {
  lat: number;
  lng: number;
  name?: string;
} | null {
  if (!input || typeof input !== "string") return null;
  const str = input.trim();

  // 1. Google Maps place URL with @lat,lng
  const atMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    let placeName: string | undefined = undefined;
    const placeMatch = str.match(/\/place\/([^/@]+)/);
    if (placeMatch) {
      try {
        placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
      } catch {}
    }
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng, name: placeName };
    }
  }

  // 2. Query param search: ?q=lat,lng or &query=lat,lng or &ll=lat,lng
  const qMatch = str.match(/[?&](?:q|ll|query|center)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  // 3. DMS format: 11°19'17.8"N 75°56'01.0"E
  const dmsRegex = /(\d+)[°\s]+(\d+)['\s]+([\d.]+)?["\s]*([NSEW])/gi;
  const dmsMatches = [...str.matchAll(dmsRegex)];
  if (dmsMatches.length >= 2) {
    const parseDms = (m: RegExpMatchArray) => {
      const deg = parseFloat(m[1]);
      const min = parseFloat(m[2]);
      const sec = m[3] ? parseFloat(m[3]) : 0;
      const dir = m[4].toUpperCase();
      let dec = deg + min / 60 + sec / 3600;
      if (dir === "S" || dir === "W") dec = -dec;
      return dec;
    };
    const lat = parseDms(dmsMatches[0]);
    const lng = parseDms(dmsMatches[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  // 4. Plain decimal coordinates: "11.3216, 75.9336" or "11.3216 75.9336"
  const cleaned = str.replace(/[^\d.,\-+ ]/g, " ").trim();
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

function getZoomLevelLabel(z: number): string {
  if (z >= 17) return "Building";
  if (z >= 15) return "Campus";
  if (z >= 13) return "City Hub";
  if (z >= 10) return "District";
  if (z >= 7) return "State";
  return "Region";
}

export function ChapterLocationPicker({
  value,
  onChange,
  onCityChange,
  contextQuery,
}: {
  value: ChapterLocationValue;
  onChange: (val: ChapterLocationValue) => void;
  onCityChange?: (city: string, district?: string, state?: string) => void;
  contextQuery?: string;
}) {
  const [activeTab, setActiveTab] = useState<"map" | "type">("map");
  const [isGmapsAssistantOpen, setIsGmapsAssistantOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState<"osm" | "carto">("osm");
  const [isExpanded, setIsExpanded] = useState(false);

  // Map viewport center and zoom level
  const defaultCenter = useMemo(() => {
    if (value.latitude != null && value.longitude != null && !isNaN(value.latitude)) {
      return { lat: value.latitude, lng: value.longitude };
    }
    // Default to Kerala / South India central region
    return { lat: 10.8505, lng: 76.2711 };
  }, [value.latitude, value.longitude]);

  const [center, setCenter] = useState<{ lat: number; lng: number }>(defaultCenter);
  const [zoom, setZoom] = useState<number>(
    value.latitude != null && value.longitude != null ? 15 : 9,
  );

  // Sync center when coordinates change externally
  useEffect(() => {
    if (value.latitude != null && value.longitude != null && !isNaN(value.latitude)) {
      setCenter({ lat: value.latitude, lng: value.longitude });
    }
  }, [value.latitude, value.longitude]);

  // Coordinates text input state
  const [coordsInput, setCoordsInput] = useState<string>(
    value.coordinates ||
      (value.latitude != null && value.longitude != null
        ? `${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`
        : ""),
  );

  useEffect(() => {
    if (value.coordinates) {
      setCoordsInput(value.coordinates);
    } else if (value.latitude != null && value.longitude != null) {
      setCoordsInput(`${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`);
    }
  }, [value.coordinates, value.latitude, value.longitude]);

  // Map DOM & Dragging state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 600,
    height: 270,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    centerPx: { x: number; y: number };
    moved: boolean;
    active: boolean;
  }>({
    startX: 0,
    startY: 0,
    centerPx: { x: 0, y: 0 },
    moved: false,
    active: false,
  });

  // Track map container size changes
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isExpanded, activeTab]);

  // Non-passive wheel listener for smooth zooming without scrolling the parent page
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoom((z) => Math.min(18, z + 1));
      } else if (e.deltaY > 0) {
        setZoom((z) => Math.max(4, z - 1));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Geolocation state
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Search Bar inside Map
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      name: string;
      displayName: string;
      lat: number;
      lng: number;
      isPreset?: boolean;
      city?: string;
      district?: string;
      state?: string;
    }>
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Google Maps Assistant states
  const [gmapsPasteInput, setGmapsPasteInput] = useState("");
  const [gmapsResolving, setGmapsResolving] = useState(false);
  const [gmapsResolveError, setGmapsResolveError] = useState<string | null>(null);
  const [gmapsParsedPreview, setGmapsParsedPreview] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [importSuccessAlert, setImportSuccessAlert] = useState<string | null>(null);

  // Real-time parser for Google Maps Assistant paste input
  useEffect(() => {
    if (!gmapsPasteInput.trim()) {
      setGmapsParsedPreview(null);
      setGmapsResolveError(null);
      return;
    }

    const trimmed = gmapsPasteInput.trim();

    // Check if it's a short link: maps.app.goo.gl or goo.gl/maps
    if (trimmed.includes("maps.app.goo.gl") || trimmed.includes("goo.gl/maps")) {
      setGmapsResolveError(null);
      setGmapsParsedPreview(null);
      // Debounce short link resolver API call
      const timer = setTimeout(async () => {
        setGmapsResolving(true);
        try {
          const res = await fetch("/api/public/v1/resolve-maps-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: trimmed }),
          });
          const data = await res.json();
          if (res.ok && data.latitude && data.longitude) {
            setGmapsParsedPreview({
              lat: data.latitude,
              lng: data.longitude,
              name: data.name,
            });
            setGmapsResolveError(null);
          } else {
            setGmapsResolveError(
              data.error ||
                "Could not extract coordinates from short link. Please right-click location on Google Maps and copy coordinates directly.",
            );
          }
        } catch {
          setGmapsResolveError("Network error while resolving short link.");
        } finally {
          setGmapsResolving(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    // Direct parser for standard URLs, coordinates, and DMS strings
    const parsed = parseLocationInput(trimmed);
    if (parsed) {
      setGmapsParsedPreview(parsed);
      setGmapsResolveError(null);
    } else {
      setGmapsParsedPreview(null);
      if (trimmed.length > 8) {
        setGmapsResolveError("Could not recognize coordinates or Google Maps format.");
      }
    }
  }, [gmapsPasteInput]);

  // Handle Debounced Map Search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    // First filter local presets immediately
    const matchedPresets = CAMPUS_PRESETS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        (p.district && p.district.toLowerCase().includes(q)) ||
        p.locationName.toLowerCase().includes(q),
    ).map((p) => ({
      name: p.name,
      displayName: p.locationName,
      lat: p.lat,
      lng: p.lng,
      isPreset: true,
      city: p.city,
      district: p.district,
      state: p.state,
    }));

    setSearchResults(matchedPresets);

    // If query has at least 3 characters, also query OpenStreetMap Nominatim
    if (q.length >= 3) {
      setSearchLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              searchQuery,
            )}&limit=5&countrycodes=in`,
          );
          if (res.ok) {
            const data = await res.json();
            const osmResults = (data || []).map((item: any) => ({
              name: item.name || item.display_name.split(",")[0],
              displayName: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              isPreset: false,
            }));

            // Merge presets and OSM results
            setSearchResults((prev) => {
              const ids = new Set(prev.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`));
              const fresh = osmResults.filter(
                (o: any) => !ids.has(`${o.lat.toFixed(4)},${o.lng.toFixed(4)}`),
              );
              return [...prev, ...fresh].slice(0, 7);
            });
          }
        } catch {
          // Fallback to presets if network search fails
        } finally {
          setSearchLoading(false);
        }
      }, 350);
    }
  }, [searchQuery]);

  // Apply location to parent form
  const applyCoordinates = useCallback(
    (
      lat: number,
      lng: number,
      landmarkName?: string,
      city?: string,
      district?: string,
      state?: string,
    ) => {
      const formatted = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setCoordsInput(formatted);
      setCenter({ lat, lng });

      onChange({
        ...value,
        coordinates: formatted,
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        location: landmarkName || value.location,
        mapUrl: `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`,
      });

      if (onCityChange && city) {
        onCityChange(city, district, state);
      }
    },
    [onChange, onCityChange, value],
  );

  // Interactive Map pointer handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const container = mapContainerRef.current;
    if (!container) return;
    try {
      container.setPointerCapture(e.pointerId);
    } catch {}

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      centerPx: latLngToPixel(center.lat, center.lng, zoom),
      moved: false,
      active: true,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragRef.current.moved = true;
    }
    const newCenterPx = {
      x: dragRef.current.centerPx.x - dx,
      y: dragRef.current.centerPx.y - dy,
    };
    const newCenter = pixelToLatLng(newCenterPx.x, newCenterPx.y, zoom);
    setCenter(newCenter);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setIsDragging(false);

    // If pointer was not dragged, treat as CLICK to drop pin!
    if (!dragRef.current.moved && mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const halfW = rect.width / 2;
      const halfH = rect.height / 2;
      const centerPx = latLngToPixel(center.lat, center.lng, zoom);
      const clickedWorldX = centerPx.x - halfW + clickX;
      const clickedWorldY = centerPx.y - halfH + clickY;
      const clickedLatLng = pixelToLatLng(clickedWorldX, clickedWorldY, zoom);

      applyCoordinates(clickedLatLng.lat, clickedLatLng.lng);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(18, prev + 1));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(4, prev - 1));
  };

  const handleRecenterToPin = () => {
    if (value.latitude != null && value.longitude != null) {
      setCenter({ lat: value.latitude, lng: value.longitude });
      setZoom(16);
    }
  };

  // Preset Selection
  const handlePresetSelect = (preset: CampusPreset) => {
    setCenter({ lat: preset.lat, lng: preset.lng });
    setZoom(16);
    applyCoordinates(
      preset.lat,
      preset.lng,
      preset.locationName,
      preset.city,
      preset.district,
      preset.state,
    );
  };

  // Device Geolocation
  const handleGeolocate = () => {
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
        setCenter({ lat, lng });
        setZoom(16);
        applyCoordinates(lat, lng, "Device GPS Location");
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(err.message || "Failed to fetch device location.");
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  // Clipboard Paste Helper for Google Maps Assistant
  const handleClipboardPaste = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        setGmapsResolveError("Clipboard reading is not supported or permission denied.");
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        setGmapsPasteInput(text);
      }
    } catch {
      setGmapsResolveError("Could not read clipboard. Please paste manually (Ctrl+V / Cmd+V).");
    }
  };

  // Apply from Google Maps Assistant
  const handleApplyGmapsImport = () => {
    if (!gmapsParsedPreview) return;
    applyCoordinates(
      gmapsParsedPreview.lat,
      gmapsParsedPreview.lng,
      gmapsParsedPreview.name,
    );
    setZoom(16);
    setCenter({ lat: gmapsParsedPreview.lat, lng: gmapsParsedPreview.lng });
    setIsGmapsAssistantOpen(false);
    setImportSuccessAlert(
      `✓ Successfully imported from Google Maps${
        gmapsParsedPreview.name ? `: ${gmapsParsedPreview.name}` : "!"
      }`,
    );
    setTimeout(() => setImportSuccessAlert(null), 4000);
  };

  // Typing into Coordinates Tab input
  const handleCoordinatesType = (input: string) => {
    setCoordsInput(input);
    const parsed = parseLocationInput(input);
    if (parsed) {
      applyCoordinates(parsed.lat, parsed.lng, parsed.name);
    } else {
      onChange({
        ...value,
        coordinates: input,
      });
    }
  };

  const hasCoordinates =
    value.latitude != null &&
    value.longitude != null &&
    !isNaN(value.latitude) &&
    !isNaN(value.longitude);

  // Compute tile range for Slippy Map rendering
  const tiles = useMemo(() => {
    const tileCount = Math.pow(2, zoom);
    const halfW = containerSize.width / 2;
    const halfH = containerSize.height / 2;
    const centerPx = latLngToPixel(center.lat, center.lng, zoom);

    const minPxX = centerPx.x - halfW;
    const maxPxX = centerPx.x + halfW;
    const minPxY = centerPx.y - halfH;
    const maxPxY = centerPx.y + halfH;

    const startTileX = Math.floor(minPxX / 256);
    const endTileX = Math.floor(maxPxX / 256);
    const startTileY = Math.floor(minPxY / 256);
    const endTileY = Math.floor(maxPxY / 256);

    const result: Array<{
      key: string;
      src: string;
      left: number;
      top: number;
    }> = [];

    for (let x = startTileX; x <= endTileX; x++) {
      for (let y = startTileY; y <= endTileY; y++) {
        if (y < 0 || y >= tileCount) continue;
        const normX = ((x % tileCount) + tileCount) % tileCount;
        const sub = ["a", "b", "c"][(normX + y) % 3];
        const src =
          mapStyle === "carto"
            ? `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${normX}/${y}.png`
            : `https://${sub}.tile.openstreetmap.org/${zoom}/${normX}/${y}.png`;

        result.push({
          key: `${zoom}-${x}-${y}`,
          src,
          left: x * 256 - minPxX,
          top: y * 256 - minPxY,
        });
      }
    }
    return result;
  }, [center.lat, center.lng, zoom, containerSize.width, containerSize.height, mapStyle]);

  // Compute marker pixel position on screen
  const markerPos = useMemo(() => {
    if (!hasCoordinates) return null;
    const halfW = containerSize.width / 2;
    const halfH = containerSize.height / 2;
    const centerPx = latLngToPixel(center.lat, center.lng, zoom);
    const markerPx = latLngToPixel(value.latitude!, value.longitude!, zoom);
    const left = markerPx.x - centerPx.x + halfW;
    const top = markerPx.y - centerPx.y + halfH;

    const isVisible =
      left >= -30 &&
      left <= containerSize.width + 30 &&
      top >= -40 &&
      top <= containerSize.height + 40;

    return { left, top, isVisible };
  }, [hasCoordinates, value.latitude, value.longitude, center.lat, center.lng, zoom, containerSize]);

  // Google Maps search query to suggest when opening external link
  const gmapsSearchQuery =
    value.location ||
    contextQuery ||
    (hasCoordinates ? `${value.latitude},${value.longitude}` : "Kerala Engineering Colleges");

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-bg-card/70 p-3.5 space-y-3 shadow-xs">
      {/* ── HEADER & TOOLBAR ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <MapPin size={15} className="text-[var(--accent)]" />
          <span className="text-[12px] font-semibold text-text">
            Campus Location & Map Coordinates
          </span>
          <span className="text-[10px] text-[var(--accent)] font-medium px-1.5 py-0.2 bg-[var(--accent)]/10 rounded-full">
            Required
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Pick via Google Maps Assistant button */}
          <button
            type="button"
            onClick={() => setIsGmapsAssistantOpen((prev) => !prev)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isGmapsAssistantOpen
                ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs"
                : "bg-bg border-border text-text hover:border-[var(--accent)] hover:text-[var(--accent)]"
            }`}
            title="Import location directly from Google Maps link or coordinates"
          >
            <ArrowUpRight size={13} className="text-emerald-400" />
            Pick via Google Maps
          </button>

          {/* Mode Switcher */}
          <div className="flex rounded-md border border-border bg-bg p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab("map")}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                activeTab === "map"
                  ? "bg-[var(--accent)] text-white font-medium shadow-xs"
                  : "text-text-dim hover:text-text"
              }`}
            >
              🗺️ Interactive Map
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("type")}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                activeTab === "type"
                  ? "bg-[var(--accent)] text-white font-medium shadow-xs"
                  : "text-text-dim hover:text-text"
              }`}
            >
              ⌨️ Coordinates / URL
            </button>
          </div>
        </div>
      </div>

      {/* ── GOOGLE MAPS ASSISTANT MODAL / DRAWER ── */}
      {isGmapsAssistantOpen && (
        <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/5 p-3.5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                <span>📍 Import Location from Google Maps</span>
              </div>
              <p className="text-[11px] text-text-dim mt-0.5">
                Google Maps is an external site that cannot redirect back automatically. Follow
                these 2 quick steps to bring your location straight into the form:
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsGmapsAssistantOpen(false)}
              className="text-text-mute hover:text-text p-1 rounded-md cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Step 1 */}
            <div className="rounded-lg border border-border bg-bg/80 p-2.5 space-y-1.5">
              <div className="font-semibold text-text flex items-center justify-between">
                <span>Step 1: Open Google Maps</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    gmapsSearchQuery,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[var(--accent)] hover:underline inline-flex items-center gap-1 font-medium bg-[var(--accent)]/10 px-2 py-0.5 rounded cursor-pointer"
                >
                  Open Google Maps <ExternalLink size={11} />
                </a>
              </div>
              <p className="text-[11px] text-text-dim leading-relaxed">
                Find your college campus or building on Google Maps. Right-click the campus pin (or
                tap & hold on mobile) and click the <strong>coordinates at the top</strong> (e.g.{" "}
                <code className="bg-border/60 px-1 py-0.2 rounded font-mono text-[10px]">
                  11.3216, 75.9336
                </code>
                ) to copy them, or copy the link from the address bar.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-lg border border-border bg-bg/80 p-2.5 space-y-1.5">
              <div className="font-semibold text-text flex items-center justify-between">
                <span>Step 2: Paste link or coordinates</span>
                <button
                  type="button"
                  onClick={handleClipboardPaste}
                  className="text-[11px] text-[var(--accent)] hover:underline inline-flex items-center gap-1 font-medium bg-[var(--accent)]/10 px-2 py-0.5 rounded cursor-pointer"
                >
                  <ClipboardPaste size={11} /> Paste from Clipboard
                </button>
              </div>
              <p className="text-[11px] text-text-dim leading-relaxed">
                Paste any Google Maps URL, short link, or coordinate numbers below. We will
                automatically extract the location and center your map.
              </p>
            </div>
          </div>

          {/* Input Box */}
          <div className="space-y-2">
            <div className="relative">
              <Input
                value={gmapsPasteInput}
                onChange={(e) => setGmapsPasteInput(e.target.value)}
                placeholder="Paste Google Maps URL (maps.google.com/..., maps.app.goo.gl/...) or coordinates (11.3216, 75.9336)"
                className="text-xs pr-20 h-10 font-mono"
                autoFocus
              />
              {gmapsResolving ? (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-[var(--accent)]">
                  <Loader2 size={13} className="animate-spin" /> Resolving link…
                </div>
              ) : gmapsPasteInput ? (
                <button
                  type="button"
                  onClick={() => setGmapsPasteInput("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-mute hover:text-text p-1 cursor-pointer"
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>

            {/* Live Preview Card */}
            {gmapsParsedPreview && (
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-xs text-emerald-400">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                  <div className="truncate">
                    <span className="font-semibold text-text">
                      {gmapsParsedPreview.name || "Coordinates Identified"}
                    </span>
                    <span className="ml-1.5 font-mono text-[11px] text-text-dim">
                      ({gmapsParsedPreview.lat.toFixed(6)}, {gmapsParsedPreview.lng.toFixed(6)})
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleApplyGmapsImport}
                  className="h-7 px-3 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 ml-2"
                >
                  Apply to Form
                </Button>
              </div>
            )}

            {gmapsResolveError && (
              <p className="text-[11px] text-amber-400 flex items-center gap-1">
                <AlertCircle size={12} /> {gmapsResolveError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Success alert notification */}
      {importSuccessAlert && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-md px-3 py-2 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{importSuccessAlert}</span>
        </div>
      )}

      {/* ── MODE 1: INTERACTIVE MAP ── */}
      {activeTab === "map" && (
        <div className="space-y-2.5">
          {/* Campus Presets & GPS Auto-detect */}
          <div className="space-y-1.5 pb-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-dim flex items-center gap-1">
                <Sparkles size={12} className="text-[var(--accent)]" /> Quick College Campus Presets:
              </span>
              <button
                type="button"
                onClick={handleGeolocate}
                disabled={geoLoading}
                className="text-[10px] text-[var(--accent)] hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
              >
                <Navigation size={10} />
                {geoLoading ? "Detecting GPS..." : "Auto-detect Device Location"}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
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
                        ? "bg-[var(--accent)] text-white border-[var(--accent)] font-semibold shadow-xs"
                        : "bg-bg border-border text-text-dim hover:text-text hover:border-border-hover hover:bg-bg-hover"
                    }`}
                  >
                    📍 {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Box on Map */}
          <div className="relative z-20">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-mute pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search campus, college, or landmark (e.g. NIT Calicut, CET, CUSAT...)"
                className="w-full h-8 rounded-lg border border-border bg-bg pl-8 pr-16 text-xs text-text placeholder:text-text-mute focus:border-[var(--accent)] focus:outline-none"
              />
              {searchLoading ? (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-mute hover:text-text p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              ) : null}
            </div>

            {/* Search Dropdown */}
            {searchFocused && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-xl border border-border bg-bg-card shadow-2xl p-1 backdrop-blur-xl">
                {searchResults.map((item, idx) => (
                  <button
                    key={`${item.lat}-${item.lng}-${idx}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyCoordinates(
                        item.lat,
                        item.lng,
                        item.displayName,
                        item.city,
                        item.district,
                        item.state,
                      );
                      setCenter({ lat: item.lat, lng: item.lng });
                      setZoom(16);
                      setSearchQuery("");
                      setSearchFocused(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-bg-hover flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold text-text truncate flex items-center gap-1.5">
                        <MapPin size={12} className="text-[var(--accent)] shrink-0" />
                        <span>{item.name}</span>
                        {item.isPreset && (
                          <Badge tone="cyan" className="text-[9px] py-0 px-1">
                            Preset
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-text-dim truncate pl-4">
                        {item.displayName}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-text-mute shrink-0">
                      {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── INTERACTIVE SLIPPY MAP CANVAS ── */}
          <div
            ref={mapContainerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onDoubleClick={(e) => {
              // Double click to zoom in at point
              const rect = mapContainerRef.current?.getBoundingClientRect();
              if (rect) {
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                const halfW = rect.width / 2;
                const halfH = rect.height / 2;
                const centerPx = latLngToPixel(center.lat, center.lng, zoom);
                const clickedWorldX = centerPx.x - halfW + clickX;
                const clickedWorldY = centerPx.y - halfH + clickY;
                const newCenter = pixelToLatLng(clickedWorldX, clickedWorldY, zoom);
                setCenter(newCenter);
                setZoom((z) => Math.min(18, z + 1));
              }
            }}
            style={{ height: isExpanded ? "420px" : "270px" }}
            className={`relative w-full rounded-[var(--radius-md)] border border-border bg-[#0a0f18] select-none overflow-hidden group shadow-inner transition-all duration-300 ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            title="Click anywhere to drop campus pin · Drag to pan map · Scroll wheel to zoom"
          >
            {/* Map Tiles Layer */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {tiles.map((tile) => (
                <img
                  key={tile.key}
                  src={tile.src}
                  alt="map-tile"
                  loading="lazy"
                  draggable={false}
                  className="absolute w-[256px] h-[256px] opacity-90 brightness-95 contrast-105 pointer-events-none user-select-none"
                  style={{
                    transform: `translate3d(${tile.left}px, ${tile.top}px, 0)`,
                  }}
                />
              ))}
            </div>

            {/* Subtle radial vignette */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_24px_rgba(0,0,0,0.5)]" />

            {/* Map Pin Marker */}
            {markerPos && (
              <div
                className="absolute pointer-events-none transition-transform duration-75 ease-out -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${markerPos.left}px`,
                  top: `${markerPos.top}px`,
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="bg-[var(--accent)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap mb-0.5 border border-white/20">
                    {value.location || "Campus Pin"}
                  </div>
                  <MapPin
                    size={28}
                    className="text-[var(--accent)] drop-shadow-[0_4px_12px_rgba(255,100,50,0.8)] fill-[var(--accent)]"
                  />
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-ping -mt-1.5 shadow" />
                </div>
              </div>
            )}

            {/* Indicator when pin is panned out of view */}
            {markerPos && !markerPos.isVisible && hasCoordinates && (
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30">
                <button
                  type="button"
                  onClick={handleRecenterToPin}
                  className="bg-black/85 hover:bg-black text-[var(--accent)] text-[11px] font-medium px-2.5 py-1 rounded-full border border-[var(--accent)]/40 shadow-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LocateFixed size={12} /> Pin is outside view · Click to center
                </button>
              </div>
            )}

            {/* Zoom Controls (+ and -) */}
            <div className="absolute top-2.5 right-2.5 z-30 flex flex-col rounded-lg border border-border bg-black/80 backdrop-blur shadow-md overflow-hidden">
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 18}
                className="p-1.5 text-text-dim hover:text-text hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn size={15} />
              </button>
              <div className="h-px bg-border/60" />
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 4}
                className="p-1.5 text-text-dim hover:text-text hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut size={15} />
              </button>
            </div>

            {/* Bottom-right tools: Recenter, Style, Expand */}
            <div className="absolute bottom-2.5 right-2.5 z-30 flex items-center gap-1.5">
              {hasCoordinates && (
                <button
                  type="button"
                  onClick={handleRecenterToPin}
                  className="bg-black/80 backdrop-blur border border-border hover:border-[var(--accent)] hover:text-[var(--accent)] text-text-dim p-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                  title="Recenter on current campus pin"
                >
                  <LocateFixed size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setMapStyle((s) => (s === "osm" ? "carto" : "osm"))}
                className="bg-black/80 backdrop-blur border border-border hover:text-text text-text-dim px-2 py-1 rounded-lg text-[10px] font-medium shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                title="Switch map tiles style"
              >
                <Layers size={12} />
                {mapStyle === "osm" ? "OSM" : "Carto"}
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="bg-black/80 backdrop-blur border border-border hover:text-text text-text-dim p-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                title={isExpanded ? "Collapse map height" : "Expand map view"}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>

            {/* Floating Coordinate & Zoom Level Indicator */}
            <div className="absolute bottom-2.5 left-2.5 z-30 pointer-events-none bg-black/80 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-mono text-text-dim border border-white/10 flex items-center gap-2 shadow-sm">
              <span className="font-semibold text-text">
                Zoom {zoom}x ({getZoomLevelLabel(zoom)})
              </span>
              <span className="text-white/20">|</span>
              {hasCoordinates ? (
                <span className="text-[var(--accent)] font-medium">
                  📍 {value.latitude?.toFixed(5)}, {value.longitude?.toFixed(5)}
                </span>
              ) : (
                <span>👆 Click map to drop pin</span>
              )}
            </div>
          </div>

          {/* Map Helper Instructions and External Verification Link */}
          <div className="text-[11px] text-text-dim flex items-center justify-between flex-wrap gap-2">
            <span>
              💡 <strong>Tip:</strong> Click anywhere on the map to drop the pin. Use{" "}
              <strong>+ / -</strong> or mouse wheel to zoom in to campus buildings.
            </span>
            {hasCoordinates && (
              <a
                href={
                  value.mapUrl ||
                  `https://www.google.com/maps?q=${value.latitude},${value.longitude}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                title="Open external Google Maps to verify this exact pinned location"
              >
                Verify pin on Google Maps ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── MODE 2: TYPE COORDINATES OR URL ── */}
      {activeTab === "type" && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <FieldLabel className="mb-0">
                Coordinates or Google Maps Link / Share URL
              </FieldLabel>
              <button
                type="button"
                onClick={handleClipboardPaste}
                className="text-[11px] text-[var(--accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <ClipboardPaste size={11} /> Paste
              </button>
            </div>
            <div className="relative">
              <Input
                value={coordsInput}
                onChange={(e) => handleCoordinatesType(e.target.value)}
                placeholder="e.g. 11.3216, 75.9336 or paste Google Maps URL"
                className="font-mono text-xs pr-24"
              />
              <button
                type="button"
                onClick={handleGeolocate}
                disabled={geoLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[var(--accent)] hover:underline px-2 py-1 rounded flex items-center gap-1 bg-bg border border-border cursor-pointer"
                title="Use device GPS"
              >
                <Crosshair size={12} />
                {geoLoading ? "Locating…" : "GPS"}
              </button>
            </div>
            <p className="text-[10px] text-text-dim mt-1">
              Supports decimal coordinates (e.g.{" "}
              <code className="font-mono bg-bg px-1 rounded">11.3216, 75.9336</code>), DMS, or
              direct Google Maps place URLs.
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
                    applyCoordinates(lat, lng);
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
                    applyCoordinates(lat, lng);
                  }
                }}
                placeholder="75.9336"
                className="font-mono text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Campus Area / Landmark Name Input */}
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
          placeholder="e.g. NIT Calicut Campus, Kattangal, Kozhikode"
          className="text-xs"
        />
      </div>

      {geoError && (
        <p className="text-[11px] text-red-400 flex items-center gap-1">
          <AlertCircle size={12} /> {geoError}
        </p>
      )}

      {/* ── SELECTED LOCATION READY SUMMARY BADGE ── */}
      {hasCoordinates ? (
        <div className="flex items-center justify-between bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg px-3 py-2 text-xs text-[var(--accent)]">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
            <div className="truncate">
              <span className="font-semibold text-text">
                {value.location || "Campus Pin Selected"}
              </span>
              <span className="ml-1.5 font-mono text-[11px] text-text-dim">
                ({value.latitude?.toFixed(6)}, {value.longitude?.toFixed(6)})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${value.latitude?.toFixed(6)}, ${value.longitude?.toFixed(6)}`,
                );
                setCopiedSuccess(true);
                setTimeout(() => setCopiedSuccess(false), 2000);
              }}
              className="p-1 text-text-dim hover:text-text cursor-pointer transition-colors"
              title="Copy coordinates"
            >
              {copiedSuccess ? (
                <Check size={13} className="text-emerald-400" />
              ) : (
                <Copy size={13} />
              )}
            </button>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-[var(--accent)] text-white px-2 py-0.5 rounded">
              Ready
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-border/40 rounded-lg px-3 py-2 text-[11px] text-text-dim">
          <AlertCircle size={14} className="text-amber-400 shrink-0" />
          <span>
            Please click on the interactive map above, pick from presets, or use{" "}
            <strong className="text-text">&quot;Pick via Google Maps&quot;</strong> to set your
            campus location.
          </span>
        </div>
      )}
    </div>
  );
}
