"use client";

import { useEffect, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldData from "world-atlas/countries-110m.json";
import { countries as staticCountries } from "@/data/countries";
import { fetchWorldCountries } from "@/lib/progress";
import type { Country } from "@/types/game";
import CountryPin from "./CountryPin";
import WorldIntroOverlay, { WORLD_INTRO_SEEN_KEY } from "./WorldIntroOverlay";

/* ─────────────────────────────────────────────────────────────────────────
   Real Natural Earth geography (world-atlas 110m) rendered with d3-geo.
   The projection is computed once at module load and shared by the SVG
   paths and the pin anchors so every pin lands on its exact lon/lat.
   ───────────────────────────────────────────────────────────────────────── */

const MAP_W = 1600;
const MAP_H = 900;

type CountryProps = { name?: string };
type CountryFeature = Feature<Geometry, CountryProps>;

const topology = worldData as unknown as Topology<{
  countries: GeometryCollection<CountryProps>;
}>;

// Exclude Antarctica (ISO numeric "010") to focus on inhabited continents.
const landFeatures: CountryFeature[] = (
  feature(topology, topology.objects.countries) as FeatureCollection<
    Geometry,
    CountryProps
  >
).features.filter((f) => String(f.id) !== "010");

const landCollection: FeatureCollection<Geometry, CountryProps> = {
  type: "FeatureCollection",
  features: landFeatures,
};

const projection = geoNaturalEarth1().fitExtent(
  [
    [10, 10],
    [MAP_W - 10, MAP_H - 10],
  ],
  landCollection
);
const pathGen = geoPath(projection);

const HIGHLIGHTED_COUNTRIES = new Set(["United States of America", "United Kingdom"]);

const countryPaths = landFeatures
  .map((f, i) => ({
    key: `${f.id ?? "x"}-${i}`,
    name: f.properties?.name ?? "",
    d: pathGen(f) ?? "",
  }))
  .filter((p) => p.d);

/** Mission countries anchored by geographic [lon, lat]. */
const PIN_GEO: Record<string, [number, number]> = {
  usa: [-98, 39],
  england: [-1.5, 52.5],
};

function alignCountryPositions(list: Country[]): Country[] {
  return list.map((c) => {
    const geo = PIN_GEO[c.id.toLowerCase()];
    if (!geo) return c;
    const pt = projection(geo);
    if (!pt) return c;
    return {
      ...c,
      position: {
        x: `${((pt[0] / MAP_W) * 100).toFixed(2)}%`,
        y: `${((pt[1] / MAP_H) * 100).toFixed(2)}%`,
      },
    };
  });
}

/**
 * WorldMap — authentic geographic adventure map in an Orange-Amber palette.
 *
 * Hydrates country pins from Supabase (`public.countries`) while initializing
 * synchronously from static fallback data to prevent any layout shift.
 */
export default function WorldMap() {
  const [countryList, setCountryList] = useState<Country[]>(() =>
    alignCountryPositions(staticCountries)
  );
  const [showIntro, setShowIntro] = useState(false);

  // First-time visit auto-trigger: check localStorage on mount
  useEffect(() => {
    try {
      const seen = localStorage.getItem(WORLD_INTRO_SEEN_KEY);
      if (seen === null) {
        setShowIntro(true);
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchWorldCountries().then((fetched) => {
      if (isMounted && fetched.length > 0) {
        setCountryList(alignCountryPositions(fetched));
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="world-map-section" aria-label="World map">
      <div className="world-map-container">
        {/* ── Ocean / SVG backdrop ── */}
        <div className="world-map-ocean" aria-hidden="true">
          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            className="world-map-svg"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <linearGradient id="continentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FDBA74" stopOpacity="0.95" />
                <stop offset="55%" stopColor="#FB923C" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="highlightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#EA580C" />
              </linearGradient>
              <filter id="continentShadow" x="-4%" y="-4%" width="108%" height="112%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(120,53,15,0.26)" />
              </filter>
            </defs>

            {/* ── Lat/lon graticule ── */}
            {[200, 400, 600, 800, 1000, 1200, 1400].map((x) => (
              <line
                key={`v${x}`}
                x1={x}
                y1="0"
                x2={x}
                y2={MAP_H}
                stroke="rgba(180,83,9,0.08)"
                strokeWidth="1"
                strokeDasharray="5 14"
              />
            ))}
            {[150, 300, 450, 600, 750].map((y) => (
              <line
                key={`h${y}`}
                x1="0"
                y1={y}
                x2={MAP_W}
                y2={y}
                stroke="rgba(180,83,9,0.08)"
                strokeWidth="1"
                strokeDasharray="5 14"
              />
            ))}

            {/* ── Real country polygons ── */}
            <g filter="url(#continentShadow)">
              {countryPaths.map((p) => (
                <path
                  key={p.key}
                  d={p.d}
                  fill={
                    HIGHLIGHTED_COUNTRIES.has(p.name)
                      ? "url(#highlightGradient)"
                      : "url(#continentGradient)"
                  }
                  stroke="#FFF7ED"
                  strokeWidth="0.6"
                  strokeLinejoin="round"
                />
              ))}
            </g>
          </svg>

          <span className="map-deco map-deco--plane" aria-hidden="true">
            ✈️
          </span>
          <span className="map-deco map-deco--compass" aria-hidden="true">
            🧭
          </span>
        </div>

        {/* ── Country Pins ── */}
        <div className="world-map-pins" aria-label="Countries">
          {countryList.map((country) => (
            <CountryPin key={country.id} country={country} />
          ))}
        </div>
      </div>

      {/* ── Legend & Persistent Rewatch Intro Button ── */}
      <div className="map-legend flex flex-wrap items-center justify-between gap-3" aria-label="Map legend">
        <div className="flex flex-wrap items-center gap-4">
          <span className="legend-item legend-item--available">
            <span className="legend-dot legend-dot--available" aria-hidden="true" />
            Available
          </span>
          <span className="legend-item legend-item--locked">
            <span className="legend-dot legend-dot--locked" aria-hidden="true" />
            Coming Soon
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowIntro(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/90 bg-white/90 px-3.5 py-1.5 text-xs font-extrabold text-orange-800 shadow-sm backdrop-blur-xs transition hover:border-orange-400 hover:bg-orange-50 cursor-pointer"
          aria-label="Watch World Intro Video"
        >
          <span aria-hidden="true">🎬</span>
          <span>Watch Intro</span>
        </button>
      </div>

      {/* ── Cinematic World Intro Video Overlay ── */}
      {showIntro && (
        <WorldIntroOverlay onClose={() => setShowIntro(false)} />
      )}
    </section>
  );
}
