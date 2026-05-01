"use client";

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
  WellnessDay,
  formatSleepHours,
  getRecoveryChartData,
  getSleepChartData,
  getWellnessSummary,
} from "@/lib/wellness";

export default function WellnessPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [days, setDays] = useState<WellnessDay[]>([]);
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [firstName, setFirstName] = useState<string>("");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("theme");
    const initialTheme = storedTheme === "dark" ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const fetchWellness = (daysToFetch: 7 | 30 | 90, refresh = false) => {
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
    fetchWellness(rangeDays);
  }, []);

  const summary = useMemo(() => getWellnessSummary(days), [days]);
  const sleepChartData = useMemo(() => getSleepChartData(days), [days]);
  const recoveryChartData = useMemo(() => getRecoveryChartData(days), [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted">Laster wellness-data...</p>
      </div>
    );
  }

  if (authenticated === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <p className="text-muted">Du må logge inn for å se wellness-data.</p>
        <a href="/" className="surface-card rounded-lg border px-4 py-2 text-sm font-medium">
          Gå til innlogging
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <p className="text-red-500">{error}</p>
        <a href="/" className="surface-card rounded-lg border px-4 py-2 text-sm font-medium">
          Tilbake til dashboard
        </a>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">
            {firstName ? `Wellness — ${firstName}` : "Wellness"}
          </h1>
          <p className="text-muted text-sm mt-1">
            HRV, søvn, stress og hvilepuls for siste 30 dager
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
            className="text-sm text-muted hover:opacity-80"
          >
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
          <button
            onClick={() => fetchWellness(rangeDays, true)}
            className="text-sm text-muted hover:opacity-80"
          >
            Oppdater data
          </button>
          <a href="/" className="text-sm text-muted hover:opacity-80">
            Til dashboard
          </a>
        </div>
      </div>

      <div className="surface-muted mb-8 inline-flex gap-1 rounded-xl border p-1">
        {([7, 30, 90] as const).map((option) => (
          <button
            key={option}
            onClick={() => fetchWellness(option)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              rangeDays === option
                ? "surface-card text-foreground shadow"
                : "text-muted hover:opacity-80"
            }`}
          >
            {option} dager
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Søvn per natt</h2>
            <p className="text-muted text-sm">Timer fordelt på lett søvn, dyp søvn og REM.</p>
          </div>
          <div className="grid grid-cols-[220px_1fr] gap-4">
            <div className="surface-card rounded-xl border p-5">
              <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
                Snitt søvn
              </p>
              <p className="text-foreground mt-2 text-3xl font-bold tracking-tight">
                {formatSleepHours(summary.avgSleepSeconds)}
              </p>
              <p className="text-muted text-sm mt-3">
                Basert på de siste {rangeDays} dagene med søvndata.
              </p>
            </div>
            <div className="surface-card rounded-xl border p-5 h-96">
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
          <div className="grid grid-cols-3 gap-4 mb-4">
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
              <p className="text-foreground mt-2 text-2xl font-bold tracking-tight">
                {summary.latestHrvStatus || "Ingen data"}
              </p>
            </div>
          </div>
          <div className="surface-card rounded-xl border p-5 h-96">
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

      <div className="grid grid-cols-2 gap-8">
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Sleep score og søvnstress</h2>
            <p className="text-muted text-sm">
              Kvalitetsscore og gjennomsnittlig stress i søvnperioden.
            </p>
          </div>
          <div className="surface-card rounded-xl border p-5 h-96">
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
        </section>
        <section>
          <div className="surface-card rounded-xl border p-5 h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
                HRV-status
              </p>
              <p className="text-foreground mt-3 text-4xl font-bold tracking-tight">
                {summary.latestHrvStatus || "Ingen data"}
              </p>
              <p className="text-muted text-sm mt-4">
                Garmin rapporterer HRV-status som del av søvndataene, så dette oppdateres bare når
                det finnes overnight-målinger.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
