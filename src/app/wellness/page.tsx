"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatSleepHours,
  getRecoveryChartData,
  getSleepChartData,
  getWellnessSummary,
} from "@/lib/wellness";
import type { WellnessDay } from "@/types/wellness";

export default function WellnessPage() {
  const [days, setDays] = useState<WellnessDay[]>([]);
  const [rangeDays, setRangeDays] = useState<1 | 7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [firstName, setFirstName] = useState<string>("");

  const fetchWellness = (daysToFetch: 1 | 7 | 30 | 90, refresh = false) => {
    setLoading(true);
    setError(null);

    const url = refresh
      ? `/api/wellness?days=${daysToFetch}&refresh=1`
      : `/api/wellness?days=${daysToFetch}`;

    Promise.all([fetch(url), fetch("/api/me")])
      .then(async ([wellnessRes, meRes]) => {
        if (wellnessRes.status === 401 || meRes.status === 401) {
          setAuthenticated(false);
          setLoading(false);
          return;
        }

        if (!wellnessRes.ok) {
          const data = await wellnessRes.json().catch(() => null);
          throw new Error(data?.error || "Kunne ikke hente wellness-data");
        }

        const wellness = await wellnessRes.json();
        const me = meRes.ok ? await meRes.json() : null;

        setDays(wellness);
        setRangeDays(daysToFetch);
        setAuthenticated(true);
        if (me?.firstName) setFirstName(me.firstName);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchWellness(rangeDays);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [rangeDays]);

  useEffect(() => {
    const handler = () => fetchWellness(rangeDays, true);
    window.addEventListener("trenings:refresh", handler);
    return () => window.removeEventListener("trenings:refresh", handler);
  }, [rangeDays]);

  const summary = useMemo(() => getWellnessSummary(days), [days]);
  const sleepChartData = useMemo(() => getSleepChartData(days), [days]);
  const recoveryChartData = useMemo(() => getRecoveryChartData(days), [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 py-24">
        <p className="text-lg text-muted">Laster wellness-data...</p>
      </div>
    );
  }

  if (authenticated === false) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 px-4 py-24">
        <p className="text-muted">Du må logge inn for å se wellness-data.</p>
        <Link href="/" className="surface-card rounded-lg border px-4 py-2 text-sm font-medium">
          Gå til innlogging
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 px-4 py-24">
        <p className="text-red-500">{error}</p>
        <Link href="/" className="surface-card rounded-lg border px-4 py-2 text-sm font-medium">
          Tilbake til dashboard
        </Link>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">
          {firstName ? `Wellness — ${firstName}` : "Wellness"}
        </h1>
        <p className="text-muted text-sm mt-1">
          HRV, søvn, stress og hvilepuls for {rangeDays === 1 ? "siste døgn" : `siste ${rangeDays} dager`}
        </p>
      </div>

      <div className="surface-muted mb-8 inline-flex gap-1 rounded-xl border p-1">
        {([1, 7, 30, 90] as const).map((option) => (
          <button
            key={option}
            onClick={() => fetchWellness(option)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              rangeDays === option
                ? "surface-card text-foreground shadow"
                : "text-muted hover:opacity-80"
            }`}
          >
            {option === 1 ? "Siste døgn" : `${option} dager`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Søvn per natt</h2>
            <p className="text-muted text-sm">Timer fordelt på lett søvn, dyp søvn og REM.</p>
          </div>
          <div className="flex flex-col sm:grid sm:grid-cols-[200px_1fr] gap-4">
            <div className="surface-card rounded-xl border p-5">
              <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
                Snitt søvn
              </p>
              <p className="text-foreground mt-2 text-3xl font-bold tracking-tight">
                {formatSleepHours(summary.avgSleepSeconds)}
              </p>
              <p className="text-muted text-sm mt-3">
                Basert på {rangeDays === 1 ? "siste døgn" : `de siste ${rangeDays} dagene`} med søvndata.
              </p>
            </div>
            <div className="surface-card rounded-xl border p-5 h-72 sm:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sleepChartData}>
                  <CartesianGrid vertical={false} className="chart-grid" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    className="chart-axis"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    className="chart-axis"
                    tickFormatter={(value) => `${value}t`}
                  />
                  <Tooltip formatter={(value) => `${value} t`} />
                  <Legend />
                  <Bar dataKey="deepHours" name="Dyp søvn" stackId="sleep" fill="#6366f1" />
                  <Bar dataKey="lightHours" name="Lett søvn" stackId="sleep" fill="#60a5fa" />
                  <Bar dataKey="remHours" name="REM" stackId="sleep" fill="#c084fc" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">HRV og hvilepuls</h2>
            <p className="text-muted text-sm">Utvikling i overnight HRV og resting heart rate.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="surface-card rounded-xl border p-5">
              <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
                Snitt HRV
              </p>
              <p className="text-foreground mt-2 text-3xl font-bold tracking-tight">
                {summary.avgHrv ?? "–"}
              </p>
            </div>
            <div className="surface-card rounded-xl border p-5">
              <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
                Snitt hvilepuls
              </p>
              <p className="text-foreground mt-2 text-3xl font-bold tracking-tight">
                {summary.avgRestingHeartRate ?? "–"}
              </p>
            </div>
            <div className="surface-card rounded-xl border p-5">
              <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
                HRV-status
              </p>
              <div className="mt-3">
                {summary.latestHrvStatus ? (
                  <div
                    className={`rounded-lg px-3 py-2 text-xs font-semibold text-center ${
                      summary.latestHrvStatus.toLowerCase() === "balanced"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : summary.latestHrvStatus.toLowerCase() === "unbalanced"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                    }`}
                  >
                    {summary.latestHrvStatus}
                  </div>
                ) : (
                  <span className="text-muted text-sm">Ingen data</span>
                )}
              </div>
            </div>
          </div>
          <div className="surface-card rounded-xl border p-5 h-72 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recoveryChartData}>
                <CartesianGrid vertical={false} className="chart-grid" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="chart-axis"
                />
                <YAxis yAxisId="hrv" tickLine={false} axisLine={false} className="chart-axis" />
                <YAxis
                  yAxisId="rhr"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  className="chart-axis"
                />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="hrv"
                  type="monotone"
                  dataKey="hrv"
                  name="HRV"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="rhr"
                  type="monotone"
                  dataKey="restingHeartRate"
                  name="Hvilepuls"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Sleep score og søvnstress</h2>
          <p className="text-muted text-sm">
            Kvalitetsscore og gjennomsnittlig stress i søvnperioden.
          </p>
        </div>
        <div className="flex flex-col sm:grid sm:grid-cols-[200px_1fr] gap-4">
          <div className="surface-card rounded-xl border p-5">
            <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
              Snitt sleep score
            </p>
            <p className="text-foreground mt-2 text-3xl font-bold tracking-tight">
              {summary.avgSleepScore ?? "–"}
            </p>
            <p className="text-muted text-sm mt-3">
              Basert på {rangeDays === 1 ? "siste døgn" : `de siste ${rangeDays} dagene`} med score-data.
            </p>
          </div>
          <div className="surface-card rounded-xl border p-5 h-72 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recoveryChartData}>
                <CartesianGrid vertical={false} className="chart-grid" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="chart-axis"
                />
                <YAxis tickLine={false} axisLine={false} className="chart-axis" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sleepScore"
                  name="Sleep score"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="stress"
                  name="Søvnstress"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </main>
  );
}
