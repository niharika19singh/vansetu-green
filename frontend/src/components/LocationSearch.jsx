/**
 * LocationSearch.jsx — Autocomplete Search Bar for NCT Delhi Locations.
 *
 * Implements:
 * - Debounced typing (300ms) with OpenStreetMap Nominatim geocoding biased to Delhi bounding box
 * - Instant offline fallback suggestions for popular Delhi commercial, transit, and residential hubs
 * - Full keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * - Click-outside dismiss and clean search reset
 * - VanSetu Green glassmorphic styling
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

// Curated Delhi Landmarks & Transit Nodes (instant offline fallback index)
export const DELHI_LANDMARKS = [
  { name: 'Connaught Place (Rajiv Chowk)', shortName: 'Connaught Place', lat: 28.6315, lon: 77.2167, district: 'Central Delhi' },
  { name: 'India Gate & Central Vista', shortName: 'India Gate', lat: 28.6129, lon: 77.2295, district: 'New Delhi' },
  { name: 'Chandni Chowk & Old Delhi', shortName: 'Chandni Chowk', lat: 28.6506, lon: 77.2303, district: 'North Delhi' },
  { name: 'Rohini Sector-16 Sub-City', shortName: 'Rohini Sector 16', lat: 28.7325, lon: 77.1199, district: 'North West Delhi' },
  { name: 'Dwarka Sector-21 Transit Hub', shortName: 'Dwarka Sector 21', lat: 28.5524, lon: 77.0583, district: 'South West Delhi' },
  { name: 'Saket & Select Citywalk Corridor', shortName: 'Saket', lat: 28.5245, lon: 77.2167, district: 'South Delhi' },
  { name: 'Lajpat Nagar Central Market', shortName: 'Lajpat Nagar', lat: 28.5700, lon: 77.2400, district: 'South East Delhi' },
  { name: 'Karol Bagh Market Avenue', shortName: 'Karol Bagh', lat: 28.6514, lon: 77.1907, district: 'Central Delhi' },
  { name: 'Anand Vihar ISBT & Terminal', shortName: 'Anand Vihar', lat: 28.6469, lon: 77.3164, district: 'East Delhi' },
  { name: 'Mayur Vihar Phase-1 Corridor', shortName: 'Mayur Vihar', lat: 28.6075, lon: 77.2986, district: 'East Delhi' },
  { name: 'AIIMS & Safdarjung Hospital Zone', shortName: 'AIIMS Delhi', lat: 28.5672, lon: 77.2100, district: 'South Delhi' },
  { name: 'IIT Delhi & Hauz Khas Enclave', shortName: 'Hauz Khas', lat: 28.5450, lon: 77.1926, district: 'South Delhi' },
  { name: 'Janakpuri District Centre', shortName: 'Janakpuri', lat: 28.6289, lon: 77.0818, district: 'West Delhi' },
  { name: 'Pitampura TV Tower Corridor', shortName: 'Pitampura', lat: 28.6989, lon: 77.1384, district: 'North West Delhi' },
  { name: 'Kashmere Gate ISBT & Heritage Hub', shortName: 'Kashmere Gate', lat: 28.6675, lon: 77.2285, district: 'North Delhi' },
];

export default function LocationSearch({ onLocationFound, onSelectLocation }) {
  const handleSelect = onSelectLocation || onLocationFound;

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const fetchSuggestions = useCallback(async (text) => {
    const trimmed = text.trim();
    if (trimmed.length < MIN_CHARS) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // Match curated offline locations first
    const offlineMatches = DELHI_LANDMARKS.filter(
      (item) =>
        item.name.toLowerCase().includes(trimmed.toLowerCase()) ||
        item.shortName.toLowerCase().includes(trimmed.toLowerCase()) ||
        item.district.toLowerCase().includes(trimmed.toLowerCase())
    ).slice(0, 4);

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&viewbox=76.73,28.87,77.35,28.40&bounded=0&q=${encodeURIComponent(
          trimmed
        )}`,
        { signal: controller.signal }
      );
      if (res.ok) {
        const data = await res.json();
        const onlineResults = data.map((item) => ({
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          name: item.display_name,
          shortName: item.display_name.split(',').slice(0, 2).join(', ').trim(),
          district: item.address?.state_district || item.address?.city || 'Delhi',
        }));

        // Deduplicate
        const combined = [...offlineMatches];
        for (const item of onlineResults) {
          if (!combined.some((c) => Math.abs(c.lat - item.lat) < 0.005 && Math.abs(c.lon - item.lon) < 0.005)) {
            combined.push(item);
          }
        }
        setSuggestions(combined.slice(0, 6));
        setShowDropdown(combined.length > 0);
      } else {
        setSuggestions(offlineMatches);
        setShowDropdown(offlineMatches.length > 0);
      }
      setActiveIndex(-1);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setSuggestions(offlineMatches);
        setShowDropdown(offlineMatches.length > 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, DEBOUNCE_MS);
  };

  const selectSuggestion = (suggestion) => {
    setQuery(suggestion.shortName || suggestion.name);
    setShowDropdown(false);
    setSuggestions([]);
    if (handleSelect) {
      handleSelect({
        lat: suggestion.lat,
        lon: suggestion.lon,
        name: suggestion.shortName || suggestion.name,
      });
    }
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter') {
        fetchSuggestions(query);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          selectSuggestion(suggestions[activeIndex]);
        } else if (suggestions.length > 0) {
          selectSuggestion(suggestions[0]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <div className="relative text-xs select-none" ref={wrapperRef}>
      <div className="flex items-center gap-1.5 bg-[#071C16]/90 backdrop-blur-md border border-white/10 rounded-xl px-2.5 py-1.5 shadow focus-within:border-emerald-500/70 transition w-56 sm:w-64">
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search Delhi places, landmarks…"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          className="bg-transparent text-slate-100 placeholder-slate-400 text-xs outline-none w-full"
          aria-label="Search location in Delhi"
          autoComplete="off"
        />
        {loading && <Loader2 className="w-3 h-3 text-emerald-400 animate-spin shrink-0" />}
        {query && !loading && (
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-400 hover:text-white p-0.5 rounded transition"
            aria-label="Clear location search"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 mt-1.5 w-72 bg-[#071C16]/98 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl overflow-hidden z-[500] max-h-60 overflow-y-auto divide-y divide-white/5">
          {suggestions.map((s, idx) => (
            <li
              key={idx}
              className={`px-3 py-2 cursor-pointer flex items-start gap-2.5 transition ${
                idx === activeIndex ? 'bg-emerald-600/30 text-white' : 'hover:bg-white/5 text-slate-300'
              }`}
              onClick={() => selectSuggestion(s)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[11px] text-white truncate">{s.shortName}</div>
                <div className="text-[10px] text-slate-400 truncate">{s.name}</div>
              </div>
            </li>
          ))}
          <li className="px-3 py-1 text-[9px] text-slate-400 bg-black/40 text-right">
            OpenStreetMap Delhi NCT
          </li>
        </ul>
      )}
    </div>
  );
}
