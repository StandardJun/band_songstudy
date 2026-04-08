"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Song, Comment } from "@/types";
import type { WaveformPlayerHandle } from "@/components/WaveformPlayer";
import CommentList from "@/components/CommentList";
import CommentForm from "@/components/CommentForm";

const WaveformPlayer = dynamic(
  () => import("@/components/WaveformPlayer"),
  { ssr: false }
);

export default function SongDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playerRef = useRef<WaveformPlayerHandle>(null);

  const [song, setSong] = useState<Song | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Comment form state
  const [commentTimeStart, setCommentTimeStart] = useState<number | null>(null);
  const [commentTimeEnd, setCommentTimeEnd] = useState<number | null>(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [regionMode, setRegionMode] = useState(false);

  const songId = params.id as string;

  // Fetch song
  useEffect(() => {
    if (!songId) return;

    fetch(`/api/songs/${songId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setSong(data.song))
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [songId, router]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!songId) return;
    try {
      const res = await fetch(`/api/songs/${songId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
      }
    } catch {
      // silent
    }
  }, [songId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Comment at current time
  const handleCommentAtCurrentTime = useCallback(() => {
    const time = playerRef.current?.getCurrentTime() ?? 0;
    setCommentTimeStart(time);
    setCommentTimeEnd(null);
    setShowCommentForm(true);
    setRegionMode(false);
  }, []);

  // Region select
  const handleRegionSelect = useCallback((start: number, end: number) => {
    setCommentTimeStart(start);
    setCommentTimeEnd(end);
    setShowCommentForm(true);
    setRegionMode(false);
  }, []);

  // Region mode toggle
  const handleRegionModeToggle = useCallback(() => {
    setRegionMode((v) => !v);
  }, []);

  // Timestamp click from comment
  const handleTimestampClick = useCallback((time: number) => {
    playerRef.current?.seekTo(time);
  }, []);

  // Marker click — scroll to comment + highlight
  const handleMarkerClick = useCallback((commentId: string) => {
    setHighlightId(commentId);
    const el = document.getElementById(`comment-${commentId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => setHighlightId(null), 2000);
  }, []);

  // After comment submit
  const handleCommentSubmit = useCallback(() => {
    setShowCommentForm(false);
    setCommentTimeStart(null);
    setCommentTimeEnd(null);
    fetchComments();
  }, [fetchComments]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-2xl mx-auto px-4 pt-6 animate-pulse">
          <div className="h-4 bg-slate-800 rounded w-1/3 mb-2" />
          <div className="h-3 bg-slate-800/60 rounded w-1/5 mb-6" />
          <div className="bg-slate-800 rounded-lg h-24 mb-4" />
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <div className="h-3 bg-slate-700 rounded w-1/4 mb-2" />
                <div className="h-3 bg-slate-700/60 rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!song) return null;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Sticky player area */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-3">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => router.push("/")}
              className="text-slate-400 hover:text-slate-200 text-sm shrink-0 p-2 -ml-2"
            >
              &larr;
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-100 truncate">
                {song.title}
              </h1>
              <p className="text-xs text-slate-400 truncate">{song.artist}</p>
            </div>
          </div>

          {/* Waveform player */}
          {!song.audio_url ? (
            <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700/50">
              <p className="text-slate-500 text-sm">오디오 파일을 불러올 수 없습니다.</p>
            </div>
          ) : (
            <WaveformPlayer
              ref={playerRef}
              audioUrl={song.audio_url}
              comments={comments}
              onRegionSelect={handleRegionSelect}
              onMarkerClick={handleMarkerClick}
              onCommentAtCurrentTime={handleCommentAtCurrentTime}
              onRegionModeToggle={handleRegionModeToggle}
              regionMode={regionMode}
              commentFormTime={commentTimeStart}
            />
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Comment form */}
        {showCommentForm && (
          <div className="mb-4 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <CommentForm
              songId={songId}
              timeStart={commentTimeStart}
              timeEnd={commentTimeEnd}
              onSubmit={handleCommentSubmit}
              onCancel={() => {
                setShowCommentForm(false);
                setCommentTimeStart(null);
                setCommentTimeEnd(null);
              }}
            />
          </div>
        )}

        {/* Comment list */}
        <CommentList
          comments={comments}
          songId={songId}
          onTimestampClick={handleTimestampClick}
          onRefresh={fetchComments}
          highlightId={highlightId}
        />
      </div>
    </div>
  );
}
