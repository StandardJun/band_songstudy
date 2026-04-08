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
  const [showChangePin, setShowChangePin] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPin: "", newPin: "", confirmPin: "" });
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMsg, setPinMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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

  async function handleChangePin() {
    setPinMsg(null);
    if (pinForm.newPin !== pinForm.confirmPin) {
      setPinMsg({ type: "err", text: "새 PIN이 일치하지 않습니다." });
      return;
    }
    if (pinForm.newPin.length < 4) {
      setPinMsg({ type: "err", text: "PIN은 4자리 이상이어야 합니다." });
      return;
    }
    setPinLoading(true);
    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin: pinForm.currentPin, newPin: pinForm.newPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPinMsg({ type: "err", text: data.error || "변경 실패" });
      } else {
        setPinMsg({ type: "ok", text: "PIN이 변경되었습니다." });
        setPinForm({ currentPin: "", newPin: "", confirmPin: "" });
        setTimeout(() => setShowChangePin(false), 1200);
      }
    } catch {
      setPinMsg({ type: "err", text: "PIN 변경 실패" });
    } finally {
      setPinLoading(false);
    }
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
              <>
                <button
                  onClick={() => { setShowChangePin(true); setPinMsg(null); setPinForm({ currentPin: "", newPin: "", confirmPin: "" }); }}
                  className="text-slate-400 hover:text-slate-200 text-sm py-2"
                >
                  PIN 변경
                </button>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-slate-200 text-sm py-2 pl-2"
                >
                  로그아웃
                </button>
              </>
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

      {/* PIN 변경 모달 */}
      {showChangePin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-slate-700">
            <h2 className="text-lg font-bold text-slate-100 mb-4">PIN 변경</h2>
            <div className="space-y-3">
              <input
                type="password"
                inputMode="numeric"
                placeholder="현재 PIN"
                value={pinForm.currentPin}
                onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value })}
                className="w-full bg-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="password"
                inputMode="numeric"
                placeholder="새 PIN (4자리 이상)"
                value={pinForm.newPin}
                onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value })}
                className="w-full bg-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="password"
                inputMode="numeric"
                placeholder="새 PIN 확인"
                value={pinForm.confirmPin}
                onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                className="w-full bg-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {pinMsg && (
              <p className={`text-sm mt-3 ${pinMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
                {pinMsg.text}
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowChangePin(false)}
                className="flex-1 text-slate-400 hover:text-slate-200 text-sm py-2.5 rounded-lg border border-slate-600"
              >
                취소
              </button>
              <button
                onClick={handleChangePin}
                disabled={pinLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {pinLoading ? "변경 중..." : "변경"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
