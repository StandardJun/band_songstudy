"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface MemberInfo {
  id: string;
  name: string;
  color: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberInfo | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already logged in
    fetch("/api/auth/me")
      .then((r) => {
        if (r.ok) router.replace("/");
      })
      .catch(() => {});

    // Fetch members list (names only, no auth needed — we expose this via a simple endpoint)
    fetch("/api/members")
      .then((r) => r.json())
      .then((data) => setMembers(data.members || []))
      .catch(() => {});
  }, [router]);

  async function handleLogin() {
    if (!selectedMember || !pin) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedMember.name, pin }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "로그인 실패");
        return;
      }

      router.replace("/");
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-100 text-center mb-8">
          Song Study
        </h1>

        {!selectedMember ? (
          <div className="space-y-3">
            <p className="text-slate-400 text-center text-sm mb-4">
              멤버를 선택하세요
            </p>
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMember(m)}
                className="w-full py-3 px-4 rounded-lg text-white font-medium text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: m.color }}
              >
                {m.name}
              </button>
            ))}
            {members.length === 0 && (
              <p className="text-slate-500 text-center text-sm">
                멤버 목록을 불러오는 중...
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => {
                setSelectedMember(null);
                setPin("");
                setError("");
              }}
              className="text-slate-400 hover:text-slate-200 text-sm py-2 pr-2"
            >
              &larr; 뒤로
            </button>

            <div className="text-center">
              <div
                className="inline-block w-16 h-16 rounded-full mb-3"
                style={{ backgroundColor: selectedMember.color }}
              />
              <p className="text-xl font-bold text-slate-100">
                {selectedMember.name}
              </p>
            </div>

            <div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="PIN 입력 (4자리)"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full bg-slate-800 text-slate-100 text-center text-2xl tracking-[0.5em] py-3 px-4 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none placeholder:text-sm placeholder:tracking-normal"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              onClick={handleLogin}
              disabled={loading || pin.length < 4}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
