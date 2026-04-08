"use client";

import { useState, useEffect } from "react";
import { formatTime, parseTime } from "@/lib/format";

interface CommentFormProps {
  songId: string;
  timeStart: number | null;
  timeEnd: number | null;
  parentId?: string | null;
  onSubmit: () => void;
  onCancel?: () => void;
  placeholder?: string;
  compact?: boolean;
}

export default function CommentForm({
  songId,
  timeStart,
  timeEnd,
  parentId = null,
  onSubmit,
  onCancel,
  placeholder = "댓글을 입력하세요...",
  compact = false,
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync manual time display with props
  useEffect(() => {
    if (timeStart != null && timeEnd != null) {
      setManualTime(`${formatTime(timeStart)}-${formatTime(timeEnd)}`);
    } else if (timeStart != null) {
      setManualTime(formatTime(timeStart));
    }
  }, [timeStart, timeEnd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setError(null);
    setSubmitting(true);

    // Parse manual time if modified
    let finalStart = timeStart;
    let finalEnd = timeEnd;

    if (manualTime.trim()) {
      const parts = manualTime.split("-");
      const parsedStart = parseTime(parts[0].trim());
      if (parsedStart == null) {
        setError("시간 형식이 올바르지 않습니다. (예: 2:30 또는 2:30-3:00)");
        setSubmitting(false);
        return;
      }
      finalStart = parsedStart;
      if (parts.length > 1) {
        const parsedEnd = parseTime(parts[1].trim());
        if (parsedEnd == null) {
          setError(
            "시간 형식이 올바르지 않습니다. (예: 2:30 또는 2:30-3:00)"
          );
          setSubmitting(false);
          return;
        }
        finalEnd = parsedEnd;
      } else {
        finalEnd = null;
      }
    }

    if (finalStart == null) {
      setError("시간을 입력해주세요.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/songs/${songId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time_start: finalStart,
          time_end: finalEnd,
          content: content.trim(),
          parent_id: parentId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "작성 실패");
      }

      setContent("");
      setManualTime("");
      onSubmit();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "댓글 작성에 실패했습니다.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={compact ? "" : "space-y-2"}>
      {/* Time input */}
      {!parentId && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 shrink-0">시간</label>
          <input
            type="text"
            value={manualTime}
            onChange={(e) => setManualTime(e.target.value)}
            placeholder="0:00 또는 0:00-0:30"
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 w-32 focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {/* Content input */}
      <div className="flex items-start gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={compact ? 1 : 2}
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit(e);
            }
          }}
        />
        <div className="flex flex-col gap-1">
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded transition-colors"
          >
            {submitting ? "..." : "작성"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-xs text-slate-500 hover:text-slate-300"
            >
              취소
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
