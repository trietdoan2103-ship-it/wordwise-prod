import { createClient } from "@/lib/supabase/client";

export const FORUM_CATEGORIES = [
  "General",
  "STEM & Tech",
  "Speaking & Culture",
  "Feedback",
  "Off-topic",
] as const;
export type ForumCategory = (typeof FORUM_CATEGORIES)[number];

export interface ForumPost {
  id: string;
  author_id: string;
  author_handle: string;
  category: ForumCategory;
  title: string;
  content: string;
  upvotes: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  comment_count: number;
}

export interface ForumComment {
  id: string;
  post_id: string;
  author_id: string;
  author_handle: string;
  content: string;
  created_at: string;
}

export type VoteMap = Record<string, 1 | -1>;

export const DEFAULT_FORUM_RULES: string[] = [
  "Be respectful and kind",
  "No spam or self-promotion",
  "Keep discussions helpful for learners",
  "Cite sources when sharing study materials",
  "Report issues constructively",
];

const LOCAL_POSTS_KEY = "wordwise_forum_local_posts_v1";
const LOCAL_COMMENTS_KEY = "wordwise_forum_local_comments_v1";
const LOCAL_VOTES_KEY = "wordwise_forum_local_votes_v1";
const RECENT_KEY = "wordwise_forum_recent_v1";
const MOD_OVERRIDES_KEY = "wordwise_forum_mod_overrides_v1";
const DELETED_POSTS_KEY = "wordwise_forum_deleted_posts_v1";
const DELETED_COMMENTS_KEY = "wordwise_forum_deleted_comments_v1";
const RULES_KEY = "wordwise_forum_rules_v1";

interface PostModOverride {
  is_pinned?: boolean;
  is_locked?: boolean;
}

const hoursAgo = (h: number) =>
  new Date(Date.now() - h * 3600 * 1000).toISOString();

/** Sample posts shown when the forum tables are empty or not yet migrated. */
export const SEED_POSTS: ForumPost[] = [
  {
    id: "seed-welcome",
    author_id: "seed",
    author_handle: "wordwise_team",
    category: "General",
    title: "Welcome to the Wordwise Community 👋",
    content:
      "Introduce yourself, share your favorite lesson, and tell us which country you want to unlock next on the world map.",
    upvotes: 31,
    is_pinned: true,
    is_locked: false,
    created_at: hoursAgo(72),
    comment_count: 0,
  },
  {
    id: "seed-stem-vocab",
    author_id: "seed",
    author_handle: "maya_codes",
    category: "STEM & Tech",
    title: "3 tricks for remembering STEM vocabulary (photovoltaic, inverter, etc.)",
    content:
      "I split long technical words into roots: photo (light) + voltaic (electric). Once I know the root, new words like 'photosynthesis' feel familiar. I also write one example sentence per word. What methods work for you?",
    upvotes: 24,
    is_pinned: false,
    is_locked: false,
    created_at: hoursAgo(3),
    comment_count: 2,
  },
  {
    id: "seed-usa-grid",
    author_id: "seed",
    author_handle: "linh_nguyen",
    category: "Speaking & Culture",
    title: "USA Renewable Energy Mission: 'microgrid' vs. 'national power grid'?",
    content:
      "In the USA Renewable Energy mission, the grid engineer talks about storing excess solar energy in a campus microgrid. I learned that a microgrid can disconnect and run independently during storms! What STEM terms stood out to you?",
    upvotes: 15,
    is_pinned: false,
    is_locked: false,
    created_at: hoursAgo(9),
    comment_count: 1,
  },
  {
    id: "seed-bug-feedback",
    author_id: "seed",
    author_handle: "wordwise_team",
    category: "Feedback",
    title: "Found a bug or have an idea? Post it here",
    content:
      "Please include what you were doing, what you expected, and what happened instead. Screenshots help a lot. We read every post — thank you for helping improve Wordwise!",
    upvotes: 9,
    is_pinned: false,
    is_locked: false,
    created_at: hoursAgo(26),
    comment_count: 0,
  },
];

export const SEED_COMMENTS: ForumComment[] = [
  {
    id: "seed-c1",
    post_id: "seed-stem-vocab",
    author_id: "seed",
    author_handle: "tom_builds",
    content: "Flashcards with a picture on the back helped me a lot for circuit terms.",
    created_at: hoursAgo(2),
  },
  {
    id: "seed-c2",
    post_id: "seed-stem-vocab",
    author_id: "seed",
    author_handle: "linh_nguyen",
    content: "The root trick is great. 'Thermo' = heat made 'thermal' easy.",
    created_at: hoursAgo(1),
  },
  {
    id: "seed-c3",
    post_id: "seed-usa-grid",
    author_id: "seed",
    author_handle: "maya_codes",
    content: "Also 'inverter' — converting DC from solar panels into AC for buildings!",
    created_at: hoursAgo(5),
  },
];

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

export function handleFromName(displayName: string, email?: string): string {
  const base = (displayName || email?.split("@")[0] || "learner")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "learner";
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* ── Recently viewed ─────────────────────────────────────────────────── */

export interface RecentPost {
  id: string;
  title: string;
}

export function getRecentPosts(): RecentPost[] {
  return readLocal<RecentPost[]>(RECENT_KEY, []);
}

export function pushRecentPost(p: RecentPost): RecentPost[] {
  const next = [p, ...getRecentPosts().filter((x) => x.id !== p.id)].slice(0, 3);
  writeLocal(RECENT_KEY, next);
  return next;
}

/* ── Fetching ────────────────────────────────────────────────────────── */

function isUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function fetchForumData(userId?: string): Promise<{
  posts: ForumPost[];
  votes: VoteMap;
}> {
  const localPosts = readLocal<ForumPost[]>(LOCAL_POSTS_KEY, []);
  const localComments = readLocal<ForumComment[]>(LOCAL_COMMENTS_KEY, []);
  const localVotes = readLocal<VoteMap>(LOCAL_VOTES_KEY, {});
  const modOverrides = readLocal<Record<string, PostModOverride>>(
    MOD_OVERRIDES_KEY,
    {}
  );
  const deletedPostIds = new Set(readLocal<string[]>(DELETED_POSTS_KEY, []));
  const deletedCommentIds = new Set(
    readLocal<string[]>(DELETED_COMMENTS_KEY, [])
  );

  let dbPosts: ForumPost[] = [];
  let dbVotes: VoteMap = {};
  try {
    const supabase = createClient();
    const [pRes, cRes] = await Promise.all([
      supabase
        .from("forum_posts")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("forum_comments").select("id, post_id"),
    ]);
    if (!pRes.error && pRes.data) {
      const counts: Record<string, number> = {};
      (cRes.data || []).forEach((c: { id: string; post_id: string }) => {
        if (!deletedCommentIds.has(c.id)) {
          counts[c.post_id] = (counts[c.post_id] || 0) + 1;
        }
      });
      dbPosts = (
        pRes.data as Array<
          Omit<ForumPost, "comment_count" | "is_pinned" | "is_locked"> & {
            is_pinned?: boolean;
            is_locked?: boolean;
          }
        >
      ).map((p) => ({
        ...p,
        is_pinned: Boolean(p.is_pinned),
        is_locked: Boolean(p.is_locked),
        comment_count: counts[p.id] || 0,
      }));
      if (userId) {
        const vRes = await supabase
          .from("forum_votes")
          .select("post_id, vote_type")
          .eq("user_id", userId);
        (vRes.data || []).forEach(
          (v: { post_id: string; vote_type: number }) => {
            dbVotes[v.post_id] = v.vote_type === -1 ? -1 : 1;
          }
        );
      }
    }
  } catch {
    /* fall back to local/seed */
  }

  const localCounts: Record<string, number> = {};
  localComments
    .filter((c) => !deletedCommentIds.has(c.id))
    .forEach((c) => {
      localCounts[c.post_id] = (localCounts[c.post_id] || 0) + 1;
    });

  const seedCommentCounts: Record<string, number> = {};
  SEED_COMMENTS.filter((c) => !deletedCommentIds.has(c.id)).forEach((c) => {
    seedCommentCounts[c.post_id] = (seedCommentCounts[c.post_id] || 0) + 1;
  });

  const applyOverrides = (p: ForumPost): ForumPost => {
    const ov = modOverrides[p.id];
    return {
      ...p,
      is_pinned: ov?.is_pinned !== undefined ? ov.is_pinned : Boolean(p.is_pinned),
      is_locked: ov?.is_locked !== undefined ? ov.is_locked : Boolean(p.is_locked),
    };
  };

  const seedAdjusted = SEED_POSTS.filter((p) => !deletedPostIds.has(p.id)).map(
    (p) =>
      applyOverrides({
        ...p,
        upvotes: p.upvotes + (localVotes[p.id] || 0),
        comment_count: (seedCommentCounts[p.id] || 0) + (localCounts[p.id] || 0),
      })
  );
  const localAdjusted = localPosts
    .filter((p) => !deletedPostIds.has(p.id))
    .map((p) =>
      applyOverrides({
        ...p,
        upvotes: p.upvotes + (localVotes[p.id] || 0),
        comment_count: localCounts[p.id] || 0,
      })
    );
  const dbAdjusted = dbPosts
    .filter((p) => !deletedPostIds.has(p.id))
    .map(applyOverrides);

  const posts = [...dbAdjusted, ...localAdjusted, ...seedAdjusted].sort(
    (a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return +new Date(b.created_at) - +new Date(a.created_at);
    }
  );
  return { posts, votes: { ...localVotes, ...dbVotes } };
}

export async function fetchComments(postId: string): Promise<ForumComment[]> {
  const deletedCommentIds = new Set(
    readLocal<string[]>(DELETED_COMMENTS_KEY, [])
  );
  const local = readLocal<ForumComment[]>(LOCAL_COMMENTS_KEY, []).filter(
    (c) => c.post_id === postId && !deletedCommentIds.has(c.id)
  );
  const seed = SEED_COMMENTS.filter(
    (c) => c.post_id === postId && !deletedCommentIds.has(c.id)
  );
  let db: ForumComment[] = [];
  if (isUuid(postId)) {
    try {
      const { data, error } = await createClient()
        .from("forum_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (!error && data) {
        db = (data as ForumComment[]).filter(
          (c) => !deletedCommentIds.has(c.id)
        );
      }
    } catch {
      /* ignore */
    }
  }
  return [...seed, ...db, ...local].sort(
    (a, b) => +new Date(a.created_at) - +new Date(b.created_at)
  );
}

/* ── Mutations ───────────────────────────────────────────────────────── */

export async function createPost(input: {
  authorId: string;
  authorHandle: string;
  category: ForumCategory;
  title: string;
  content: string;
}): Promise<ForumPost> {
  try {
    const { data, error } = await createClient()
      .from("forum_posts")
      .insert({
        author_id: input.authorId,
        author_handle: input.authorHandle,
        category: input.category,
        title: input.title,
        content: input.content,
      })
      .select("*")
      .single();
    if (!error && data) {
      const row = data as Omit<ForumPost, "comment_count">;
      return {
        ...row,
        is_pinned: Boolean(row.is_pinned),
        is_locked: Boolean(row.is_locked),
        comment_count: 0,
      };
    }
  } catch {
    /* fall through to local */
  }
  const post: ForumPost = {
    id: `local-${Date.now().toString(36)}`,
    author_id: input.authorId,
    author_handle: input.authorHandle,
    category: input.category,
    title: input.title,
    content: input.content,
    upvotes: 0,
    is_pinned: false,
    is_locked: false,
    created_at: new Date().toISOString(),
    comment_count: 0,
  };
  writeLocal(LOCAL_POSTS_KEY, [
    post,
    ...readLocal<ForumPost[]>(LOCAL_POSTS_KEY, []),
  ]);
  return post;
}

export async function createComment(input: {
  postId: string;
  authorId: string;
  authorHandle: string;
  content: string;
}): Promise<ForumComment> {
  if (isUuid(input.postId)) {
    try {
      const { data, error } = await createClient()
        .from("forum_comments")
        .insert({
          post_id: input.postId,
          author_id: input.authorId,
          author_handle: input.authorHandle,
          content: input.content,
        })
        .select("*")
        .single();
      if (!error && data) return data as ForumComment;
    } catch {
      /* fall through */
    }
  }
  const comment: ForumComment = {
    id: `local-c-${Date.now().toString(36)}`,
    post_id: input.postId,
    author_id: input.authorId,
    author_handle: input.authorHandle,
    content: input.content,
    created_at: new Date().toISOString(),
  };
  writeLocal(LOCAL_COMMENTS_KEY, [
    ...readLocal<ForumComment[]>(LOCAL_COMMENTS_KEY, []),
    comment,
  ]);
  return comment;
}

/**
 * Cast / toggle a vote. Returns the new vote (or 0 when removed).
 * Persists to Supabase for real posts; otherwise stores a local delta.
 */
export async function castVote(
  userId: string,
  postId: string,
  current: 1 | -1 | 0,
  next: 1 | -1
): Promise<0 | 1 | -1> {
  const result: 0 | 1 | -1 = current === next ? 0 : next;
  if (isUuid(postId)) {
    try {
      const supabase = createClient();
      if (result === 0) {
        await supabase
          .from("forum_votes")
          .delete()
          .eq("user_id", userId)
          .eq("post_id", postId);
      } else {
        await supabase
          .from("forum_votes")
          .upsert(
            { user_id: userId, post_id: postId, vote_type: result },
            { onConflict: "user_id,post_id" }
          );
      }
      return result;
    } catch {
      /* fall through to local */
    }
  }
  const votes = readLocal<VoteMap>(LOCAL_VOTES_KEY, {});
  if (result === 0) delete votes[postId];
  else votes[postId] = result;
  writeLocal(LOCAL_VOTES_KEY, votes);
  return result;
}

/* ── Admin Moderation & Governance ───────────────────────────────────── */

function setLocalModOverride(postId: string, patch: PostModOverride) {
  const map = readLocal<Record<string, PostModOverride>>(MOD_OVERRIDES_KEY, {});
  map[postId] = { ...(map[postId] || {}), ...patch };
  writeLocal(MOD_OVERRIDES_KEY, map);
}

export async function togglePinPost(
  postId: string,
  nextPinned: boolean
): Promise<void> {
  setLocalModOverride(postId, { is_pinned: nextPinned });
  if (isUuid(postId)) {
    try {
      await createClient()
        .from("forum_posts")
        .update({ is_pinned: nextPinned })
        .eq("id", postId);
    } catch {
      /* local override already saved */
    }
  }
}

export async function toggleLockPost(
  postId: string,
  nextLocked: boolean
): Promise<void> {
  setLocalModOverride(postId, { is_locked: nextLocked });
  if (isUuid(postId)) {
    try {
      await createClient()
        .from("forum_posts")
        .update({ is_locked: nextLocked })
        .eq("id", postId);
    } catch {
      /* local override already saved */
    }
  }
}

export async function deleteForumPost(postId: string): Promise<void> {
  const deleted = readLocal<string[]>(DELETED_POSTS_KEY, []);
  if (!deleted.includes(postId)) {
    writeLocal(DELETED_POSTS_KEY, [...deleted, postId]);
  }
  const localPosts = readLocal<ForumPost[]>(LOCAL_POSTS_KEY, []);
  writeLocal(
    LOCAL_POSTS_KEY,
    localPosts.filter((p) => p.id !== postId)
  );
  if (isUuid(postId)) {
    try {
      await createClient().from("forum_posts").delete().eq("id", postId);
    } catch {
      /* local tombstone already recorded */
    }
  }
}

export async function deleteForumComment(commentId: string): Promise<void> {
  const deleted = readLocal<string[]>(DELETED_COMMENTS_KEY, []);
  if (!deleted.includes(commentId)) {
    writeLocal(DELETED_COMMENTS_KEY, [...deleted, commentId]);
  }
  const localComments = readLocal<ForumComment[]>(LOCAL_COMMENTS_KEY, []);
  writeLocal(
    LOCAL_COMMENTS_KEY,
    localComments.filter((c) => c.id !== commentId)
  );
  if (isUuid(commentId)) {
    try {
      await createClient().from("forum_comments").delete().eq("id", commentId);
    } catch {
      /* local tombstone already recorded */
    }
  }
}

/* ── Forum Rules Config (Supabase + localStorage fallback) ───────────── */

export async function fetchForumRules(): Promise<string[]> {
  const localRules = readLocal<string[] | null>(RULES_KEY, null);
  try {
    const { data, error } = await createClient()
      .from("forum_rules")
      .select("rule_text, sort_order")
      .order("sort_order", { ascending: true });
    if (!error && data && data.length > 0) {
      const rules = (data as Array<{ rule_text: string }>).map(
        (r) => r.rule_text
      );
      writeLocal(RULES_KEY, rules);
      return rules;
    }
  } catch {
    /* fallback to local/default */
  }
  return localRules && localRules.length > 0
    ? localRules
    : DEFAULT_FORUM_RULES;
}

export async function saveForumRules(rules: string[]): Promise<void> {
  const cleaned = rules.map((r) => r.trim()).filter(Boolean);
  writeLocal(RULES_KEY, cleaned);
  try {
    const supabase = createClient();
    await supabase.from("forum_rules").delete().neq("id", "__none__");
    if (cleaned.length > 0) {
      await supabase.from("forum_rules").upsert(
        cleaned.map((rule_text, idx) => ({
          id: `rule-${idx + 1}`,
          rule_text,
          sort_order: idx + 1,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "id" }
      );
    }
  } catch {
    /* persisted in localStorage */
  }
}
