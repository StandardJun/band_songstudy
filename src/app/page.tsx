"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import SongCard from "@/components/SongCard";
import UploadModal from "@/components/UploadModal";
import type { Song } from "@/types";

interface MemberInfo {
  id: string;
  name: string;
  color: string;
}

export default function HomePage() {
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSongs = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/songs");
      if (!res.ok) throw new Error("곡 목록을 불러오지 못했습니다.");
      const data = await res.json();
      setSongs(data.songs || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "곡 목록을 불러오지 못했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch current member
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.member) setMember(data.member);
      })
      .catch(() => {});

    fetchSongs();
  }, [fetchSongs]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  // Group songs by week
  const songsByWeek = songs.reduce<Record<number, Song[]>>((acc, song) => {
    const week = song.week_number;
    if (!acc[week]) acc[week] = [];
    acc[week].push(song);
    return acc;
  }, {});

  const sortedWeeks = Object.keys(songsByWeek)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-100">Song Study</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUpload(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              곡 업로드
            </button>
            {member && (
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-slate-200 text-sm py-2 pl-2"
              >
                로그아웃
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="h-4 bg-slate-700 rounded w-2/3 mb-2" />
                <div className="h-3 bg-slate-700/60 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button
              onClick={fetchSongs}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : sortedWeeks.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            <p className="text-lg mb-2">아직 곡이 없어요</p>
            <p className="text-sm mb-4">첫 곡을 업로드해보세요!</p>
            <button
              onClick={() => setShowUpload(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              곡 업로드
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedWeeks.map((week) => (
              <section key={week}>
                <h2 className="text-sm font-medium text-slate-400 mb-3">
                  {week}주차
                </h2>
                <div className="space-y-2">
                  {songsByWeek[week].map((song) => (
                    <SongCard key={song.id} song={song} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={fetchSongs}
      />
    </div>
  );
}
