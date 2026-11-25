"use client";

import React from "react";
import Link from "next/link";
import type { Country } from "@/types/game";

interface CountryPinProps {
  country: Country;
  /** Optional: mark the country's mission as completed (shows "✓ Completed"). */
  isCompleted?: boolean;
}

/**
 * CountryPin — classic teardrop GPS location pin with a base ground ring and
 * the circular SVG country flag embedded in the pin head.
 *
 * Windows renders Unicode flag emojis as plain letters ("US", "GB"), so flags
 * are drawn as inline SVG art (flagcdn.com image fallback for other ISO codes).
 *
 * The pin's ground ring sits on the country's geographic coordinate
 * (WorldMap computes position.x / position.y from the map projection).
 */

const MISSION_SUBTITLES: Record<string, string> = {
  usa: "Renewable Energy",
  england: "Clean Transit & Grid",
};

const ID_TO_CODE: Record<string, string> = {
  usa: "US",
  england: "GB",
  uk: "GB",
  japan: "JP",
  singapore: "SG",
};

/* ── Flag artwork in a 60×40 coordinate space (no wrapping <svg>) ── */

function UsFlagArt() {
  const stripeH = 40 / 13;
  const stars: React.ReactNode[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
      stars.push(
        <circle key={`a${r}-${c}`} cx={2.2 + c * 3.7} cy={2.2 + r * 3.7} r={0.75} fill="#FFFFFF" />
      );
    }
  }
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      stars.push(
        <circle key={`b${r}-${c}`} cx={4.05 + c * 3.7} cy={4.05 + r * 3.7} r={0.75} fill="#FFFFFF" />
      );
    }
  }
  return (
    <>
      <rect width="60" height="40" fill="#FFFFFF" />
      {Array.from({ length: 7 }).map((_, i) => (
        <rect key={i} y={i * 2 * stripeH} width="60" height={stripeH} fill="#B22234" />
      ))}
      <rect width="24" height={stripeH * 7} fill="#3C3B6E" />
      {stars}
    </>
  );
}

function UkFlagArt() {
  return (
    <>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="7" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="3" />
      <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="12" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="7" />
    </>
  );
}

function JpFlagArt() {
  return (
    <>
      <rect width="60" height="40" fill="#FFFFFF" />
      <circle cx="30" cy="20" r="12" fill="#BC002D" />
    </>
  );
}

function SgFlagArt() {
  return (
    <>
      <rect width="60" height="20" fill="#EF3340" />
      <rect y="20" width="60" height="20" fill="#FFFFFF" />
      <circle cx="15" cy="10" r="7" fill="#FFFFFF" />
      <circle cx="18" cy="10" r="6.3" fill="#EF3340" />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i * 72 - 90) * (Math.PI / 180);
        return (
          <circle key={i} cx={19 + Math.cos(a) * 5.5} cy={10 + Math.sin(a) * 5.5} r={1.3} fill="#FFFFFF" />
        );
      })}
    </>
  );
}

function resolveCode(countryId: string, code?: string): string {
  return (ID_TO_CODE[countryId.toLowerCase()] || code || "").toUpperCase();
}

/** Crisp SVG flag drawn into a square box inside a parent <svg>. */
function FlagInSvg({
  countryId,
  code,
  fallbackEmoji,
  x,
  y,
  size,
}: {
  countryId: string;
  code?: string;
  fallbackEmoji?: string;
  x: number;
  y: number;
  size: number;
}) {
  const resolved = resolveCode(countryId, code);
  let art: React.ReactNode = null;
  switch (resolved) {
    case "US":
      art = <UsFlagArt />;
      break;
    case "GB":
    case "UK":
      art = <UkFlagArt />;
      break;
    case "JP":
      art = <JpFlagArt />;
      break;
    case "SG":
      art = <SgFlagArt />;
      break;
  }

  if (art) {
    return (
      <svg
        x={x}
        y={y}
        width={size}
        height={size}
        viewBox="0 0 60 40"
        preserveAspectRatio="xMidYMid slice"
      >
        {art}
      </svg>
    );
  }

  if (resolved.length === 2) {
    return (
      <image
        href={`https://flagcdn.com/w80/${resolved.toLowerCase()}.png`}
        x={x}
        y={y}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid slice"
      />
    );
  }

  return (
    <text
      x={x + size / 2}
      y={y + size / 2 + 5}
      textAnchor="middle"
      fontSize="16"
    >
      {fallbackEmoji || "🏳️"}
    </text>
  );
}

export default function CountryPin({ country, isCompleted = false }: CountryPinProps) {
  const { id, name, flag, unlocked, position, missionTitle } = country;
  const code = (country as unknown as { code?: string }).code;
  const subtitle = missionTitle ?? MISSION_SUBTITLES[id] ?? "";

  const uid = `pin-${id}`;
  const sizeCls = unlocked ? "h-14 w-11" : "h-12 w-10";

  const pinSvg = (
    <svg
      viewBox="0 0 56 70"
      className={`${sizeCls} overflow-visible transition-transform duration-200 group-hover:-translate-y-1 group-focus-visible:-translate-y-1`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
          {unlocked ? (
            <>
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#F97316" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#94A3B8" />
            </>
          )}
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <circle cx="28" cy="26" r="13" />
        </clipPath>
        <filter id={`${uid}-shadow`} x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(120,53,15,0.4)" />
        </filter>
      </defs>

      {/* Ground target ring (pulses when unlocked) */}
      {unlocked && (
        <ellipse
          cx="28"
          cy="64"
          rx="14"
          ry="4.5"
          fill="none"
          stroke="#F97316"
          strokeWidth="1.6"
          className="origin-center animate-ping"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      )}
      <ellipse
        cx="28"
        cy="64"
        rx="14"
        ry="4.5"
        fill={unlocked ? "rgba(249,115,22,0.25)" : "rgba(100,116,139,0.22)"}
        stroke={unlocked ? "#EA580C" : "#94A3B8"}
        strokeWidth="1.4"
      />

      {/* Teardrop pin body */}
      <path
        d="M28 4 C14.7 4 4 14.7 4 28 C4 44.5 28 62 28 62 C28 62 52 44.5 52 28 C52 14.7 41.3 4 28 4 Z"
        fill={`url(#${uid}-body)`}
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinejoin="round"
        filter={`url(#${uid}-shadow)`}
      />

      {/* Flag ring + circular flag */}
      <circle cx="28" cy="26" r="15" fill="#FFFFFF" />
      <g clipPath={`url(#${uid}-clip)`} opacity={unlocked ? 1 : 0.7}>
        <FlagInSvg
          countryId={id}
          code={code}
          fallbackEmoji={flag}
          x={15}
          y={13}
          size={26}
        />
      </g>

      {/* Lock badge on bottom-right of the pin head */}
      {!unlocked && (
        <g>
          <circle cx="42" cy="38" r="7" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.2" />
          <text x="42" y="41.5" textAnchor="middle" fontSize="9">
            🔒
          </text>
        </g>
      )}
    </svg>
  );

  const statusLabel = !unlocked
    ? "🔒 Locked — Coming Soon"
    : isCompleted
      ? "✓ Completed"
      : "▶ Click to Start Mission";

  const popover = (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 hidden w-44 -translate-x-1/2 flex-col gap-1 rounded-xl border border-orange-200 bg-white/98 p-2.5 text-left shadow-xl group-hover:flex group-focus-visible:flex"
    >
      <span className="flex items-center gap-2">
        <span className="block h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1 ring-orange-200">
          <svg viewBox="0 0 26 26" className="h-full w-full" aria-hidden="true">
            <FlagInSvg countryId={id} code={code} fallbackEmoji={flag} x={0} y={0} size={26} />
          </svg>
        </span>
        <span className="truncate text-xs font-extrabold text-slate-900">{name}</span>
      </span>
      {subtitle && (
        <span className="text-[11px] font-medium text-slate-600">{subtitle}</span>
      )}
      <span
        className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
          !unlocked
            ? "bg-slate-100 text-slate-500"
            : isCompleted
              ? "bg-emerald-100 text-emerald-700"
              : "bg-orange-100 text-orange-700"
        }`}
      >
        {statusLabel}
      </span>
    </span>
  );

  const namePill = (
    <span
      className={`absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-px text-[10px] font-extrabold shadow-xs ${
        unlocked
          ? "bg-white/90 text-slate-900 ring-1 ring-orange-300"
          : "bg-white/80 text-slate-500 ring-1 ring-slate-200"
      }`}
    >
      {name}
    </span>
  );

  const wrapperStyle: React.CSSProperties = {
    left: position.x,
    top: position.y,
    // Tip of the pin (ground ring) sits exactly on the geographic coordinate.
    transform: "translate(-50%, -94%)",
  };

  return (
    <div
      className={`country-pin ${unlocked ? "country-pin--unlocked" : "country-pin--locked"}`}
      style={wrapperStyle}
      aria-label={`${name} — ${unlocked ? "available" : "locked"}`}
    >
      {unlocked ? (
        <Link
          href={`/mission/${id}`}
          aria-label={`Start mission in ${name}${subtitle ? `: ${subtitle}` : ""}`}
          className="group relative flex cursor-pointer flex-col items-center outline-none"
        >
          {popover}
          {pinSvg}
          {namePill}
        </Link>
      ) : (
        <div
          tabIndex={0}
          aria-label={`${name} — locked, coming soon`}
          className="group relative flex flex-col items-center outline-none"
        >
          {popover}
          {pinSvg}
          {namePill}
        </div>
      )}
    </div>
  );
}
