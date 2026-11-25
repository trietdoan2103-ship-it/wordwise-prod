/**
 * Leaderboard & Community Rankings Data + Supabase Fetcher — Sprint 5.
 *
 * Queries `public.profiles`, `public.user_lesson_progress`, and `public.user_mission_progress`
 * to rank real students by composite score (`xp + completedLessonsCount * 50`).
 * Uses Smart Podium Population to pad with baseline entries when fewer than 6 real
 * profiles exist in the database.
 */

import { createClient } from "@/lib/supabase/client";

export interface StudentRankEntry {
  id: string;
  rank: number;
  name: string;
  school: string;
  province: string;
  avatar: string;
  modulesCompleted: number;
  totalModules: number;
  xp: number;
  trend: "up" | "down" | "same";
  trendAmount: number;
  badge?: string;
  isRealUser?: boolean;
  missionsCompleted?: number;
}

export type RankingCategory = "national" | "weekly";

export interface LiveLeaderboardResult {
  national: StudentRankEntry[];
  weekly: StudentRankEntry[];
  totalUsersCount: number;
  uniqueSchoolsCount: number;
}

const AVATAR_POOL = ["🧑‍🔬", "👩‍💻", "🧑‍🚀", "👩‍🔬", "🧑‍💼", "👩‍🎓", "🧑‍🔧", "🧑‍💻"];

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      url !== "your_supabase_project_url" &&
      key !== "your_supabase_anon_key" &&
      url.startsWith("http")
  );
}

export const NATIONAL_RANKINGS: StudentRankEntry[] = [
  {
    id: "stu-1",
    rank: 1,
    name: "Bảo Nam",
    school: "THPT Chuyên Lê Hồng Phong",
    province: "TP. Hồ Chí Minh",
    avatar: "🧑‍🔬",
    modulesCompleted: 6,
    totalModules: 6,
    xp: 1280,
    trend: "up",
    trendAmount: 2,
    badge: "Gold League",
  },
  {
    id: "stu-2",
    rank: 2,
    name: "Phương Linh",
    school: "THPT Chuyên Hà Nội - Amsterdam",
    province: "Hà Nội",
    avatar: "👩‍💻",
    modulesCompleted: 6,
    totalModules: 6,
    xp: 1140,
    trend: "up",
    trendAmount: 1,
    badge: "Gold League",
  },
  {
    id: "stu-3",
    rank: 3,
    name: "Minh Khôi",
    school: "THPT Chuyên Lam Sơn",
    province: "Thanh Hóa",
    avatar: "🧑‍🚀",
    modulesCompleted: 5,
    totalModules: 6,
    xp: 980,
    trend: "down",
    trendAmount: 1,
    badge: "Silver League",
  },
  {
    id: "stu-4",
    rank: 4,
    name: "Thu Trang",
    school: "THPT Chuyên Khoa học Tự nhiên",
    province: "ĐHQG Hà Nội",
    avatar: "👩‍🔬",
    modulesCompleted: 5,
    totalModules: 6,
    xp: 890,
    trend: "up",
    trendAmount: 3,
    badge: "Silver League",
  },
  {
    id: "stu-5",
    rank: 5,
    name: "Hoàng Long",
    school: "THPT Chuyên Quốc Học Huế",
    province: "Thừa Thiên Huế",
    avatar: "🧑‍💼",
    modulesCompleted: 4,
    totalModules: 6,
    xp: 820,
    trend: "up",
    trendAmount: 1,
    badge: "Silver League",
  },
  {
    id: "stu-6",
    rank: 6,
    name: "Khánh Vy",
    school: "THPT Chuyên Trần Phú",
    province: "Hải Phòng",
    avatar: "👩‍🎓",
    modulesCompleted: 4,
    totalModules: 6,
    xp: 760,
    trend: "down",
    trendAmount: 2,
    badge: "Bronze League",
  },
  {
    id: "stu-7",
    rank: 7,
    name: "Đức Anh",
    school: "THPT Chuyên Phan Bội Châu",
    province: "Nghệ An",
    avatar: "🧑‍🔧",
    modulesCompleted: 4,
    totalModules: 6,
    xp: 710,
    trend: "up",
    trendAmount: 2,
    badge: "Bronze League",
  },
  {
    id: "stu-8",
    rank: 8,
    name: "Mai Anh",
    school: "THPT Chuyên Nguyễn Du",
    province: "Đắk Lắk",
    avatar: "👩‍💼",
    modulesCompleted: 3,
    totalModules: 6,
    xp: 650,
    trend: "up",
    trendAmount: 1,
    badge: "Bronze League",
  },
  {
    id: "stu-9",
    rank: 9,
    name: "Tuấn Kiệt",
    school: "THPT Chuyên Thăng Long",
    province: "Lâm Đồng",
    avatar: "🧑‍💻",
    modulesCompleted: 3,
    totalModules: 6,
    xp: 590,
    trend: "down",
    trendAmount: 1,
    badge: "Bronze League",
  },
  {
    id: "stu-10",
    rank: 10,
    name: "Hà My",
    school: "THPT Chuyên Nguyễn Bỉnh Khiêm",
    province: "Quảng Nam",
    avatar: "👩‍🔬",
    modulesCompleted: 3,
    totalModules: 6,
    xp: 540,
    trend: "up",
    trendAmount: 1,
    badge: "Bronze League",
  },
];

export const WEEKLY_RANKINGS: StudentRankEntry[] = [
  {
    id: "wk-1",
    rank: 1,
    name: "Phương Linh",
    school: "THPT Chuyên Hà Nội - Amsterdam",
    province: "Hà Nội",
    avatar: "👩‍💻",
    modulesCompleted: 3,
    totalModules: 6,
    xp: 480,
    trend: "up",
    trendAmount: 4,
    badge: "Weekly Champion",
  },
  {
    id: "wk-2",
    rank: 2,
    name: "Thu Trang",
    school: "THPT Chuyên Khoa học Tự nhiên",
    province: "ĐHQG Hà Nội",
    avatar: "👩‍🔬",
    modulesCompleted: 3,
    totalModules: 6,
    xp: 420,
    trend: "up",
    trendAmount: 2,
    badge: "Rising Star",
  },
  {
    id: "wk-3",
    rank: 3,
    name: "Bảo Nam",
    school: "THPT Chuyên Lê Hồng Phong",
    province: "TP. Hồ Chí Minh",
    avatar: "🧑‍🔬",
    modulesCompleted: 2,
    totalModules: 6,
    xp: 390,
    trend: "down",
    trendAmount: 2,
    badge: "Consistent Learner",
  },
  {
    id: "wk-4",
    rank: 4,
    name: "Đức Anh",
    school: "THPT Chuyên Phan Bội Châu",
    province: "Nghệ An",
    avatar: "🧑‍🔧",
    modulesCompleted: 2,
    totalModules: 6,
    xp: 350,
    trend: "up",
    trendAmount: 5,
    badge: "Weekly Fast Mover",
  },
  {
    id: "wk-5",
    rank: 5,
    name: "Minh Khôi",
    school: "THPT Chuyên Lam Sơn",
    province: "Thanh Hóa",
    avatar: "🧑‍🚀",
    modulesCompleted: 2,
    totalModules: 6,
    xp: 320,
    trend: "down",
    trendAmount: 1,
    badge: "Active",
  },
  {
    id: "wk-6",
    rank: 6,
    name: "Khánh Vy",
    school: "THPT Chuyên Trần Phú",
    province: "Hải Phòng",
    avatar: "👩‍🎓",
    modulesCompleted: 2,
    totalModules: 6,
    xp: 290,
    trend: "up",
    trendAmount: 1,
    badge: "Active",
  },
  {
    id: "wk-7",
    rank: 7,
    name: "Hoàng Long",
    school: "THPT Chuyên Quốc Học Huế",
    province: "Thừa Thiên Huế",
    avatar: "🧑‍💼",
    modulesCompleted: 1,
    totalModules: 6,
    xp: 260,
    trend: "down",
    trendAmount: 3,
    badge: "Active",
  },
  {
    id: "wk-8",
    rank: 8,
    name: "Gia Hưng",
    school: "THPT Chuyên Bến Tre",
    province: "Bến Tre",
    avatar: "🧑‍🏫",
    modulesCompleted: 1,
    totalModules: 6,
    xp: 230,
    trend: "up",
    trendAmount: 2,
    badge: "Active",
  },
  {
    id: "wk-9",
    rank: 9,
    name: "Hà My",
    school: "THPT Chuyên Nguyễn Bỉnh Khiêm",
    province: "Quảng Nam",
    avatar: "👩‍🔬",
    modulesCompleted: 1,
    totalModules: 6,
    xp: 210,
    trend: "up",
    trendAmount: 1,
    badge: "Active",
  },
  {
    id: "wk-10",
    rank: 10,
    name: "Tuấn Kiệt",
    school: "THPT Chuyên Thăng Long",
    province: "Lâm Đồng",
    avatar: "🧑‍💻",
    modulesCompleted: 1,
    totalModules: 6,
    xp: 180,
    trend: "down",
    trendAmount: 2,
    badge: "Active",
  },
];

function assignRanksAndBadges(
  entries: StudentRankEntry[],
  mode: "national" | "weekly"
): StudentRankEntry[] {
  const sorted = [...entries].sort((a, b) => b.xp - a.xp);
  return sorted.map((entry, idx) => {
    const rank = idx + 1;
    let badge = entry.badge;
    if (mode === "national") {
      badge =
        rank <= 2
          ? "Gold League"
          : rank <= 5
          ? "Silver League"
          : "Bronze League";
    } else {
      badge =
        rank === 1
          ? "Weekly Champion"
          : rank <= 3
          ? "Rising Star"
          : "Active";
    }
    return {
      ...entry,
      rank,
      badge,
    };
  });
}

/**
 * Queries real users from `public.profiles`, `public.user_lesson_progress`, and
 * `public.user_mission_progress` on Supabase, computes each user's composite score
 * (`xp + completedLessonsCount * 50`), and merges with baseline entries when fewer
 * than 6 real users exist in the database.
 */
export async function fetchLiveLeaderboard(): Promise<LiveLeaderboardResult> {
  if (!isSupabaseConfigured()) {
    return {
      national: NATIONAL_RANKINGS,
      weekly: WEEKLY_RANKINGS,
      totalUsersCount: NATIONAL_RANKINGS.length,
      uniqueSchoolsCount: new Set(NATIONAL_RANKINGS.map((r) => r.school)).size,
    };
  }

  try {
    const supabase = createClient();

    const [profilesRes, lessonsProgRes, missionsProgRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, school_name, xp, current_streak"),
      supabase
        .from("user_lesson_progress")
        .select("user_id, lesson_id"),
      supabase
        .from("user_mission_progress")
        .select("user_id, country_id, mission_completed"),
    ]);

    const profileRows = (profilesRes.data || []) as {
      id: string;
      display_name: string | null;
      school_name: string | null;
      xp: number | null;
      current_streak: number | null;
    }[];

    if (profilesRes.error || profileRows.length === 0) {
      return {
        national: NATIONAL_RANKINGS,
        weekly: WEEKLY_RANKINGS,
        totalUsersCount: NATIONAL_RANKINGS.length,
        uniqueSchoolsCount: new Set(NATIONAL_RANKINGS.map((r) => r.school)).size,
      };
    }

    const lessonRows = (lessonsProgRes.data || []) as {
      user_id: string;
      lesson_id: string;
    }[];
    const missionRows = (missionsProgRes.data || []) as {
      user_id: string;
      country_id: string;
      mission_completed: boolean | null;
    }[];

    const lessonsCountByUser = new Map<string, Set<string>>();
    for (const row of lessonRows) {
      if (!row.user_id || !row.lesson_id) continue;
      if (!lessonsCountByUser.has(row.user_id)) {
        lessonsCountByUser.set(row.user_id, new Set());
      }
      lessonsCountByUser.get(row.user_id)!.add(row.lesson_id);
    }

    const missionsCountByUser = new Map<string, number>();
    for (const row of missionRows) {
      if (!row.user_id || !row.mission_completed) continue;
      missionsCountByUser.set(
        row.user_id,
        (missionsCountByUser.get(row.user_id) || 0) + 1
      );
    }

    const realEntries: StudentRankEntry[] = profileRows.map((prof, idx) => {
      const completedLessonsCount = Math.min(
        6,
        lessonsCountByUser.get(prof.id)?.size || 0
      );
      const baseXp = typeof prof.xp === "number" ? Math.max(0, prof.xp) : 0;
      const compositeScore = baseXp + completedLessonsCount * 50;
      const streak =
        typeof prof.current_streak === "number" ? prof.current_streak : 1;

      return {
        id: prof.id,
        rank: idx + 1,
        name: prof.display_name?.trim() || "Explorer",
        school: prof.school_name?.trim() || "High School Student",
        province: "Việt Nam",
        avatar: AVATAR_POOL[idx % AVATAR_POOL.length],
        modulesCompleted: completedLessonsCount,
        totalModules: 6,
        xp: compositeScore,
        trend: streak >= 2 ? "up" : "same",
        trendAmount: Math.max(1, Math.min(5, streak)),
        isRealUser: true,
        missionsCompleted: missionsCountByUser.get(prof.id) || 0,
      };
    });

    const realNamesLower = new Set(
      realEntries.map((r) => r.name.toLowerCase())
    );

    let nationalMerged = [...realEntries];
    let weeklyMerged = realEntries.map((r) => ({ ...r }));

    // Smart Podium Population: pad with baseline entries if fewer than 6 real users
    if (realEntries.length < 6) {
      const targetSize = Math.max(10, realEntries.length);
      const neededNational = NATIONAL_RANKINGS.filter(
        (b) => !realNamesLower.has(b.name.toLowerCase())
      ).slice(0, targetSize - realEntries.length);

      const neededWeekly = WEEKLY_RANKINGS.filter(
        (b) => !realNamesLower.has(b.name.toLowerCase())
      ).slice(0, targetSize - realEntries.length);

      nationalMerged = [...realEntries, ...neededNational];
      weeklyMerged = [...weeklyMerged, ...neededWeekly];
    }

    const rankedNational = assignRanksAndBadges(nationalMerged, "national");
    const rankedWeekly = assignRanksAndBadges(weeklyMerged, "weekly");

    const uniqueSchoolsCount = new Set(
      rankedNational.map((e) => e.school.toLowerCase())
    ).size;

    return {
      national: rankedNational,
      weekly: rankedWeekly,
      totalUsersCount: rankedNational.length,
      uniqueSchoolsCount,
    };
  } catch {
    return {
      national: NATIONAL_RANKINGS,
      weekly: WEEKLY_RANKINGS,
      totalUsersCount: NATIONAL_RANKINGS.length,
      uniqueSchoolsCount: new Set(NATIONAL_RANKINGS.map((r) => r.school)).size,
    };
  }
}
