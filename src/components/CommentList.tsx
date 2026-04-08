"use client";

import { useState, useMemo } from "react";
import type { Comment } from "@/types";
import CommentThread from "./CommentThread";

type SortMode = "time" | "latest";

interface CommentListProps {
  comments: Comment[];
  songId: string;
  onTimestampClick: (time: number) => void;
  onRefresh: () => void;
  highlightId?: string | null;
}

export default function CommentList({
  comments,
  songId,
  onTimestampClick,
  onRefresh,
  highlightId,
}: CommentListProps) {
  const [sortMode, setSortMode] = useState<SortMode>("time");

  // Group into threads: top-level comments with nested replies
  const threads = useMemo(() => {
    const topLevel = comments.filter((c) => !c.parent_id);
    const replyMap = new Map<string, Comment[]>();

    for (const c of comments) {
      if (c.parent_id) {
        const arr = replyMap.get(c.parent_id) ?? [];
        arr.push(c);
        replyMap.set(c.parent_id, arr);
      }
    }

    const threaded = topLevel.map((c) => ({
      ...c,
      replies: (replyMap.get(c.id) ?? []).sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }));

    if (sortMode === "time") {
      threaded.sort((a, b) => a.time_start - b.time_start);
    } else {
      threaded.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return threaded;
  }, [comments, sortMode]);

  return (
    <div>
      {/* Header with sort toggle */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-slate-400">
          댓글 {comments.filter((c) => !c.parent_id).length}개
        </h2>
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setSortMode("time")}
            className={`px-2 py-1 rounded transition-colors ${
              sortMode === "time"
                ? "bg-slate-700 text-slate-200"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            시간순
          </button>
          <button
            onClick={() => setSortMode("latest")}
            className={`px-2 py-1 rounded transition-colors ${
              sortMode === "latest"
                ? "bg-slate-700 text-slate-200"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            최신순
          </button>
        </div>
      </div>

      {/* Comment threads */}
      {threads.length === 0 ? (
        <div className="bg-slate-800/50 rounded-lg p-6 text-center border border-slate-700/50">
          <p className="text-slate-500 text-sm">
            첫 댓글을 남겨보세요!
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {threads.map((thread) => (
            <CommentThread
              key={thread.id}
              comment={thread}
              songId={songId}
              onTimestampClick={onTimestampClick}
              onRefresh={onRefresh}
              highlightId={highlightId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
