"use client";

import React, { useEffect, useState } from "react";
import {
  FORUM_CATEGORIES,
  fetchComments,
  formatRelativeTime,
  type ForumCategory,
  type ForumComment,
  type ForumPost,
} from "@/lib/forum";
import { CATEGORY_STYLES, ShareButton, VoteBar } from "./PostCard";

const overlayCls =
  "fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4";
const modalCls =
  "flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-amber-200 bg-[#fffaf0] shadow-2xl";
const inputCls =
  "w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-amber-200";

export function NewPostModal({
  defaultCategory,
  onClose,
  onSubmit,
}: {
  defaultCategory: ForumCategory;
  onClose: () => void;
  onSubmit: (v: {
    category: ForumCategory;
    title: string;
    content: string;
  }) => Promise<void>;
}) {
  const [category, setCategory] = useState<ForumCategory>(defaultCategory);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErr("Please add a title and some content.");
      return;
    }
    setBusy(true);
    await onSubmit({
      category,
      title: title.trim(),
      content: content.trim(),
    });
    setBusy(false);
  }

  return (
    <div className={overlayCls} onClick={onClose} role="dialog" aria-modal="true">
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className={`${modalCls} gap-3 p-5`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-stone-900">Create a post</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full px-2 text-lg text-stone-500 hover:bg-amber-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <label className="text-xs font-extrabold uppercase tracking-wider text-stone-600">
          Community
        </label>
        <select
          className={inputCls}
          value={category}
          onChange={(e) => setCategory(e.target.value as ForumCategory)}
        >
          {FORUM_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="text-xs font-extrabold uppercase tracking-wider text-stone-600">
          Title
        </label>
        <input
          className={inputCls}
          maxLength={150}
          placeholder="An interesting title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label className="text-xs font-extrabold uppercase tracking-wider text-stone-600">
          Content
        </label>
        <textarea
          className={`${inputCls} min-h-[140px] resize-y`}
          placeholder="Share your thoughts, tips or questions..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {err && <p className="text-sm font-bold text-rose-600">{err}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-bold text-stone-600 hover:bg-amber-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="cursor-pointer rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2 text-sm font-extrabold text-white shadow hover:brightness-105 disabled:opacity-60"
          >
            {busy ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function PostDetailModal({
  post,
  vote,
  isAdmin = false,
  onVote,
  onClose,
  onCopied,
  onAddComment,
  onDeleteComment,
  onTogglePin,
  onToggleLock,
  onDeletePost,
}: {
  post: ForumPost;
  vote: 1 | -1 | 0;
  isAdmin?: boolean;
  onVote: (v: 1 | -1) => void;
  onClose: () => void;
  onCopied: () => void;
  onAddComment: (text: string) => Promise<ForumComment | null>;
  onDeleteComment?: (comment: ForumComment) => Promise<boolean>;
  onTogglePin?: () => void;
  onToggleLock?: () => void;
  onDeletePost?: () => void;
}) {
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchComments(post.id).then((c) => {
      if (!alive) return;
      setComments(c);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [post.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (post.is_locked && !isAdmin) return;
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    const c = await onAddComment(t);
    if (c) {
      setComments((prev) => [...prev, c]);
      setText("");
    }
    setBusy(false);
  }

  async function handleRemoveComment(c: ForumComment) {
    if (!onDeleteComment) return;
    const removed = await onDeleteComment(c);
    if (removed) {
      setComments((prev) => prev.filter((item) => item.id !== c.id));
    }
  }

  return (
    <div className={overlayCls} onClick={onClose} role="dialog" aria-modal="true">
      <div onClick={(e) => e.stopPropagation()} className={modalCls}>
        <div className="flex items-start justify-between gap-3 border-b border-amber-200 p-5">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              {post.is_pinned && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-gradient-to-r from-amber-200 to-amber-100 px-2.5 py-0.5 font-extrabold text-amber-950">
                  📌 Pinned
                </span>
              )}
              {post.is_locked && (
                <span className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-stone-100 px-2.5 py-0.5 font-extrabold text-stone-700">
                  🔒 Locked by Admin
                </span>
              )}
              <span
                className={`rounded-full border px-2.5 py-0.5 font-extrabold ${
                  CATEGORY_STYLES[post.category] || CATEGORY_STYLES.General
                }`}
              >
                {post.category}
              </span>
              <span className="font-bold text-stone-700">
                @{post.author_handle}
              </span>
              <span className="text-stone-500">
                • {formatRelativeTime(post.created_at)}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-stone-900">
              {post.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full px-2 text-lg text-stone-500 hover:bg-amber-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {post.is_locked && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-100/80 px-3.5 py-2.5 text-xs font-extrabold text-amber-950">
              <span aria-hidden="true">🔒</span>
              <span>
                Locked by Admin — This thread has been locked and new replies are disabled for learners.
              </span>
            </div>
          )}

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
            {post.content}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <VoteBar post={post} vote={vote} onVote={onVote} />
              <span className="px-3 text-sm font-bold text-stone-600">
                💬 {comments.length}
              </span>
              <ShareButton postId={post.id} onCopied={onCopied} />
            </div>

            {isAdmin && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/80 px-2.5 py-1">
                <span className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-orange-800">
                  Admin Moderation
                </span>
                <button
                  type="button"
                  onClick={onTogglePin}
                  className="cursor-pointer rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-amber-100"
                >
                  📌 {post.is_pinned ? "Unpin Post" : "Pin Post"}
                </button>
                <button
                  type="button"
                  onClick={onToggleLock}
                  className="cursor-pointer rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-amber-100"
                >
                  🔒 {post.is_locked ? "Unlock Thread" : "Lock Thread"}
                </button>
                <button
                  type="button"
                  onClick={onDeletePost}
                  className="cursor-pointer rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50"
                >
                  🗑️ Delete Post
                </button>
              </div>
            )}
          </div>

          <h3 className="mb-2 mt-6 text-xs font-extrabold uppercase tracking-wider text-stone-500">
            Comments ({comments.length})
          </h3>
          {loading ? (
            <p className="text-sm text-stone-500">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-amber-200 p-3 text-sm text-stone-500">
              No comments yet. {post.is_locked ? "This thread is locked." : "Be the first to reply!"}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-amber-100 bg-white p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-xs">
                      <span className="font-bold text-stone-800">
                        @{c.author_handle}
                      </span>{" "}
                      <span className="text-stone-400">
                        • {formatRelativeTime(c.created_at)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-stone-700">
                      {c.content}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRemoveComment(c)}
                      className="shrink-0 cursor-pointer rounded-lg border border-rose-200 bg-rose-50/70 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
                      title="Delete comment"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {post.is_locked && !isAdmin ? (
          <div className="border-t border-amber-200 bg-stone-100 px-5 py-3.5 text-center text-xs font-bold text-stone-600">
            🔒 Thread Locked by Admin — Replies are disabled for this discussion.
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="flex gap-2 border-t border-amber-200 bg-white/70 p-4"
          >
            <input
              className={inputCls}
              placeholder={
                post.is_locked
                  ? "Thread is locked (Admin reply override)..."
                  : "Write a reply..."
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="cursor-pointer rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2 text-sm font-extrabold text-white disabled:opacity-50"
            >
              Reply
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
