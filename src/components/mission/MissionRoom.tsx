"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMissionById } from "@/data/missions";
import { vocabularyItems as defaultVocabItems } from "@/data/vocabulary";
import { listeningItems as defaultListenItems } from "@/data/listening";
import { sentenceItems as defaultSentenceItems } from "@/data/sentences";
import {
  DEFAULT_USA_CIRCUIT_BOARDS,
  DEFAULT_USA_SPEAKING_TURNS,
  DEFAULT_USA_TECH_RUNNER_QUESTIONS,
  DEFAULT_USA_TARGET_SMASHER_ITEMS,
  fetchMissionByCountry,
  getDefaultCulturalBriefingForCountry,
  getStaticMissionBundle,
  type CountryCulturalBriefing,
  type CountryModuleConfig,
} from "@/lib/progress";
import { useGame } from "@/context/GameContext";
import { speak, stopSpeech } from "@/lib/audio";
import PassportModal from "@/components/passport/PassportModal";
import MissionBriefing from "./MissionBriefing";
import LearningRecap from "./LearningRecap";
import CircuitRepairGame from "./CircuitRepairGame";
import TechRunnerGame from "./TechRunnerGame";
import TargetSmasherGame from "./TargetSmasherGame";
import VocabularyStage from "@/components/stages/VocabularyStage";
import ListeningStage from "@/components/stages/ListeningStage";
import SentenceStage from "@/components/stages/SentenceStage";
import type {
  ListeningItem,
  Mission,
  SentenceItem,
  VocabularyItem,
} from "@/types/game";
import type {
  CountryGameType,
  DbCountryCircuitBoard,
  DbCountrySpeakingTurn,
  DbCountryTechRunnerQuestion,
  DbCountryTargetSmasherItem,
} from "@/types/database";

type ActiveModuleView =
  | "hub"
  | "vocabulary"
  | "listening"
  | "sentence_assembler"
  | "circuit_repair"
  | "tech_runner"
  | "target_smasher"
  | "speaking-ai"
  | "briefing"
  | "recap";

interface MissionRoomProps {
  /** Dynamic country identifier (e.g., "usa") */
  countryId?: string;
  /** Mission id — defaults to "renewable-energy" for the USA mission */
  missionId?: string;
  /** Country flag emoji shown in the header */
  countryFlag?: string;
  /** Country name shown in the header */
  countryName?: string;
}

const GAME_META: Record<
  CountryGameType,
  { title: string; icon: string; metaLabel: (rounds: number) => string }
> = {
  sentence_assembler: {
    title: "Sentence Assembler",
    icon: "🧩",
    metaLabel: (rounds) => `${rounds} Rounds • Timed Challenge`,
  },
  circuit_repair: {
    title: "Circuit Repair",
    icon: "🔌",
    metaLabel: (boards) => `${boards} Circuit Boards • 3 Battery Lives`,
  },
  tech_runner: {
    title: "Tech Runner",
    icon: "🏃",
    metaLabel: (questions) => `${questions} Gate Questions • 60s 3-Lane Sprint`,
  },
  target_smasher: {
    title: "Target Smasher",
    icon: "🎯",
    metaLabel: (items) => `${items} Targets • 60s Arcade Challenge`,
  },
};

function CountryFlagIcon({
  countryId,
  fallbackEmoji,
}: {
  countryId: string;
  fallbackEmoji?: string;
}) {
  const id = countryId.toLowerCase();
  if (id === "usa" || id === "us") {
    const stripeH = 40 / 13;
    return (
      <svg
        viewBox="0 0 60 40"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <rect width="60" height="40" fill="#FFFFFF" />
        {Array.from({ length: 7 }).map((_, i) => (
          <rect
            key={i}
            y={i * 2 * stripeH}
            width="60"
            height={stripeH}
            fill="#B22234"
          />
        ))}
        <rect width="24" height={stripeH * 7} fill="#3C3B6E" />
      </svg>
    );
  }
  if (id === "england" || id === "uk" || id === "gb") {
    return (
      <svg
        viewBox="0 0 60 40"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <rect width="60" height="40" fill="#012169" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="7" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="3" />
        <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="12" />
        <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="7" />
      </svg>
    );
  }
  return (
    <span
      className="flex h-full w-full items-center justify-center bg-amber-100 text-sm"
      aria-hidden="true"
    >
      {fallbackEmoji || "🌍"}
    </span>
  );
}

function SpeakingAiStage({
  countryName,
  missionTitle,
  turns,
  onComplete,
  onBack,
}: {
  countryName: string;
  missionTitle: string;
  turns: DbCountrySpeakingTurn[];
  onComplete: () => void;
  onBack: () => void;
}) {
  const { addXP } = useGame();
  const activeTurns =
    turns && turns.length > 0 ? turns : DEFAULT_USA_SPEAKING_TURNS;

  const [turnIndex, setTurnIndex] = useState(0);
  const [practicedTurns, setPracticedTurns] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const turn = activeTurns[turnIndex] || activeTurns[0];

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  function handleListenPrompt(text: string) {
    speak(text);
  }

  function handlePracticeSpeak() {
    if (!turn) return;
    setFeedback(null);
    setTranscript("");

    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? (
            window as unknown as {
              SpeechRecognition?: new () => {
                lang: string;
                interimResults: boolean;
                onresult: (ev: {
                  results: { 0: { transcript: string } }[];
                }) => void;
                onerror: () => void;
                onend: () => void;
                start: () => void;
              };
              webkitSpeechRecognition?: new () => {
                lang: string;
                interimResults: boolean;
                onresult: (ev: {
                  results: { 0: { transcript: string } }[];
                }) => void;
                onerror: () => void;
                onend: () => void;
                start: () => void;
              };
            }
          ).SpeechRecognition ||
          (
            window as unknown as {
              webkitSpeechRecognition?: new () => {
                lang: string;
                interimResults: boolean;
                onresult: (ev: {
                  results: { 0: { transcript: string } }[];
                }) => void;
                onerror: () => void;
                onend: () => void;
                start: () => void;
              };
            }
          ).webkitSpeechRecognition
        : undefined;

    if (SpeechRecognitionCtor) {
      try {
        setIsRecording(true);
        const rec = new SpeechRecognitionCtor();
        rec.lang = "en-US";
        rec.interimResults = false;
        rec.onresult = (ev) => {
          const spoken = ev.results?.[0]?.[0]?.transcript || turn.target_line;
          setTranscript(spoken);
          markTurnDone();
        };
        rec.onerror = () => {
          setTranscript(turn.target_line);
          markTurnDone();
        };
        rec.onend = () => {
          setIsRecording(false);
        };
        rec.start();
        return;
      } catch {
        setIsRecording(false);
      }
    }

    setIsRecording(true);
    speak(turn.target_line, () => {
      setIsRecording(false);
      setTranscript(turn.target_line);
      markTurnDone();
    });
  }

  function markTurnDone() {
    if (!turn) return;
    if (!practicedTurns.includes(turn.id)) {
      const next = [...practicedTurns, turn.id];
      setPracticedTurns(next);
      addXP(5);
    }
    setFeedback("Great pronunciation & natural rhythm! (+5 Bonus XP)");
  }

  if (!turn) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 overflow-x-hidden rounded-3xl border border-orange-200/90 bg-white p-4 shadow-md sm:p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-800">
            🤖 Speaking AI Role-Play • Optional Practice
          </span>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">
            {countryName} Cultural Dialogue: {missionTitle}
          </h2>
        </div>
        <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-extrabold text-orange-700">
          Turn {turnIndex + 1} / {activeTurns.length}
        </span>
      </div>

      {/* NPC / Engineer Prompt */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            ⚡ {turn.speaker_role && !/BARISTA/i.test(turn.speaker_role) ? turn.speaker_role : "GRID ENGINEER SAYS"}:
          </span>
          <button
            type="button"
            onClick={() => handleListenPrompt(turn.npc_prompt)}
            className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-white px-2.5 py-1 text-xs font-bold text-orange-700 hover:bg-orange-50 cursor-pointer"
          >
            🔊 Listen
          </button>
        </div>
        <p className="text-base font-semibold text-slate-800">
          &ldquo;{turn.npc_prompt}&rdquo;
        </p>
      </div>

      {/* Learner Target Response */}
      <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-orange-800">
            🎙️ Your Line to Speak:
          </span>
          <button
            type="button"
            onClick={() => handleListenPrompt(turn.target_line)}
            className="inline-flex items-center gap-1 rounded-lg border border-orange-300 bg-white px-2.5 py-1 text-xs font-bold text-orange-700 hover:bg-orange-50 cursor-pointer"
          >
            🔊 Hear Native Model
          </button>
        </div>
        <p className="text-lg font-extrabold text-slate-900">
          &ldquo;{turn.target_line}&rdquo;
        </p>
        {turn.vietnamese_translation && (
          <p className="mt-1 text-sm font-medium text-slate-600">
            ({turn.vietnamese_translation})
          </p>
        )}
        {turn.coach_tip && (
          <p className="mt-2 text-xs text-orange-800/90">
            💡 <strong>Coach Tip:</strong> {turn.coach_tip}
          </p>
        )}
      </div>

      {/* Speak / Practice Action */}
      <div className="flex flex-col items-center gap-3 py-2">
        <button
          type="button"
          onClick={handlePracticeSpeak}
          disabled={isRecording}
          className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-extrabold text-white shadow-md transition cursor-pointer ${
            isRecording
              ? "animate-pulse bg-rose-500"
              : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
          }`}
        >
          <span>
            {isRecording ? "🎙️ Listening / Practicing..." : "🎙️ Speak Line Now"}
          </span>
        </button>

        {transcript && (
          <p className="text-xs text-slate-600">
            Detected speech:{" "}
            <strong className="text-slate-900">&ldquo;{transcript}&rdquo;</strong>
          </p>
        )}

        {feedback && (
          <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-sm font-bold text-emerald-800">
            ✓ {feedback}
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-orange-100 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          ← Back to Country Hub
        </button>

        <div className="flex items-center gap-2">
          {turnIndex > 0 && (
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setTranscript("");
                setTurnIndex((i) => i - 1);
              }}
              className="rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-sm font-bold text-orange-700 hover:bg-orange-50 cursor-pointer"
            >
              ← Previous Turn
            </button>
          )}
          {turnIndex < activeTurns.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setTranscript("");
                setTurnIndex((i) => i + 1);
              }}
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-extrabold text-white hover:bg-orange-600 cursor-pointer"
            >
              Next Turn →
            </button>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-700 cursor-pointer"
            >
              ✓ Complete Speaking Practice
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MissionRoom({
  countryId = "usa",
  missionId = "renewable-energy",
  countryFlag = "🇺🇸",
  countryName = "USA",
}: MissionRoomProps) {
  const router = useRouter();
  const { xp, completedStages, usaCompleted, completeStage, completeMission } =
    useGame();

  const normalizedCountryId = countryId.toLowerCase();
  const staticBundle = getStaticMissionBundle(normalizedCountryId);

  const [mission, setMission] = useState<Mission | undefined>(
    () => staticBundle?.mission ?? getMissionById(missionId)
  );
  const [resolvedFlag, setResolvedFlag] = useState<string>(
    staticBundle?.countryFlag ?? countryFlag
  );
  const [resolvedCountryName, setResolvedCountryName] = useState<string>(
    staticBundle?.countryName ?? countryName
  );
  const [vocabItems, setVocabItems] = useState<VocabularyItem[] | undefined>(
    undefined
  );
  const [listenItems, setListenItems] = useState<ListeningItem[] | undefined>(
    undefined
  );
  const [sentItems, setSentItems] = useState<SentenceItem[] | undefined>(
    undefined
  );
  const [speakingTurns, setSpeakingTurns] = useState<DbCountrySpeakingTurn[]>(
    () => staticBundle?.speakingTurns ?? DEFAULT_USA_SPEAKING_TURNS
  );
  const [circuitBoards, setCircuitBoards] = useState<DbCountryCircuitBoard[]>(
    () => staticBundle?.circuitBoards ?? DEFAULT_USA_CIRCUIT_BOARDS
  );
  const [techRunnerQuestions, setTechRunnerQuestions] = useState<
    DbCountryTechRunnerQuestion[]
  >(() => staticBundle?.techRunnerQuestions ?? DEFAULT_USA_TECH_RUNNER_QUESTIONS);
  const [targetSmasherItems, setTargetSmasherItems] = useState<
    DbCountryTargetSmasherItem[]
  >(() => staticBundle?.targetSmasherItems ?? DEFAULT_USA_TARGET_SMASHER_ITEMS);
  const [moduleConfig, setModuleConfig] = useState<CountryModuleConfig>(
    () =>
      staticBundle?.moduleConfig ?? {
        vocabularyEnabled: true,
        listeningEnabled: true,
        speakingEnabled: true,
        enabledGames: ["sentence_assembler", "circuit_repair", "tech_runner", "target_smasher"],
      }
  );
  const [culturalBriefing, setCulturalBriefing] =
    useState<CountryCulturalBriefing>(
      () =>
        staticBundle?.culturalBriefing ??
        getDefaultCulturalBriefingForCountry(normalizedCountryId)
    );
  const [culturalDrawerOpen, setCulturalDrawerOpen] = useState(true);
  const [passportOpen, setPassportOpen] = useState(false);

  const [activeView, setActiveView] = useState<ActiveModuleView>("hub");
  const [hubNotice, setHubNotice] = useState<string | null>(null);

  // Hydrate mission data + live country content & module config from Supabase
  useEffect(() => {
    let isMounted = true;
    fetchMissionByCountry(normalizedCountryId).then((bundle) => {
      if (isMounted && bundle) {
        setMission(bundle.mission);
        setResolvedFlag(bundle.countryFlag);
        setResolvedCountryName(bundle.countryName);
        setVocabItems(bundle.vocabularyItems);
        setListenItems(bundle.listeningItems);
        setSentItems(bundle.sentenceItems);
        if (bundle.speakingTurns) {
          setSpeakingTurns(bundle.speakingTurns);
        }
        if (bundle.circuitBoards) {
          setCircuitBoards(bundle.circuitBoards);
        }
        if (bundle.techRunnerQuestions) {
          setTechRunnerQuestions(bundle.techRunnerQuestions);
        }
        if (bundle.targetSmasherItems) {
          setTargetSmasherItems(bundle.targetSmasherItems);
        }
        if (bundle.moduleConfig) {
          setModuleConfig(bundle.moduleConfig);
        }
        if (bundle.culturalBriefing) {
          setCulturalBriefing(bundle.culturalBriefing);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [normalizedCountryId]);

  // Auto-dismiss hub toast
  useEffect(() => {
    if (!hubNotice) return;
    const t = setTimeout(() => setHubNotice(null), 5000);
    return () => clearTimeout(t);
  }, [hubNotice]);

  if (!mission) {
    return (
      <div className="mission-error">
        <p>Mission not found.</p>
        <Link href="/world" className="btn-back-map">
          ← Back to World Map
        </Link>
      </div>
    );
  }

  // Counts for Hub list rows
  const vocabCount = (
    vocabItems && vocabItems.length > 0 ? vocabItems : defaultVocabItems
  ).length;
  const listenCount = (
    listenItems && listenItems.length > 0 ? listenItems : defaultListenItems
  ).length;
  const sentenceCount = (
    sentItems && sentItems.length > 0 ? sentItems : defaultSentenceItems
  ).length;
  const speakingTurnsCount = (
    speakingTurns && speakingTurns.length > 0
      ? speakingTurns
      : DEFAULT_USA_SPEAKING_TURNS
  ).length;
  const circuitBoardsCount = (
    circuitBoards && circuitBoards.length > 0
      ? circuitBoards
      : DEFAULT_USA_CIRCUIT_BOARDS
  ).length;
  const techRunnerCount = (
    techRunnerQuestions && techRunnerQuestions.length > 0
      ? techRunnerQuestions
      : DEFAULT_USA_TECH_RUNNER_QUESTIONS
  ).length;
  const targetSmasherCount = (
    targetSmasherItems && targetSmasherItems.length > 0
      ? targetSmasherItems
      : DEFAULT_USA_TARGET_SMASHER_ITEMS
  ).length;

  const isStageCompleted = (stageKey: string): boolean => {
    if (stageKey === "sentence_assembler") {
      return (
        completedStages.includes("sentence") ||
        completedStages.includes("sentence_assembler")
      );
    }
    return completedStages.includes(stageKey);
  };

  // Build dynamic list of enabled required modules based on `moduleConfig`
  const enabledRequiredKeys: string[] = [
    ...(moduleConfig.vocabularyEnabled ? ["vocabulary"] : []),
    ...(moduleConfig.listeningEnabled ? ["listening"] : []),
    ...moduleConfig.enabledGames,
  ];

  const completedRequiredCount = enabledRequiredKeys.filter((k) =>
    isStageCompleted(k)
  ).length;
  const totalRequiredCount = enabledRequiredKeys.length;
  const progressPercent =
    totalRequiredCount > 0
      ? Math.round((completedRequiredCount / totalRequiredCount) * 100)
      : 100;
  const allCoreCompleted =
    (totalRequiredCount > 0 && completedRequiredCount === totalRequiredCount) ||
    usaCompleted;

  function handleModuleComplete(stageKey: string, label: string) {
    // Keep backward compatibility with "sentence" stage ID in GameContext
    if (stageKey === "sentence_assembler") {
      completeStage("sentence");
    }
    completeStage(stageKey);

    const willAllBeDone =
      enabledRequiredKeys.length > 0 &&
      enabledRequiredKeys.every(
        (k) =>
          k === stageKey ||
          (stageKey === "sentence_assembler" && k === "sentence") ||
          isStageCompleted(k)
      );

    if (willAllBeDone) {
      completeMission(normalizedCountryId);
      setHubNotice(
        `🎉 ${label} completed! All required modules are done — your ${resolvedCountryName} Passport Stamp is unlocked!`
      );
    } else {
      setHubNotice(`✓ ${label} completed!`);
    }

    setActiveView("hub");
  }

  // Build compact list rows for ONLY the enabled modules & games
  const hubRows: {
    id: ActiveModuleView;
    stageKey: string;
    icon: string;
    title: string;
    meta: string;
    isOptional?: boolean;
    done: boolean;
  }[] = [
    ...(moduleConfig.vocabularyEnabled
      ? [
          {
            id: "vocabulary" as const,
            stageKey: "vocabulary",
            icon: "📖",
            title: "Vocabulary Module",
            meta: `${vocabCount} Questions • +${vocabCount * 10} XP`,
            done: isStageCompleted("vocabulary"),
          },
        ]
      : []),
    ...(moduleConfig.listeningEnabled
      ? [
          {
            id: "listening" as const,
            stageKey: "listening",
            icon: "🎧",
            title: "Listening Practice",
            meta: `${listenCount} Audio Tracks • +${listenCount * 10} XP`,
            done: isStageCompleted("listening"),
          },
        ]
      : []),
    ...moduleConfig.enabledGames.map((gameType) => {
      const gMeta = GAME_META[gameType] || GAME_META.sentence_assembler;
      const countForGame =
        gameType === "circuit_repair"
          ? circuitBoardsCount
          : gameType === "tech_runner"
            ? techRunnerCount
            : gameType === "target_smasher"
              ? targetSmasherCount
              : sentenceCount;
      return {
        id: gameType as ActiveModuleView,
        stageKey: gameType,
        icon: gMeta.icon,
        title: gMeta.title,
        meta: gMeta.metaLabel(countForGame),
        done: isStageCompleted(gameType),
      };
    }),
    ...(moduleConfig.speakingEnabled
      ? [
          {
            id: "speaking-ai" as const,
            stageKey: "speaking-ai",
            icon: "🤖",
            title: "Speaking AI Coach",
            meta: `${speakingTurnsCount} Dialogue Turns • +${speakingTurnsCount * 5} XP`,
            isOptional: true,
            done: isStageCompleted("speaking-ai"),
          },
        ]
      : []),
  ];

  const isGameView =
    activeView === "sentence_assembler" ||
    activeView === "circuit_repair" ||
    activeView === "tech_runner" ||
    activeView === "target_smasher";

  return (
    <div className="mission-page">
      {/* ── Page background ── */}
      <div className="mission-bg" aria-hidden="true" />

      {/* ── Top Navigation Header ── */}
      <header className="mission-header">
        {activeView === "hub" ? (
          <Link
            href="/world"
            className="btn-back-map"
            aria-label="Back to World Map"
          >
            ← World Map
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setActiveView("hub")}
            className="btn-back-map cursor-pointer"
            aria-label="Back to Country Hub"
          >
            ← Back to Country Hub
          </button>
        )}

        <div className="mission-identity">
          <span className="inline-block h-7 w-10 overflow-hidden rounded-md shadow-xs ring-2 ring-orange-300">
            <CountryFlagIcon
              countryId={normalizedCountryId}
              fallbackEmoji={resolvedFlag}
            />
          </span>
          <div>
            <p className="mission-country-name">{resolvedCountryName}</p>
            <h1 className="mission-title">{mission.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPassportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-orange-300 bg-white px-3 py-1 text-xs font-extrabold text-orange-800 shadow-2xs transition hover:bg-orange-50 cursor-pointer"
          >
            <span aria-hidden="true">🛂</span>
            <span>My Passport</span>
          </button>
          <span className="rounded-full border border-orange-200 bg-amber-50 px-3 py-1 text-xs font-extrabold text-orange-800 shadow-2xs">
            ⭐ {xp} XP
          </span>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main
        className="mission-content w-full max-w-full overflow-x-hidden px-4 sm:px-6"
        aria-label={
          activeView === "hub"
            ? `${resolvedCountryName} Learning Hub`
            : `${activeView} module`
        }
      >
        {/* ════════════════════════════════════════════════════════════════
            VIEW 1: COMPACT VERTICAL LIST COUNTRY LEARNING HUB
           ════════════════════════════════════════════════════════════════ */}
        {activeView === "hub" && (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-2">
            {/* Compact Country Header Card */}
            <section className="rounded-3xl border border-orange-200/90 bg-white/95 p-5 shadow-md backdrop-blur-xs md:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-15 shrink-0 overflow-hidden rounded-xl shadow-sm ring-2 ring-orange-400">
                    <CountryFlagIcon
                      countryId={normalizedCountryId}
                      fallbackEmoji={resolvedFlag}
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-orange-800">
                        🌍 {resolvedCountryName} Learning Hub
                      </span>
                      {allCoreCompleted && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                          🛂 Passport Stamp Unlocked
                        </span>
                      )}
                    </div>
                    <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">
                      {mission.title}
                    </h2>
                  </div>
                </div>

                {/* Overall Progress Box */}
                <div className="flex min-w-[215px] flex-col gap-1.5 rounded-2xl border border-orange-200/80 bg-orange-50/50 p-3.5">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700">
                    <span>Core Progress</span>
                    <span className="text-orange-700">
                      {completedRequiredCount} / {totalRequiredCount} Completed
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-orange-200/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {mission.briefing && (
                      <button
                        type="button"
                        onClick={() => setActiveView("briefing")}
                        className="rounded-lg border border-orange-200 bg-white px-2 py-0.5 text-[11px] font-bold text-orange-700 hover:bg-orange-50 cursor-pointer"
                      >
                        📋 Briefing
                      </button>
                    )}
                    {mission.learningRecap && (
                      <button
                        type="button"
                        onClick={() => setActiveView("recap")}
                        className="rounded-lg border border-orange-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-orange-50 cursor-pointer"
                      >
                        🎓 Recap
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Celebration Banner when all enabled core modules are finished */}
              {allCoreCompleted && (
                <div className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-extrabold text-emerald-900">
                    🎉 All required modules completed! Your {resolvedCountryName} Passport Stamp &amp; Cultural Souvenir are unlocked.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPassportOpen(true)}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-extrabold text-emerald-800 shadow-2xs hover:bg-emerald-50 cursor-pointer"
                    >
                      🛂 Open My Passport
                    </button>
                    <Link
                      href={`/completion/${normalizedCountryId}`}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-700"
                    >
                      🏆 Completion Ceremony →
                    </Link>
                  </div>
                </div>
              )}
            </section>

            {/* ── Collapsible Cultural Briefing & Etiquette Banner ── */}
            <section
              aria-label="Country Cultural Briefing and Etiquette"
              className="overflow-hidden rounded-3xl border border-amber-300/90 bg-gradient-to-br from-amber-50/95 via-[#fffaf0] to-orange-50/80 shadow-sm"
            >
              <button
                type="button"
                onClick={() => setCulturalDrawerOpen((o) => !o)}
                aria-expanded={culturalDrawerOpen}
                className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-amber-100/50 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-base text-white shadow-xs"
                    aria-hidden="true"
                  >
                    🧭
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900">
                        Cultural Briefing &amp; Local Etiquette
                      </span>
                      <span className="rounded-full border border-amber-300 bg-amber-100/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                        {resolvedCountryName} Guide
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Essential communication style, authentic local phrases, and cultural tips before you start.
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-extrabold text-orange-700">
                  {culturalDrawerOpen ? "Hide ▲" : "Read Guide ▼"}
                </span>
              </button>

              {culturalDrawerOpen && (
                <div className="border-t border-amber-200/80 px-5 py-4 flex flex-col gap-3.5">
                  {/* 1. Communication Style */}
                  <div className="rounded-2xl border border-amber-200/80 bg-white/90 p-3.5">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-orange-800">
                      💬 Communication Style
                    </p>
                    <p className="mt-1 text-xs sm:text-sm font-semibold leading-relaxed text-slate-800">
                      {culturalBriefing.communicationStyle}
                    </p>
                  </div>

                  {/* 2. Key Local Phrases */}
                  {Array.isArray(culturalBriefing.keyLocalPhrases) &&
                    culturalBriefing.keyLocalPhrases.length > 0 && (
                      <div className="rounded-2xl border border-amber-200/80 bg-white/90 p-3.5">
                        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-orange-800">
                          🗣️ Key Local Expressions
                        </p>
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {culturalBriefing.keyLocalPhrases.map((kp, idx) => (
                            <li
                              key={idx}
                              className="flex items-start justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-extrabold text-slate-900">
                                  &ldquo;{kp.phrase}&rdquo;
                                </p>
                                <p className="mt-0.5 text-[11px] font-medium text-slate-600">
                                  🇻🇳 {kp.vietnameseMeaning}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => speak(kp.phrase)}
                                className="shrink-0 rounded-lg border border-orange-200 bg-white px-2 py-1 text-xs font-bold text-orange-700 hover:bg-orange-50 cursor-pointer"
                                title={`Listen to "${kp.phrase}"`}
                                aria-label={`Listen to ${kp.phrase}`}
                              >
                                🔊
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* 3. Cultural Tip */}
                  {culturalBriefing.culturalTip && (
                    <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5">
                      <span className="text-base" aria-hidden="true">
                        💡
                      </span>
                      <p className="text-xs font-bold leading-relaxed text-emerald-950">
                        <strong className="uppercase tracking-wider text-emerald-800">
                          Etiquette Tip:
                        </strong>{" "}
                        {culturalBriefing.culturalTip}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Toast Notification */}
            {hubNotice && (
              <div
                role="status"
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-xs"
              >
                {hubNotice}
              </div>
            )}

            {/* Compact Single-Column Vertical List Layout */}
            <section
              aria-label="Country learning modules"
              className="flex flex-col gap-3"
            >
              {hubRows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-200/90 bg-white px-4 py-3.5 shadow-xs transition hover:border-orange-400 hover:shadow-sm"
                >
                  {/* Left: Compact Icon Badge + Title + Inline Metadata */}
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100/80 text-xl">
                      {row.icon}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-extrabold text-slate-900 md:text-base">
                        {row.title}
                      </h3>
                      <p className="truncate text-xs font-semibold text-slate-500">
                        {row.meta}
                      </p>
                    </div>
                  </div>

                  {/* Right: Status Pill + Compact CTA Button */}
                  <div className="flex shrink-0 items-center gap-2.5">
                    {row.isOptional && (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800">
                        Optional
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${
                        row.done
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      }`}
                    >
                      {row.done ? "✓ Completed" : "Not Started"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveView(row.id)}
                      className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3.5 py-2 text-xs font-extrabold text-white shadow-2xs hover:from-orange-600 hover:to-amber-600 cursor-pointer"
                    >
                      {row.done ? "Practice Again" : "Start"}
                    </button>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            VIEW 2: INDIVIDUAL MODULE WORKSPACES (WITH BACK TO HUB BAR)
           ════════════════════════════════════════════════════════════════ */}
        {activeView !== "hub" && (
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4">
            {/* Prominent Return Bar inside every active module view */}
            <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-orange-200/80 bg-white/90 px-4 py-2.5 shadow-2xs backdrop-blur-xs">
              <button
                type="button"
                onClick={() => setActiveView("hub")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50/70 px-3.5 py-1.5 text-xs font-extrabold text-orange-800 hover:bg-orange-100 cursor-pointer"
              >
                <span aria-hidden="true">←</span>
                <span>Back to Country Hub ({resolvedCountryName})</span>
              </button>

              {/* Quick Module Switcher Pills (only enabled modules) */}
              <div className="flex flex-wrap items-center gap-1.5">
                {hubRows.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveView(m.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                      activeView === m.id
                        ? "bg-orange-500 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-700"
                    }`}
                  >
                    {m.icon} {m.title} {m.done ? "✓" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Horizontally Centered Play-Area Container */}
            <div className="mx-auto flex w-full max-w-full flex-col items-center justify-center overflow-x-hidden">
              {activeView === "briefing" && mission.briefing && (
                <MissionBriefing
                  missionTitle={mission.title}
                  briefing={mission.briefing}
                  onStart={() => setActiveView("hub")}
                />
              )}

              {activeView === "recap" && mission.learningRecap && (
                <LearningRecap
                  recap={mission.learningRecap}
                  onContinue={() =>
                    router.push(`/completion/${normalizedCountryId}`)
                  }
                />
              )}

              {activeView === "vocabulary" && (
                <VocabularyStage
                  items={vocabItems}
                  onComplete={() =>
                    handleModuleComplete("vocabulary", "Vocabulary Module")
                  }
                />
              )}

              {activeView === "listening" && (
                <ListeningStage
                  items={listenItems}
                  onComplete={() =>
                    handleModuleComplete("listening", "Listening Practice")
                  }
                />
              )}

              {activeView === "circuit_repair" && (
                <CircuitRepairGame
                  boards={circuitBoards}
                  onComplete={() =>
                    handleModuleComplete("circuit_repair", "Circuit Repair")
                  }
                />
              )}

              {activeView === "tech_runner" && (
                <TechRunnerGame
                  questions={techRunnerQuestions}
                  topicLabel={mission.title}
                  onComplete={() =>
                    handleModuleComplete("tech_runner", "Tech Runner")
                  }
                />
              )}

              {activeView === "target_smasher" && (
                <TargetSmasherGame
                  items={targetSmasherItems}
                  topicLabel={mission.title}
                  onComplete={() =>
                    handleModuleComplete("target_smasher", "Target Smasher")
                  }
                />
              )}

              {isGameView &&
                activeView !== "circuit_repair" &&
                activeView !== "tech_runner" &&
                activeView !== "target_smasher" && (
                <SentenceStage
                  key={activeView}
                  items={sentItems}
                  onComplete={() =>
                    handleModuleComplete(
                      activeView,
                      GAME_META[activeView as CountryGameType]?.title ||
                        "Game Arena"
                    )
                  }
                />
              )}

              {activeView === "speaking-ai" && (
                <SpeakingAiStage
                  countryName={resolvedCountryName}
                  missionTitle={mission.title}
                  turns={speakingTurns}
                  onBack={() => setActiveView("hub")}
                  onComplete={() =>
                    handleModuleComplete("speaking-ai", "Speaking AI Coach")
                  }
                />
              )}
            </div>
          </div>
        )}
      </main>
      {passportOpen && (
        <PassportModal onClose={() => setPassportOpen(false)} />
      )}
    </div>
  );
}
