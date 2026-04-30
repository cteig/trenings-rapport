"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { StravaActivity } from "@/types/strava";
import {
  groupActivitiesByPeriod,
  calculateIntensityFromActivities,
  getActivityTypeDistribution,
} from "@/lib/data";

const PERIOD_LABELS: Record<"week" | "month" | "year", string> = {
  week: "Uke",
  month: "Måned",
  year: "År",
};

export default function Dashboard() {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [volumeMetric, setVolumeMetric] = useState<"timer" | "distanse">("timer");
  const [typeMetric, setTypeMetric] = useState<"timer" | "distanse">("timer");
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>("");

  const fetchActivities = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);

    const url = refresh ? "/api/activities?refresh=1" : "/api/activities";
    const res = await fetch(url);
    if (res.status === 401) {
      setAuthenticated(false);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Kunne ikke hente aktiviteter");
      setLoading(false);
      return;
    }
    const data: StravaActivity[] = await res.json();
    setActivities(data);
    setAuthenticated(true);
    setLoading(false);

    fetch("/api/me").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.firstName) setFirstName(d.firstName);
    });
  }, []);

  const forceRefresh = useCallback(() => {
    fetchActivities(true);
  }, [fetchActivities]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-500">Laster...</p>
      </div>
    );
  }

  if (authenticated === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Treningsrapport</h1>
        <p className="text-gray-600">Koble til Strava for å se dine treningsdata</p>
        <a
          href="/api/auth/strava"
          className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
        >
          Koble til Strava
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">{error}</p>
        <button onClick={() => fetchActivities()} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
          Prøv igjen
        </button>
      </div>
    );
  }

  const availableYears = Array.from(
    new Set(activities.map((a) => new Date(a.start_date_local).getFullYear()))
  ).sort((a, b) => b - a);

  const filteredActivities = period === "year"
    ? activities
    : activities.filter(
        (a) => new Date(a.start_date_local).getFullYear() === selectedYear
      );

  const summaries = groupActivitiesByPeriod(filteredActivities, period);
  const intensity = calculateIntensityFromActivities(filteredActivities);
  const typeDistribution = getActivityTypeDistribution(filteredActivities);

  const allActivityTypes = Array.from(
    new Set(summaries.flatMap((s) => Object.keys(s.byType)))
  ).sort();

  const ACTIVITY_COLORS: Record<string, string> = {
    Run: "#f97316",
    Ride: "#3b82f6",
    Swim: "#06b6d4",
    Walk: "#10b981",
    Hike: "#84cc16",
    WeightTraining: "#8b5cf6",
    Yoga: "#ec4899",
    Workout: "#eab308",
    NordicSki: "#0ea5e9",
    AlpineSki: "#6366f1",
    RockClimbing: "#f43f5e",
    VirtualRide: "#2563eb",
    VirtualRun: "#ea580c",
  };
  const DEFAULT_COLORS = ["#64748b", "#a855f7", "#14b8a6", "#f59e0b", "#ef4444", "#6b7280"];

  const getColorForType = (type: string, index: number) =>
    ACTIVITY_COLORS[type] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];

  const volumeData = summaries.map((s) => {
    const row: Record<string, string | number> = { name: s.period };
    for (const type of allActivityTypes) {
      const data = s.byType[type];
      if (volumeMetric === "timer") {
        row[type] = data ? +(data.duration / 60).toFixed(2) : 0;
      } else {
        row[type] = data ? +data.distance.toFixed(1) : 0;
      }
    }
    return row;
  });

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">
          {firstName ? `Treningsrapport — ${firstName}` : "Treningsrapport"}
        </h1>
        <div className="flex items-center gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border rounded-lg px-3 py-1.5 text-sm font-medium bg-white"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(Object.keys(PERIOD_LABELS) as Array<"week" | "month" | "year">).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  period === p
                    ? "bg-white shadow text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <button
            onClick={forceRefresh}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Oppdater data
          </button>
          <a href="/api/auth/logout" className="text-sm text-gray-500 hover:text-gray-700">
            Logg ut
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Aktiviteter i {selectedYear}</p>
          <p className="text-2xl font-bold">{filteredActivities.length}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total varighet</p>
          <p className="text-2xl font-bold">
            {Math.round(filteredActivities.reduce((sum, a) => sum + a.moving_time / 3600, 0))} timer
          </p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total distanse</p>
          <p className="text-2xl font-bold">
            {Math.round(filteredActivities.reduce((sum, a) => sum + a.distance / 1000, 0))} km
          </p>
        </div>
      </div>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Treningsvolum per {PERIOD_LABELS[period].toLowerCase()}</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setVolumeMetric("timer")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                volumeMetric === "timer" ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Timer
            </button>
            <button
              onClick={() => setVolumeMetric("distanse")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                volumeMetric === "distanse" ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Distanse
            </button>
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={volumeMetric === "timer" ? (v) => `${Math.floor(v)}t` : (v) => `${v} km`} />
              <Tooltip formatter={(value, name) => {
                const v = Number(value);
                if (volumeMetric === "timer") {
                  const h = Math.floor(v);
                  const m = Math.round((v - h) * 60);
                  return [`${h}t ${m}m`, name];
                }
                return [`${v.toFixed(1)} km`, name];
              }} />
              <Legend />
              {allActivityTypes.map((type, i) => (
                <Bar key={type} dataKey={type} stackId="a" fill={getColorForType(type, i)} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Fordeling per type</h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTypeMetric("timer")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  typeMetric === "timer" ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Timer
              </button>
              <button
                onClick={() => setTypeMetric("distanse")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  typeMetric === "distanse" ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Distanse
              </button>
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeDistribution} layout="vertical">
                {typeMetric === "timer" ? (
                  <>
                    <XAxis type="number" tickFormatter={(v) => `${Math.floor(v / 60)}t`} />
                    <YAxis dataKey="type" type="category" tick={{ fontSize: 12 }} width={100} />
                    <Tooltip formatter={(value) => {
                      const v = Number(value);
                      const h = Math.floor(v / 60);
                      const m = Math.round(v % 60);
                      return `${h}t ${m}m`;
                    }} />
                    <Bar dataKey="minutes" fill="#f97316" />
                  </>
                ) : (
                  <>
                    <XAxis type="number" tickFormatter={(v) => `${v} km`} />
                    <YAxis dataKey="type" type="category" tick={{ fontSize: 12 }} width={100} />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(1)} km`} />
                    <Bar dataKey="km" fill="#3b82f6" />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Intensitetsfordeling</h2>
          <div className="bg-white border rounded-lg p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intensity} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="zone" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(value) => `${value} min`} />
                <Bar dataKey="minutes" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </main>
  );
}
