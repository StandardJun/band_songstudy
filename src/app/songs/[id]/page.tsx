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

interface MemberInfo {
  id: string;
  name: string;
  color: string;
}

export default function SongDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playerRef = useRef<WaveformPlayerHandle>(null);

  const [song, setSong] = useState<Song | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [currentMember, setCurrentMember] = useState<MemberInfo | null>(null);

  // Comment form state
  const [commentTimeStart, setCommentTimeStart] = useState<number | null>(null);
  const [commentTimeEnd, setCommentTimeEnd] = useState<number | null>(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [regionMode, setRegionMode] = useState(false);

  // Song edit/delete state
  const [showSongMenu, setShowSongMenu] = useState(false);
  const [showEditSong, setShowEditSong] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [editWeek, setEditWeek] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const songId = params.id as string;

  // Fetch current member
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.member) setCurrentMember(data.member);
      })
      .catch(() => {});
  }, []);

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

  // Open comment form (default: point at current time)
  const handleOpenComment = useCallback(() => {
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

  // Song edit
  const handleEditSong = async () => {
    setEditLoading(true);
    try {
      const res = await fetch(`/api/songs/${songId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, artist: editArtist, week_number: editWeek }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "수정 실패");
        return;
      }
      setSong((prev) => prev ? { ...prev, title: editTitle, artist: editArtist, week_number: parseInt(editWeek) } : prev);
      setShowEditSong(false);
    } catch {
      alert("수정 실패");
    } finally {
      setEditLoading(false);
    }
  };

  // Song delete
  const handleDeleteSong = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/songs/${songId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "삭제 실패");
        return;
      }
      router.replace("/");
    } catch {
      alert("삭제 실패");
    } finally {
      setDeleteLoading(false);
    }
  };

  // After comment submit
  const handleCommentSubmit = useCallback(() => {
    setShowCommentForm(false);
    setCommentTimeStart(null);
    setCommentTimeEnd(null);
    fetchComments();
  }, [fetchComments]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        <div className="max-w-2xl mx-auto px-4 pt-6 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-100 dark:bg-slate-800/60 rounded w-1/5 mb-6" />
          <div className="bg-gray-100 dark:bg-slate-800 rounded-lg h-24 mb-4" />
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700/50">
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-slate-700/60 rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!song) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Sticky player area */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-3">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => router.push("/")}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm shrink-0 p-2 -ml-2"
            >
              &larr;
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {song.title}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{song.artist}</p>
            </div>
            {/* Song menu (owner only) */}
            {currentMember && song.member?.id === currentMember.id && (
              <div className="relative">
                <button
                  onClick={() => setShowSongMenu((v) => !v)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {showSongMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSongMenu(false)} />
                    <div className="absolute right-0 top-10 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                      <button
                        onClick={() => {
                          setEditTitle(song.title);
                          setEditArtist(song.artist);
                          setEditWeek(String(song.week_number));
                          setShowEditSong(true);
                          setShowSongMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(true);
                          setShowSongMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        삭제
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Waveform player */}
          {!song.audio_url ? (
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 text-center border border-gray-200 dark:border-slate-700/50">
              <p className="text-slate-500 text-sm">오디오 파일을 불러올 수 없습니다.</p>
            </div>
          ) : (
            <WaveformPlayer
              ref={playerRef}
              audioUrl={song.audio_url}
              comments={comments}
              onRegionSelect={handleRegionSelect}
              onMarkerClick={handleMarkerClick}
              onOpenComment={handleOpenComment}
              onRegionModeToggle={handleRegionModeToggle}
              regionMode={regionMode}
            />
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Comment form */}
        {showCommentForm && (
          <div className="mb-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700/50">
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
              onGetCurrentTime={() => playerRef.current?.getCurrentTime() ?? 0}
              onStartRegionSelect={() => setRegionMode(true)}
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
          currentMember={currentMember}
        />
      </div>

      {/* Edit song modal */}
      {showEditSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">곡 정보 수정</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">제목</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">아티스트</label>
                <input
                  type="text"
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">주차</label>
                <input
                  type="number"
                  value={editWeek}
                  onChange={(e) => setEditWeek(e.target.value)}
                  min={1}
                  className="w-full bg-gray-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowEditSong(false)}
                className="flex-1 text-slate-500 dark:text-slate-400 text-sm py-2.5 rounded-lg border border-gray-300 dark:border-slate-600"
              >
                취소
              </button>
              <button
                onClick={handleEditSong}
                disabled={editLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {editLoading ? "수정 중..." : "수정"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">곡 삭제</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              &quot;{song.title}&quot;을(를) 삭제하시겠습니까?<br />
              <span className="text-red-500">댓글도 모두 함께 삭제됩니다.</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 text-slate-500 dark:text-slate-400 text-sm py-2.5 rounded-lg border border-gray-300 dark:border-slate-600"
              >
                취소
              </button>
              <button
                onClick={handleDeleteSong}
                disabled={deleteLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {deleteLoading ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
