"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "@/context/SessionContext";
import {
  DEFAULT_FORUM_RULES,
  FORUM_CATEGORIES,
  castVote,
  createComment,
  createPost,
  deleteForumComment,
  deleteForumPost,
  fetchForumData,
  fetchForumRules,
  getRecentPosts,
  handleFromName,
  pushRecentPost,
  toggleLockPost,
  togglePinPost,
  type ForumCategory,
  type ForumComment,
  type ForumPost,
  type RecentPost,
  type VoteMap,
} from "@/lib/forum";
import PostCard from "./PostCard";
import { NewPostModal, PostDetailModal } from "./PostModals";

type SortTab = "for_you" | "new" | "top";

const SEEN_KEY = "wordwise_forum_last_seen_v1";

export default function CommunityView() {
  const { session } = useSession();
  const isAdmin = session?.role === "admin";
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [votes, setVotes] = useState<VoteMap>({});
  const [rules, setRules] = useState<string[]>(DEFAULT_FORUM_RULES);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<"All" | ForumCategory>("All");
  const [sort, setSort] = useState<SortTab>("for_you");
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentPost[]>([]);
  const [rulesOpen, setRulesOpen] = useState(true);
  const [toast, setToast] = useState("");
  const [lastSeen, setLastSeen] = useState<number>(0);
  const [initialPostParam, setInitialPostParam] = useState<string | null>(null);

  const userId = session?.id;
  const handle = handleFromName(session?.displayName || "", session?.email);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  useEffect(() => {
    setRecent(getRecentPosts());
    setLastSeen(Number(localStorage.getItem(SEEN_KEY) || 0));
    setInitialPostParam(new URLSearchParams(window.location.search).get("post"));
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchForumData(userId), fetchForumRules()]).then(
      ([d, loadedRules]) => {
        if (!alive) return;
        setPosts(d.posts);
        setVotes(d.votes);
        setRules(loadedRules);
        setLoading(false);
      }
    );
    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!loading && initialPostParam) {
      const p = posts.find((x) => x.id === initialPostParam);
      if (p) openPost(p);
      setInitialPostParam(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, initialPostParam]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = posts.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (!q) return true;
      const qh = q.replace(/^@/, "");
      return (
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.author_handle.toLowerCase().includes(qh)
      );
    });
    const now = Date.now();
    const score = (p: ForumPost) =>
      p.upvotes * 2 +
      p.comment_count * 3 -
      (now - new Date(p.created_at).getTime()) / 3600000 / 6;
    return [...list].sort((a, b) => {
      // Pinned posts always sort to the very top of the feed
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      if (sort === "new")
        return +new Date(b.created_at) - +new Date(a.created_at);
      if (sort === "top") return b.upvotes - a.upvotes;
      return score(b) - score(a);
    });
  }, [posts, category, query, sort]);

  const unread = posts.filter(
    (p) => +new Date(p.created_at) > lastSeen && p.author_handle !== handle
  ).length;

  const openPost = (p: ForumPost) => {
    setOpenId(p.id);
    setRecent(pushRecentPost({ id: p.id, title: p.title }));
  };

  async function handleVote(p: ForumPost, v: 1 | -1) {
    if (!userId) return;
    const current = (votes[p.id] || 0) as 1 | -1 | 0;
    const result = await castVote(userId, p.id, current, v);
    setVotes((prev) => {
      const next = { ...prev };
      if (result === 0) delete next[p.id];
      else next[p.id] = result;
      return next;
    });
    setPosts((prev) =>
      prev.map((x) =>
        x.id === p.id ? { ...x, upvotes: x.upvotes + (result - current) } : x
      )
    );
  }

  async function handleCreate(v: {
    category: ForumCategory;
    title: string;
    content: string;
  }) {
    if (!userId) return;
    const post = await createPost({
      authorId: userId,
      authorHandle: handle,
      ...v,
    });
    setPosts((prev) => [post, ...prev]);
    setShowNew(false);
    flash("Post published!");
  }

  async function handleAddComment(
    p: ForumPost,
    text: string
  ): Promise<ForumComment | null> {
    if (!userId) return null;
    if (p.is_locked && !isAdmin) {
      flash("This thread is locked by an Admin.");
      return null;
    }
    const c = await createComment({
      postId: p.id,
      authorId: userId,
      authorHandle: handle,
      content: text,
    });
    setPosts((prev) =>
      prev.map((x) =>
        x.id === p.id ? { ...x, comment_count: x.comment_count + 1 } : x
      )
    );
    return c;
  }

  async function handleTogglePin(p: ForumPost) {
    if (!isAdmin) return;
    const nextPinned = !p.is_pinned;
    setPosts((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, is_pinned: nextPinned } : x))
    );
    await togglePinPost(p.id, nextPinned);
    flash(nextPinned ? "📌 Post pinned to top of feed." : "Post unpinned.");
  }

  async function handleToggleLock(p: ForumPost) {
    if (!isAdmin) return;
    const nextLocked = !p.is_locked;
    setPosts((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, is_locked: nextLocked } : x))
    );
    await toggleLockPost(p.id, nextLocked);
    flash(nextLocked ? "🔒 Thread locked." : "🔓 Thread unlocked.");
  }

  async function handleDeletePost(p: ForumPost) {
    if (!isAdmin) return;
    if (!window.confirm(`Delete post "${p.title}" by @${p.author_handle}?`)) {
      return;
    }
    setPosts((prev) => prev.filter((x) => x.id !== p.id));
    if (openId === p.id) setOpenId(null);
    await deleteForumPost(p.id);
    flash("🗑️ Post deleted.");
  }

  async function handleDeleteComment(
    p: ForumPost,
    c: ForumComment
  ): Promise<boolean> {
    if (!isAdmin) return false;
    if (!window.confirm(`Delete comment by @${c.author_handle}?`)) {
      return false;
    }
    await deleteForumComment(c.id);
    setPosts((prev) =>
      prev.map((x) =>
        x.id === p.id
          ? { ...x, comment_count: Math.max(0, x.comment_count - 1) }
          : x
      )
    );
    flash("🗑️ Comment deleted.");
    return true;
  }

  function markSeen() {
    const now = Date.now();
    localStorage.setItem(SEEN_KEY, String(now));
    setLastSeen(now);
  }

  const openPostObj = posts.find((p) => p.id === openId) || null;

  const pillCls = (active: boolean) =>
    `w-full cursor-pointer rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
      active
        ? "bg-amber-200 text-orange-800 shadow-inner"
        : "text-stone-600 hover:bg-amber-100"
    }`;

  return (
    <div className="min-h-screen bg-[#fdf6e7] text-stone-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-amber-200 bg-[#fffaf0]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <h1 className="shrink-0 text-lg font-extrabold text-orange-700">
            💬 Wordwise Community
          </h1>
          {isAdmin && (
            <Link
              href="/dashboard/admin"
              className="hidden shrink-0 items-center gap-1 rounded-full border border-orange-300 bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white sm:inline-flex"
              title="Open Admin CMS Moderation Tab"
            >
              🛡️ Admin Mode
            </Link>
          )}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts or @username"
            aria-label="Search posts or @username"
            className="min-w-0 flex-1 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-amber-200"
          />
          <button
            type="button"
            onClick={markSeen}
            aria-label={`Notifications (${unread} new)`}
            title={unread ? `${unread} new posts` : "No new posts"}
            className="relative cursor-pointer rounded-full border border-amber-200 bg-white px-3 py-2 text-lg hover:bg-amber-50"
          >
            🔔
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-orange-500 px-1.5 text-[10px] font-extrabold text-white">
                {unread}
              </span>
            )}
          </button>
          <Link
            href="/dashboard"
            className="shrink-0 rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-orange-700 hover:bg-amber-50"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 lg:grid-cols-[200px_minmax(0,1fr)_260px]">
        {/* Left */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <h2 className="mb-2 px-1 text-xs font-extrabold uppercase tracking-wider text-stone-500">
            Communities
          </h2>
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible">
            {(["All", ...FORUM_CATEGORIES] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`${pillCls(category === c)} whitespace-nowrap`}
              >
                {c}
              </button>
            ))}
          </div>
        </aside>

        {/* Center */}
        <main className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex gap-1 rounded-full border border-amber-200 bg-white p-1">
              {(
                [
                  ["for_you", "For You"],
                  ["new", "New"],
                  ["top", "Top"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSort(id)}
                  className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold ${
                    sort === id
                      ? "bg-amber-200 text-orange-800"
                      : "text-stone-600 hover:bg-amber-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="cursor-pointer rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2 text-sm font-extrabold text-white shadow hover:brightness-105"
            >
              + New Post
            </button>
          </div>

          {loading ? (
            <p className="p-6 text-center text-sm text-stone-500">
              Loading community...
            </p>
          ) : visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-amber-300 bg-white/60 p-8 text-center text-sm text-stone-500">
              No posts match your filters. Try another community or search.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {visible.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  vote={(votes[p.id] || 0) as 1 | -1 | 0}
                  isAdmin={isAdmin}
                  onVote={(v) => handleVote(p, v)}
                  onOpen={() => openPost(p)}
                  onCopied={() => flash("Link copied!")}
                  onTogglePin={() => handleTogglePin(p)}
                  onToggleLock={() => handleToggleLock(p)}
                  onDelete={() => handleDeletePost(p)}
                />
              ))}
            </div>
          )}
        </main>

        {/* Right */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <section className="rounded-2xl border border-amber-200 bg-white/80 p-4">
            <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-stone-500">
              Recent
            </h2>
            {recent.length === 0 ? (
              <p className="text-sm text-stone-500">
                Posts you open will show up here.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {recent.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        const p = posts.find((x) => x.id === r.id);
                        if (p) openPost(p);
                      }}
                      className="w-full cursor-pointer truncate rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-stone-700 hover:bg-amber-100"
                    >
                      {r.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-amber-200 bg-white/80 p-4">
            <button
              type="button"
              onClick={() => setRulesOpen((o) => !o)}
              aria-expanded={rulesOpen}
              className="flex w-full cursor-pointer items-center justify-between text-xs font-extrabold uppercase tracking-wider text-stone-500"
            >
              <span>Forum Rules</span>
              <span>{rulesOpen ? "▾" : "▸"}</span>
            </button>
            {rulesOpen && (
              <ol className="mt-3 flex flex-col gap-1.5 text-sm text-stone-700">
                {rules.map((r, i) => (
                  <li key={`${i}-${r}`}>
                    <span className="font-extrabold text-orange-600">
                      {i + 1}.
                    </span>{" "}
                    {r}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>

      {showNew && (
        <NewPostModal
          defaultCategory={category === "All" ? "General" : category}
          onClose={() => setShowNew(false)}
          onSubmit={handleCreate}
        />
      )}
      {openPostObj && (
        <PostDetailModal
          post={openPostObj}
          vote={(votes[openPostObj.id] || 0) as 1 | -1 | 0}
          isAdmin={isAdmin}
          onVote={(v) => handleVote(openPostObj, v)}
          onClose={() => setOpenId(null)}
          onCopied={() => flash("Link copied!")}
          onAddComment={(t) => handleAddComment(openPostObj, t)}
          onDeleteComment={(c) => handleDeleteComment(openPostObj, c)}
          onTogglePin={() => handleTogglePin(openPostObj)}
          onToggleLock={() => handleToggleLock(openPostObj)}
          onDeletePost={() => handleDeletePost(openPostObj)}
        />
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-stone-900 px-5 py-2 text-sm font-bold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
