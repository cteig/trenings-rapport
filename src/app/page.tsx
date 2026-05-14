"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  LineChart,
  Line,
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
  getIntensityPercentageByPeriod,
  getTrainingEffectOverTime,
  getVO2MaxOverTime,
  getTrainingLoadByWeek,
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
  const [hiddenActivityTypes, setHiddenActivityTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>("");
  const [threshold, setThreshold] = useState<{
    lactateThresholdHR?: number;
    lactateThresholdPace?: string;
    vo2MaxRunning?: number;
    vo2MaxCycling?: number;
  } | null>(null);

  const normalizeDisplayType = (type: string) => {
    if (type === "Run") {
      return "Løping";
    }
    if (type === "cross_country_skiing" || type === "NordicSki" || type === "Ski") {
      return "Ski";
    }
    return type;
  };

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

    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.firstName) setFirstName(d.firstName);
      });

    fetch("/api/threshold")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setThreshold(d);
      });
  }, []);

  useEffect(() => {
    const handler = () => { void fetchActivities(true); };
    window.addEventListener("trenings:refresh", handler);
    return () => window.removeEventListener("trenings:refresh", handler);
  }, [fetchActivities]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchActivities();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchActivities]);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 py-24">
        <p className="text-lg text-muted">Laster...</p>
      </div>
    );
  }

  if (authenticated === false) {
    return <LoginForm onSuccess={() => fetchActivities()} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 py-24">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => fetchActivities()}
          className="surface-card rounded-lg border px-4 py-2 text-sm font-medium"
        >
          Prøv igjen
        </button>
      </div>
    );
  }

  const availableYears = Array.from(
    new Set(activities.map((a) => new Date(a.start_date_local).getFullYear()))
  ).sort((a, b) => b - a);
  const yearRangeLabel =
    availableYears.length > 0
      ? `${availableYears[availableYears.length - 1]}-${availableYears[0]}`
      : "År";

  const selectedYearActivities = activities.filter(
    (a) => new Date(a.start_date_local).getFullYear() === selectedYear
  );
  const selectedYearRunActivities = selectedYearActivities.filter(
    (activity) => normalizeDisplayType(activity.type) === "Løping"
  );

  const graphActivities = (period === "year" ? activities : selectedYearActivities).map(
    (activity) => ({
      ...activity,
      type: normalizeDisplayType(activity.type),
    })
  );

  const summaries = groupActivitiesByPeriod(graphActivities, period);
  const intensity = calculateIntensityFromActivities(graphActivities);
  const typeDistribution = getActivityTypeDistribution(graphActivities);
  const intensityByPeriod = getIntensityPercentageByPeriod(graphActivities, period);
  const periodsWithoutHrData = intensityByPeriod
    .filter((item) => item.zone1 + item.zone2 + item.zone3 + item.zone4 + item.zone5 === 0)
    .map((item) => item.period);
  const trainingEffect = getTrainingEffectOverTime(graphActivities);
  const vo2max = getVO2MaxOverTime(graphActivities, period);
  const trainingLoad = getTrainingLoadByWeek(graphActivities);

  const allActivityTypes = Array.from(
    new Set(summaries.flatMap((s) => Object.keys(s.byType)))
  ).sort();
  const visibleActivityTypes = allActivityTypes.filter(
    (type) => !hiddenActivityTypes.includes(type)
  );

  const ACTIVITY_COLORS: Record<string, string> = {
    Løping: "#f97316",
    Ride: "#3b82f6",
    Sykkel: "#3b82f6",
    Swim: "#06b6d4",
    Walk: "#10b981",
    Hike: "#84cc16",
    Walking: "#10b981",
    WeightTraining: "#8b5cf6",
    Styrke: "#8b5cf6",
    Yoga: "#ec4899",
    Workout: "#eab308",
    NordicSki: "#0ea5e9",
    Ski: "#0ea5e9",
    AlpineSki: "#6366f1",
    RockClimbing: "#f43f5e",
    Klatring: "#f43f5e",
    VirtualRide: "#2563eb",
    VirtualRun: "#ea580c",
    Roing: "#14b8a6",
    Pusteøvelse: "#6b7280",
  };

  const getGeneratedColorForType = (type: string) => {
    let hash = 0;
    for (let i = 0; i < type.length; i += 1) {
      hash = type.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 65% 52%)`;
  };

  const getColorForType = (type: string) => ACTIVITY_COLORS[type] || getGeneratedColorForType(type);

  const volumeData = summaries.map((s) => {
    const row: Record<string, string | number> = { name: s.period };
    for (const type of visibleActivityTypes) {
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">
          {firstName ? `Treningsrapport — ${firstName}` : "Treningsrapport"}
        </h1>
        <a href="/api/auth/logout" className="text-sm text-muted hover:opacity-80">
          Logg ut
        </a>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="surface-card h-10 min-w-[96px] rounded-lg border px-3 text-sm font-semibold shadow-sm"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <div className="surface-muted flex h-10 items-center gap-1 rounded-lg border p-1 shadow-sm">
          {(["week", "month"] as Array<"week" | "month">).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`h-8 rounded-md px-3 text-sm font-medium transition-colors ${
                period === p ? "surface-card shadow" : "text-muted hover:opacity-80"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setPeriod("year")}
          className={`h-10 rounded-lg border px-4 text-sm font-semibold shadow-sm transition-colors ${
            period === "year"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "surface-card text-muted hover:opacity-80"
          }`}
        >
          {yearRangeLabel}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="surface-card rounded-xl border p-5">
          <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
            Aktiviteter i {selectedYear}
          </p>
          <p className="text-foreground mt-2 text-3xl font-bold tracking-tight">
            {selectedYearActivities.length}
          </p>
        </div>
        <div className="surface-card rounded-xl border p-5">
          <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
            Total varighet i {selectedYear}
          </p>
          <p className="text-foreground mt-2 text-3xl font-bold tracking-tight">
            {Math.round(selectedYearActivities.reduce((sum, a) => sum + a.moving_time / 3600, 0))}{" "}
            timer
          </p>
        </div>
        <div className="surface-card rounded-xl border p-5">
          <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
            Total distanse i {selectedYear}
          </p>
          <p className="text-foreground mt-2 text-3xl font-bold tracking-tight">
            {Math.round(selectedYearActivities.reduce((sum, a) => sum + a.distance / 1000, 0))} km
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="surface-card rounded-xl border p-5">
          <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
            Løpeaktiviteter i {selectedYear}
          </p>
          <p className="text-foreground mt-2 text-3xl font-bold tracking-tight">
            {selectedYearRunActivities.length}
          </p>
        </div>
        <div className="surface-card rounded-xl border p-5">
          <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
            Løpetimer i {selectedYear}
          </p>
          <p className="text-foreground mt-2 text-3xl font-bold tracking-tight">
            {Math.round(
              selectedYearRunActivities.reduce(
                (sum, activity) => sum + activity.moving_time / 3600,
                0
              )
            )}{" "}
            timer
          </p>
        </div>
        <div className="surface-card rounded-xl border p-5">
          <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
            Løpedistanse i {selectedYear}
          </p>
          <p className="text-foreground mt-2 text-3xl font-bold tracking-tight">
            {Math.round(
              selectedYearRunActivities.reduce((sum, activity) => sum + activity.distance / 1000, 0)
            )}{" "}
            km
          </p>
        </div>
      </div>

      {threshold && (
        <div className="grid grid-flow-col auto-cols-fr gap-4 mb-8">
          {threshold.lactateThresholdHR && (
            <div className="surface-card rounded-xl border p-5">
              <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
                Terskel-puls
              </p>
              <p className="text-foreground mt-2 text-3xl font-bold tracking-tight">
                {threshold.lactateThresholdHR}{" "}
                <span className="text-muted text-sm font-medium">bpm</span>
              </p>
            </div>
          )}
          {threshold.lactateThresholdPace && (
            <div className="surface-card rounded-xl border p-5">
              <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
                Terskeltempo
              </p>
              <p className="text-foreground mt-2 text-3xl font-bold tracking-tight">
                {threshold.lactateThresholdPace}{" "}
                <span className="text-muted text-sm font-medium">/km</span>
              </p>
            </div>
          )}
          {threshold.vo2MaxRunning && (
            <div className="surface-card rounded-xl border p-5">
              <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
                VO2max løping
              </p>
              <p className="text-foreground mt-2 text-3xl font-bold tracking-tight">
                {threshold.vo2MaxRunning}{" "}
                <span className="text-muted text-sm font-medium">ml/kg/min</span>
              </p>
            </div>
          )}
          {threshold.vo2MaxCycling && (
            <div className="surface-card rounded-xl border p-5">
              <p className="text-muted text-xs font-semibold uppercase tracking-[0.12em]">
                VO2max sykling
              </p>
              <p className="text-foreground mt-2 text-3xl font-bold tracking-tight">
                {threshold.vo2MaxCycling}{" "}
                <span className="text-muted text-sm font-medium">ml/kg/min</span>
              </p>
            </div>
          )}
        </div>
      )}

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Treningsvolum per {PERIOD_LABELS[period].toLowerCase()}
            {period !== "year" && (
              <span className="text-muted text-sm font-normal ml-2">{selectedYear}</span>
            )}
          </h2>
          <div className="surface-muted flex gap-1 rounded-lg border p-1">
            <button
              onClick={() => setVolumeMetric("timer")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                volumeMetric === "timer"
                  ? "surface-card shadow text-foreground"
                  : "text-muted hover:opacity-80"
              }`}
            >
              Timer
            </button>
            <button
              onClick={() => setVolumeMetric("distanse")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                volumeMetric === "distanse"
                  ? "surface-card shadow text-foreground"
                  : "text-muted hover:opacity-80"
              }`}
            >
              Distanse
            </button>
          </div>
        </div>
        <div className="surface-card rounded-xl border p-5 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData}>
              <CartesianGrid vertical={false} className="chart-grid" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="chart-axis"
                interval={0}
                tickFormatter={(value: string) => {
                  if (period === "year") return value;
                  if (period === "month") return value.split(" ")[0].slice(0, 3);
                  // "Uke 23, 2025" → "23"
                  return value.split(" ")[1]?.replace(",", "") ?? value;
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                className="chart-axis"
                tickFormatter={
                  volumeMetric === "timer" ? (v) => `${Math.floor(v)}t` : (v) => `${v} km`
                }
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload) return null;
                  const items = payload.filter((p) => Number(p.value) > 0);
                  if (items.length === 0) return null;
                  return (
                    <div className="surface-tooltip rounded-lg p-2 text-sm">
                      <p className="text-foreground font-medium mb-1">{label}</p>
                      {items.map((item) => {
                        const v = Number(item.value);
                        const formatted =
                          volumeMetric === "timer"
                            ? `${Math.floor(v)}t ${Math.round((v - Math.floor(v)) * 60)}m`
                            : `${v.toFixed(1)} km`;
                        return (
                          <p key={String(item.dataKey)} style={{ color: item.color }}>
                            {String(item.dataKey)}: {formatted}
                          </p>
                        );
                      })}
                    </div>
                  );
                }}
              />
              <Legend />
              {allActivityTypes.map((type) =>
                visibleActivityTypes.includes(type) ? (
                  <Bar key={type} dataKey={type} stackId="a" fill={getColorForType(type)} />
                ) : null
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {allActivityTypes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {allActivityTypes.map((type) => {
              const hidden = hiddenActivityTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() =>
                    setHiddenActivityTypes((current) =>
                      current.includes(type)
                        ? current.filter((item) => item !== type)
                        : [...current, type]
                    )
                  }
                  className={`px-3 py-1 rounded-full border text-sm ${
                    hidden ? "surface-card text-muted" : "text-white border-transparent"
                  }`}
                  style={hidden ? undefined : { backgroundColor: getColorForType(type) }}
                >
                  {hidden ? `Vis ${type}` : `Skjul ${type}`}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            Intensitetsfordeling per {PERIOD_LABELS[period].toLowerCase()}
          </h2>
          <p className="text-muted text-sm">
            Viser hvor stor andel av tiden i hver {PERIOD_LABELS[period].toLowerCase()} som ble
            tilbrakt i sone 1–5.
          </p>
          {periodsWithoutHrData.length > 0 && (
            <p className="text-sm text-amber-700 mt-2">
              Mangler HR-data for: {periodsWithoutHrData.join(", ")}. Disse vises derfor med 0% i
              alle soner.
            </p>
          )}
        </div>
        <div className="surface-card rounded-xl border p-5 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={intensityByPeriod}>
              <CartesianGrid vertical={false} className="chart-grid" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="chart-axis"
                interval={0}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tickLine={false}
                axisLine={false}
                className="chart-axis"
              />
              <Tooltip
                formatter={(value, name) => [`${value}%`, String(name)]}
                labelFormatter={(label) => String(label)}
              />
              <Legend />
              <Bar dataKey="zone1" name="Sone 1: <60%" stackId="zones" fill="#60a5fa" />
              <Bar dataKey="zone2" name="Sone 2: 60–70%" stackId="zones" fill="#34d399" />
              <Bar dataKey="zone3" name="Sone 3: 70–80%" stackId="zones" fill="#facc15" />
              <Bar dataKey="zone4" name="Sone 4: 80–90%" stackId="zones" fill="#fb923c" />
              <Bar dataKey="zone5" name="Sone 5: >90%" stackId="zones" fill="#f87171" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Intensitetsfordeling (pulssoner)</h2>
            <p className="text-muted text-sm">
              Garmin leverer tid brukt i sone, men ikke de faktiske pulsgrensene per sone via denne
              integrasjonen. Derfor vises sonene som generelle nivåer, ikke eksakte bpm-intervaller.
            </p>
          </div>
          <div className="surface-card rounded-xl border p-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intensity} layout="vertical">
                <CartesianGrid horizontal={false} className="chart-grid" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${v} min`}
                  tickLine={false}
                  axisLine={false}
                  className="chart-axis"
                />
                <YAxis
                  dataKey="zone"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={120}
                  tickLine={false}
                  axisLine={false}
                  className="chart-axis"
                />
                <Tooltip formatter={(value) => `${value} min`} />
                <Bar dataKey="minutes" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Fordeling per type</h2>
            <div className="surface-muted flex gap-1 rounded-lg border p-1">
              <button
                onClick={() => setTypeMetric("timer")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  typeMetric === "timer"
                    ? "surface-card shadow text-foreground"
                    : "text-muted hover:opacity-80"
                }`}
              >
                Timer
              </button>
              <button
                onClick={() => setTypeMetric("distanse")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  typeMetric === "distanse"
                    ? "surface-card shadow text-foreground"
                    : "text-muted hover:opacity-80"
                }`}
              >
                Distanse
              </button>
            </div>
          </div>
          <div className="surface-card rounded-xl border p-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeDistribution} layout="vertical">
                {typeMetric === "timer" ? (
                  <>
                    <CartesianGrid horizontal={false} className="chart-grid" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `${Math.floor(v / 60)}t`}
                      tickLine={false}
                      axisLine={false}
                      className="chart-axis"
                    />
                    <YAxis
                      dataKey="type"
                      type="category"
                      tick={{ fontSize: 12 }}
                      width={100}
                      tickLine={false}
                      axisLine={false}
                      className="chart-axis"
                    />
                    <Tooltip
                      formatter={(value) => {
                        const v = Number(value);
                        const h = Math.floor(v / 60);
                        const m = Math.round(v % 60);
                        return `${h}t ${m}m`;
                      }}
                    />
                    <Bar dataKey="minutes" fill="#f97316" />
                  </>
                ) : (
                  <>
                    <CartesianGrid horizontal={false} className="chart-grid" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `${v} km`}
                      tickLine={false}
                      axisLine={false}
                      className="chart-axis"
                    />
                    <YAxis
                      dataKey="type"
                      type="category"
                      tick={{ fontSize: 12 }}
                      width={100}
                      tickLine={false}
                      axisLine={false}
                      className="chart-axis"
                    />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(1)} km`} />
                    <Bar dataKey="km" fill="#3b82f6" />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {trainingEffect.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Treningseffekt (aerob vs anaerob)</h2>
          <div className="surface-card rounded-xl border p-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trainingEffect}>
                <CartesianGrid vertical={false} className="chart-grid" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  className="chart-axis"
                  interval={0}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tickLine={false}
                  axisLine={false}
                  className="chart-axis"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0]?.payload;
                    return (
                      <div className="surface-tooltip rounded-lg p-2 text-sm">
                        <p className="text-foreground font-medium">{item?.name || label}</p>
                        <p style={{ color: "#10b981" }}>Aerob: {item?.aerobic}%</p>
                        <p style={{ color: "#f97316" }}>Anaerob: {item?.anaerobic}%</p>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Bar dataKey="aerobic" name="Aerob" stackId="a" fill="#10b981" />
                <Bar dataKey="anaerobic" name="Anaerob" stackId="a" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-8 mb-8">
        {vo2max.length > 1 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">VO2max-utvikling</h2>
            <div className="surface-card rounded-xl border p-5 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vo2max}>
                  <CartesianGrid vertical={false} className="chart-grid" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    className="chart-axis"
                    interval={0}
                  />
                  <YAxis
                    domain={["dataMin - 1", "dataMax + 1"]}
                    tickLine={false}
                    axisLine={false}
                    className="chart-axis"
                  />
                  <Tooltip formatter={(value) => `${value} ml/kg/min`} />
                  <Line
                    type="monotone"
                    dataKey="vo2max"
                    name="VO2max"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>

      {trainingLoad.length > 0 && (
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Treningsbelastning per uke</h2>
            <p className="text-muted text-sm">
              Basert på EPOC — kombinerer varighet og intensitet (puls) for å estimere hvor mye
              kroppen må restituere etter hver økt.
            </p>
          </div>
          <div className="surface-card rounded-xl border p-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trainingLoad}>
                <CartesianGrid vertical={false} className="chart-grid" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="chart-axis"
                />
                <YAxis tickLine={false} axisLine={false} className="chart-axis" />
                <Tooltip formatter={(value) => `${value}`} />
                <Bar dataKey="load" name="Belastning" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </main>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setLoginError(data.error || "Innlogging feilet");
      } catch {
        setLoginError("Innlogging feilet — sjekk e-post og passord");
      }
      setLoggingIn(false);
      return;
    }

    onSuccess();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <h1 className="text-2xl font-bold">Treningsrapport</h1>
      <p className="text-muted">Logg inn med Garmin Connect</p>
      <form
        onSubmit={handleSubmit}
        className="surface-card w-80 rounded-2xl border p-5 flex flex-col gap-3"
      >
        <input
          type="email"
          placeholder="E-post"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="surface-card rounded-lg border px-4 py-2 text-foreground placeholder:text-muted"
          required
        />
        <input
          type="password"
          placeholder="Passord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="surface-card rounded-lg border px-4 py-2 text-foreground placeholder:text-muted"
          required
        />
        {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
        <button
          type="submit"
          disabled={loggingIn}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loggingIn ? "Logger inn..." : "Logg inn"}
        </button>
      </form>
    </div>
  );
}
