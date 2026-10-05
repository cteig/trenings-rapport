"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Competition } from "@/types/strava";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function countdownLabel(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days > 1) return `om ${days} dager`;
  if (days === 1) return "i morgen";
  if (days === 0) return "i dag";
  if (days === -1) return "i går";
  return `${Math.abs(days)} dager siden`;
}

export default function KonkurranserPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState("");

  const isPast = date !== "" && daysUntil(date) < 0;

  const fetchCompetitions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/competitions");
    if (res.status === 401) {
      setAuthenticated(false);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError("Kunne ikke hente konkurranser");
      setLoading(false);
      return;
    }
    const data: Competition[] = await res.json();
    setCompetitions(data);
    setAuthenticated(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchCompetitions();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchCompetitions]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;
    setSaving(true);
    const res = await fetch("/api/competitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, date, goal: goal || null, result: result || null }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Kunne ikke lagre konkurransen");
      return;
    }
    setName("");
    setDate("");
    setGoal("");
    setResult("");
    fetchCompetitions();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/competitions/${id}`, { method: "DELETE" });
    setCompetitions((prev) => prev.filter((c) => c.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 py-24">
        <p className="text-lg text-muted">Laster...</p>
      </div>
    );
  }

  if (authenticated === false) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 py-24">
        <p className="text-muted">Du må være logget inn for å se konkurranser.</p>
        <Link href="/" className="text-sm underline">
          Til innlogging
        </Link>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = competitions.filter((c) => new Date(c.date) >= today);
  const past = competitions.filter((c) => new Date(c.date) < today).reverse();

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Viktige konkurranser</h1>

      <form onSubmit={handleAdd} className="surface-card rounded-xl border p-5 mb-8 flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Legg til viktig konkurranse</h2>
        <div className="flex flex-col gap-1">
          <label className="text-muted text-xs font-medium">Navn</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="F.eks. Hovedløpet 2027"
            className="surface-card rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted text-xs font-medium">Dato</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="surface-card rounded-lg border px-3 py-2 text-sm text-foreground"
            required
          />
        </div>
        {isPast ? (
          <div className="flex flex-col gap-1">
            <label className="text-muted text-xs font-medium">Resultat (valgfritt)</label>
            <input
              type="text"
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="F.eks. 4. plass H17-18 lang"
              className="surface-card rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-muted text-xs font-medium">Mål (valgfritt)</label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="F.eks. topp 10 i H17-18 lang"
              className="surface-card rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-muted"
            />
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="self-start px-5 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Lagrer..." : "Legg til"}
        </button>
      </form>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Kommende</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted text-sm">Ingen kommende viktige konkurranser lagt inn ennå.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming.map((c) => (
              <li
                key={c.id}
                className="surface-card rounded-xl border p-4 flex items-start justify-between gap-4"
              >
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-muted text-sm">
                    {formatDate(c.date)} · <span className="text-emerald-600 font-medium">{countdownLabel(c.date)}</span>
                  </p>
                  {c.goal && <p className="text-sm mt-1">🎯 {c.goal}</p>}
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-muted hover:text-red-500 text-sm shrink-0"
                  aria-label="Slett"
                >
                  Slett
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Tidligere</h2>
          <ul className="flex flex-col gap-2">
            {past.map((c) => (
              <li
                key={c.id}
                className="surface-card rounded-xl border p-4 flex items-start justify-between gap-4 opacity-80"
              >
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-muted text-sm">{formatDate(c.date)}</p>
                  {c.result && <p className="text-sm mt-1">🏅 {c.result}</p>}
                  {c.goal && !c.result && <p className="text-sm mt-1">🎯 {c.goal}</p>}
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-muted hover:text-red-500 text-sm shrink-0"
                  aria-label="Slett"
                >
                  Slett
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
