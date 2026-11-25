"use client";

import React from "react";
import { formatRelativeTime, type ForumPost } from "@/lib/forum";

export const CATEGORY_STYLES: Record<string, string> = {
  General: "bg-amber-100 text-amber-800 border-amber-200",
  "STEM & Tech": "bg-sky-100 text-sky-800 border-sky-200",
  "Speaking & Culture": "bg-rose-100 text-rose-800 border-rose-200",
  Feedback: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Off-topic": "bg-stone-100 text-stone-700 border-stone-200",
};

export function VoteBar({
  post,
  vote,
  onVote,
}: {
  post: ForumPost;
  vote: 1 | -1 | 0;
  onVote: (v: 1 | -1) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50/60 px-1.5 py-0.5">
      <button
        type="button"
        aria-label="Upvote"
        onClick={(e) => {
          e.stopPropagation();
          onVote(1);
        }}
        className={`cursor-pointer rounded-full px-1.5 text-sm font-bold transition hover:bg-amber-200 ${
          vote === 1 ? "text-orange-600" : "text-stone-500"
        }`}
      >
        ▲
      </button>
      <span
        className={`min-w-[1.5rem] text-center text-sm font-extrabold ${
          vote === 1
            ? "text-orange-600"
            : vote === -1
              ? "text-indigo-600"
              : "text-stone-700"
        }`}
      >
        {post.upvotes}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        onClick={(e) => {
          e.stopPropagation();
          onVote(-1);
        }}
        className={`cursor-pointer rounded-full px-1.5 text-sm font-bold transition hover:bg-amber-200 ${
          vote === -1 ? "text-indigo-600" : "text-stone-500"
        }`}
      >
        ▼
      </button>
    </div>
  );
}

export function ShareButton({
  postId,
  onCopied,
}: {
  postId: string;
  onCopied: () => void;
}) {
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        const url = `${window.location.origin}/community?post=${encodeURIComponent(postId)}`;
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          /* clipboard unavailable */
        }
        onCopied();
      }}
      className="cursor-pointer rounded-full px-3 py-1 text-sm font-bold text-stone-600 hover:bg-amber-100"
    >
      🔗 Share
    </button>
  );
}

export default function PostCard({
  post,
  vote,
  isAdmin = false,
  onVote,
  onOpen,
  onCopied,
  onTogglePin,
  onToggleLock,
  onDelete,
}: {
  post: ForumPost;
  vote: 1 | -1 | 0;
  isAdmin?: boolean;
  onVote: (v: 1 | -1) => void;
  onOpen: () => void;
  onCopied: () => void;
  onTogglePin?: () => void;
  onToggleLock?: () => void;
  onDelete?: () => void;
}) {
  return (
    <article
      onClick={onOpen}
      className={`cursor-pointer rounded-2xl border p-4 shadow-sm transition hover:border-amber-400 hover:shadow-md ${
        post.is_pinned
          ? "border-amber-400/90 bg-gradient-to-br from-amber-50/90 via-white to-white"
          : "border-amber-200/80 bg-white/90"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        {post.is_pinned && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-gradient-to-r from-amber-200 to-amber-100 px-2.5 py-0.5 font-extrabold text-amber-950 shadow-2xs">
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
        <span className="font-bold text-stone-700">@{post.author_handle}</span>
        <span className="text-stone-400">•</span>
        <span className="text-stone-500">
          {formatRelativeTime(post.created_at)}
        </span>
      </div>
      <h3 className="text-lg font-extrabold leading-snug text-stone-900">
        {post.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-stone-600">{post.content}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <VoteBar post={post} vote={vote} onVote={onVote} />
          <span className="rounded-full px-3 py-1 text-sm font-bold text-stone-600">
            💬 {post.comment_count}
          </span>
          <ShareButton postId={post.id} onCopied={onCopied} />
        </div>

        {isAdmin && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-200/90 bg-amber-50/70 px-2 py-1"
          >
            <span className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-orange-800">
              Admin
            </span>
            <button
              type="button"
              onClick={onTogglePin}
              className={`cursor-pointer rounded-lg border px-2 py-0.5 text-xs font-bold transition ${
                post.is_pinned
                  ? "border-amber-400 bg-amber-200 text-amber-950 hover:bg-amber-300"
                  : "border-amber-200 bg-white text-stone-700 hover:bg-amber-100"
              }`}
            >
              📌 {post.is_pinned ? "Unpin" : "Pin"}
            </button>
            <button
              type="button"
              onClick={onToggleLock}
              className={`cursor-pointer rounded-lg border px-2 py-0.5 text-xs font-bold transition ${
                post.is_locked
                  ? "border-stone-400 bg-stone-200 text-stone-900 hover:bg-stone-300"
                  : "border-amber-200 bg-white text-stone-700 hover:bg-amber-100"
              }`}
            >
              🔒 {post.is_locked ? "Unlock" : "Lock"}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="cursor-pointer rounded-lg border border-rose-200 bg-white px-2 py-0.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
            >
              🗑️ Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
