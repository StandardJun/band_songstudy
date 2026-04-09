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

const COLOR_PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

export default function HomePage() {
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [allMembers, setAllMembers] = useState<MemberInfo[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChangePin, setShowChangePin] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPin: "", newPin: "", confirmPin: "" });
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMsg, setPinMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorLoading, setColorLoading] = useState(false);
  const [colorMsg, setColorMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/members");
      const data = await res.json();
      setAllMembers(data.members || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.member) setMember(data.member);
      })
      .catch(() => {});

    fetchSongs();
    fetchMembers();
  }, [fetchSongs, fetchMembers]);

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

  async function handleColorChange(color: string) {
    setColorMsg(null);
    setColorLoading(true);
    try {
      const res = await fetch("/api/members/color", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      });
      const data = await res.json();
      if (!res.ok) {
        setColorMsg({ type: "err", text: data.error || "색상 변경 실패" });
      } else {
        setColorMsg({ type: "ok", text: "색상이 변경되었습니다." });
        setMember((prev) => (prev ? { ...prev, color } : prev));
        fetchMembers();
        setTimeout(() => setShowColorPicker(false), 800);
      }
    } catch {
      setColorMsg({ type: "err", text: "색상 변경 실패" });
    } finally {
      setColorLoading(false);
    }
  }

  const usedColors = allMembers
    .filter((m) => m.id !== member?.id)
    .map((m) => m.color);

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
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Song Study</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUpload(true)}
              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
              title="곡 업로드"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {member && (
              <>
                <button
                  onClick={() => { setShowChangePin(true); setPinMsg(null); setPinForm({ currentPin: "", newPin: "", confirmPin: "" }); }}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2"
                  title="PIN 변경"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                </button>
                <button
                  onClick={() => { setShowColorPicker(true); setColorMsg(null); }}
                  className="p-2"
                  title="색상 변경"
                >
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-slate-600" style={{ backgroundColor: member.color }} />
                </button>
                <button
                  onClick={handleLogout}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2"
                  title="로그아웃"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9" />
                  </svg>
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
              <div key={i} className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-slate-700/60 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 dark:text-red-400 text-sm mb-3">{error}</p>
            <button
              onClick={fetchSongs}
              className="text-sm text-red-500 hover:text-red-400 transition-colors"
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
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              곡 업로드
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedWeeks.map((week) => (
              <section key={week}>
                <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
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
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">PIN 변경</h2>
            <div className="space-y-3">
              <input
                type="password"
                inputMode="numeric"
                placeholder="현재 PIN"
                value={pinForm.currentPin}
                onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value })}
                className="w-full bg-gray-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <input
                type="password"
                inputMode="numeric"
                placeholder="새 PIN (4자리 이상)"
                value={pinForm.newPin}
                onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value })}
                className="w-full bg-gray-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <input
                type="password"
                inputMode="numeric"
                placeholder="새 PIN 확인"
                value={pinForm.confirmPin}
                onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                className="w-full bg-gray-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            {pinMsg && (
              <p className={`text-sm mt-3 ${pinMsg.type === "ok" ? "text-green-500 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                {pinMsg.text}
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowChangePin(false)}
                className="flex-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm py-2.5 rounded-lg border border-gray-300 dark:border-slate-600"
              >
                취소
              </button>
              <button
                onClick={handleChangePin}
                disabled={pinLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {pinLoading ? "변경 중..." : "변경"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 색상 변경 모달 */}
      {showColorPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">색상 변경</h2>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PALETTE.map((color) => {
                const usedBy = allMembers.find((m) => m.color.toLowerCase() === color.toLowerCase() && m.id !== member?.id);
                const isCurrent = member?.color.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    disabled={!!usedBy || colorLoading}
                    onClick={() => handleColorChange(color)}
                    className={`relative flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all ${
                      isCurrent
                        ? "border-red-500 bg-red-500/10 dark:bg-red-500/10"
                        : usedBy
                          ? "border-gray-200 dark:border-slate-700 opacity-50 cursor-not-allowed"
                          : "border-gray-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                      {isCurrent ? "나" : usedBy ? usedBy.name : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            {colorMsg && (
              <p className={`text-sm mt-3 ${colorMsg.type === "ok" ? "text-green-500 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                {colorMsg.text}
              </p>
            )}
            <div className="mt-4">
              <button
                onClick={() => setShowColorPicker(false)}
                className="w-full text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm py-2.5 rounded-lg border border-gray-300 dark:border-slate-600"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
