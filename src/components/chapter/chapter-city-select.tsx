"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, MapPin, ChevronDown, Check, Sparkles, X } from "lucide-react";
import { FieldLabel, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getAllStates,
  getDistrictsForState,
  getCitiesForDistrict,
  getAllIndianCities,
  CITY_COORDINATES,
  type CityOption,
} from "@/lib/data/india-geo";

export interface ChapterLocationSelection {
  city: string;
  district?: string;
  state?: string;
  lat?: number;
  lng?: number;
}

interface ChapterCitySelectProps {
  city: string;
  district?: string;
  state?: string;
  onChange: (selection: ChapterLocationSelection) => void;
  onCoordinatesSuggest?: (coords: { lat: number; lng: number }) => void;
  disabled?: boolean;
}

export function ChapterCitySelect({
  city,
  district = "",
  state = "Kerala",
  onChange,
  onCoordinatesSuggest,
  disabled = false,
}: ChapterCitySelectProps) {
  const [mode, setMode] = useState<"search" | "browse">("search");
  // Single controlled input value
  const [inputValue, setInputValue] = useState(city || "");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedState, setSelectedState] = useState(state || "Kerala");
  const [selectedDistrict, setSelectedDistrict] = useState(district || "");
  const [customCityMode, setCustomCityMode] = useState(false);
  const [customCityInput, setCustomCityInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // All flat cities cached
  const allCities = useMemo(() => getAllIndianCities(), []);

  // Sync internal state when external city prop changes (e.g. preset clicked or form reset)
  useEffect(() => {
    setInputValue(city || "");
  }, [city]);

  useEffect(() => {
    if (state && state !== selectedState) {
      setSelectedState(state);
    }
  }, [state]);

  useEffect(() => {
    if (district && district !== selectedDistrict) {
      setSelectedDistrict(district);
    }
  }, [district]);

  // Click outside listener for search dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered search results based on inputValue
  const filteredOptions = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) {
      // Return prominent hubs & Kerala campuses first when search is empty
      return allCities
        .filter(
          (c) =>
            c.state === "Kerala" ||
            [
              "Bengaluru (Bangalore)",
              "Chennai (Madras)",
              "Mumbai",
              "New Delhi",
              "Hyderabad",
              "Pune",
            ].includes(c.city)
        )
        .slice(0, 14);
    }
    return allCities
      .filter((opt) => {
        return (
          opt.city.toLowerCase().includes(q) ||
          opt.district.toLowerCase().includes(q) ||
          opt.state.toLowerCase().includes(q)
        );
      })
      .slice(0, 16);
  }, [inputValue, allCities]);

  // Districts for currently selected state
  const stateDistricts = useMemo(() => {
    return getDistrictsForState(selectedState);
  }, [selectedState]);

  // Cities for selected state & district
  const districtCities = useMemo(() => {
    if (!selectedDistrict) return [];
    return getCitiesForDistrict(selectedState, selectedDistrict);
  }, [selectedState, selectedDistrict]);

  function handleSelectOption(opt: CityOption) {
    setInputValue(opt.city);
    setSelectedState(opt.state);
    setSelectedDistrict(opt.district);
    setIsOpen(false);
    setCustomCityMode(false);

    onChange({
      city: opt.city,
      district: opt.district,
      state: opt.state,
      lat: opt.lat,
      lng: opt.lng,
    });

    if (opt.lat != null && opt.lng != null && onCoordinatesSuggest) {
      onCoordinatesSuggest({ lat: opt.lat, lng: opt.lng });
    }
  }

  function handleStateChange(newState: string) {
    setSelectedState(newState);
    const newDistricts = getDistrictsForState(newState);
    const defaultDist = newDistricts[0] || "";
    setSelectedDistrict(defaultDist);
    const cities = getCitiesForDistrict(newState, defaultDist);
    const defaultCity = cities[0] || "";

    setInputValue(defaultCity);
    const coords = CITY_COORDINATES[defaultCity];
    onChange({
      city: defaultCity,
      district: defaultDist,
      state: newState,
      lat: coords?.lat,
      lng: coords?.lng,
    });

    if (coords && onCoordinatesSuggest) {
      onCoordinatesSuggest(coords);
    }
  }

  function handleDistrictChange(newDistrict: string) {
    setSelectedDistrict(newDistrict);
    const cities = getCitiesForDistrict(selectedState, newDistrict);
    const defaultCity = cities[0] || "";

    setInputValue(defaultCity);
    const coords = CITY_COORDINATES[defaultCity];
    onChange({
      city: defaultCity,
      district: newDistrict,
      state: selectedState,
      lat: coords?.lat,
      lng: coords?.lng,
    });

    if (coords && onCoordinatesSuggest) {
      onCoordinatesSuggest(coords);
    }
  }

  function handleCityDropdownChange(newCity: string) {
    if (newCity === "__custom__") {
      setCustomCityMode(true);
      setCustomCityInput(city && !districtCities.includes(city) ? city : "");
      return;
    }
    setCustomCityMode(false);
    setInputValue(newCity);
    const coords = CITY_COORDINATES[newCity];
    onChange({
      city: newCity,
      district: selectedDistrict,
      state: selectedState,
      lat: coords?.lat,
      lng: coords?.lng,
    });

    if (coords && onCoordinatesSuggest) {
      onCoordinatesSuggest(coords);
    }
  }

  function handleClear() {
    setInputValue("");
    setIsOpen(true);
    onChange({
      city: "",
      district: selectedDistrict,
      state: selectedState,
    });
  }

  return (
    <div className="space-y-2 relative z-30" ref={containerRef}>
      <div className="flex items-center justify-between">
        <FieldLabel className="mb-0">
          City & Region <span className="text-[var(--accent)] font-medium">*</span>
        </FieldLabel>
        <div className="flex items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => setMode("search")}
            className={`rounded-full px-2.5 py-0.5 font-medium transition-colors cursor-pointer ${
              mode === "search"
                ? "bg-[var(--accent)] text-white shadow-xs"
                : "text-text-dim hover:text-text"
            }`}
          >
            Quick search
          </button>
          <span className="text-text-mute">·</span>
          <button
            type="button"
            onClick={() => setMode("browse")}
            className={`rounded-full px-2.5 py-0.5 font-medium transition-colors cursor-pointer ${
              mode === "browse"
                ? "bg-[var(--accent)] text-white shadow-xs"
                : "text-text-dim hover:text-text"
            }`}
          >
            State & District
          </button>
        </div>
      </div>

      {/* Selected location pill indicator */}
      {city ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-bg-card/70 px-3 py-1.5 text-xs text-text">
          <MapPin className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
          <span className="font-semibold text-text">{city}</span>
          {district ? (
            <span className="text-text-dim">({district} District)</span>
          ) : null}
          {state ? (
            <Badge tone="cyan" className="text-[10px] py-0 px-1.5">
              {state}
            </Badge>
          ) : null}
          <button
            type="button"
            onClick={handleClear}
            className="ml-auto text-text-mute hover:text-red-400 p-0.5 rounded cursor-pointer transition-colors"
            title="Clear and enter another city"
          >
            <X size={12} />
          </button>
        </div>
      ) : null}

      {/* Mode 1: Searchable Combobox */}
      {mode === "search" ? (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-mute pointer-events-none" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                const val = e.target.value;
                setInputValue(val);
                setIsOpen(true);
                // Propagate typed value to form in real time
                onChange({
                  city: val,
                  district: selectedDistrict,
                  state: selectedState,
                });
              }}
              onFocus={() => {
                setIsOpen(true);
              }}
              onClick={() => {
                setIsOpen(true);
              }}
              placeholder="Search or type city (e.g. Calicut, Kochi, Bengaluru...)"
              disabled={disabled}
              className="w-full h-11 rounded-full border-0 bg-bg pl-10 pr-16 text-[13px] text-text outline-none shadow-[var(--shadow-sm)] placeholder:text-text-mute focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
            {inputValue ? (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-9 top-1/2 -translate-y-1/2 p-1 text-text-mute hover:text-text rounded-full hover:bg-bg-hover transition-colors cursor-pointer"
                title="Clear text"
              >
                <X size={14} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-mute hover:text-text transition-colors p-0.5 cursor-pointer"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {isOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-2xl border border-border bg-bg-card p-1.5 shadow-2xl backdrop-blur-xl">
              <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-text-mute uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-[var(--accent)]" />
                  {inputValue.trim() ? "Matching Locations in India" : "Popular Campus Hubs"}
                </span>
                {inputValue.trim() ? (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsOpen(false);
                    }}
                    className="text-[10px] text-[var(--accent)] hover:underline normal-case font-normal cursor-pointer"
                  >
                    Done
                  </button>
                ) : null}
              </div>

              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-text-dim">
                  <p>No preset location found for &quot;{inputValue}&quot;.</p>
                  <p className="text-[11px] text-text-mute mt-1">
                    Your chapter will use: <span className="font-semibold text-text">&quot;{inputValue}&quot;</span>
                  </p>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsOpen(false);
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-[var(--accent)] hover:underline font-semibold cursor-pointer text-xs"
                  >
                    ✓ Use &quot;{inputValue}&quot; as City
                  </button>
                </div>
              ) : (
                filteredOptions.map((opt, i) => {
                  const isSelected =
                    inputValue.trim().toLowerCase() === opt.city.toLowerCase();
                  return (
                    <button
                      key={`${opt.state}-${opt.district}-${opt.city}-${i}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectOption(opt);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectOption(opt);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[var(--accent-soft)] text-text font-medium"
                          : "hover:bg-bg-hover text-text"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin
                          className={`h-3.5 w-3.5 ${
                            isSelected ? "text-[var(--accent)]" : "text-text-mute"
                          }`}
                        />
                        <div>
                          <span className="font-semibold text-text">{opt.city}</span>
                          <span className="ml-1.5 text-text-dim text-[11px]">
                            · {opt.district}, {opt.state}
                          </span>
                        </div>
                      </div>
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 text-[var(--accent)]" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      ) : (
        /* Mode 2: Hierarchical State -> District -> City Selector */
        <div className="grid gap-2 sm:grid-cols-3">
          {/* State */}
          <div>
            <label className="text-[11px] font-medium text-text-mute block mb-1">
              1. State in India
            </label>
            <Select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              disabled={disabled}
              className="text-xs"
            >
              {getAllStates().map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </Select>
          </div>

          {/* District */}
          <div>
            <label className="text-[11px] font-medium text-text-mute block mb-1">
              2. District
            </label>
            <Select
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              disabled={disabled}
              className="text-xs"
            >
              {stateDistricts.map((dst) => (
                <option key={dst} value={dst}>
                  {dst}
                </option>
              ))}
            </Select>
          </div>

          {/* City */}
          <div>
            <label className="text-[11px] font-medium text-text-mute block mb-1">
              3. City / Campus Hub
            </label>
            {!customCityMode ? (
              <Select
                value={districtCities.includes(city) ? city : (city ? "__custom__" : "")}
                onChange={(e) => handleCityDropdownChange(e.target.value)}
                disabled={disabled}
                className="text-xs"
              >
                {districtCities.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
                <option value="__custom__">➕ Other / Custom city...</option>
              </Select>
            ) : (
              <div className="flex items-center gap-1">
                <Input
                  value={customCityInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomCityInput(val);
                    setInputValue(val);
                    onChange({
                      city: val,
                      district: selectedDistrict,
                      state: selectedState,
                    });
                  }}
                  placeholder="Type city name"
                  autoFocus
                  className="text-xs h-11"
                />
                <button
                  type="button"
                  onClick={() => setCustomCityMode(false)}
                  className="text-[11px] text-text-dim hover:text-text px-2 py-1 cursor-pointer"
                  title="Back to list"
                >
                  List
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
