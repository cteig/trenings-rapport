"use client";

import { useState, useEffect, useCallback } from "react";
import { StravaActivity } from "@/types/strava";

const PAGE_SIZE = 20;

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}t ${m}min`;
  return `${m}min`;
}

function formatZoneDuration(seconds: number | undefined): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPace(metersPerSecond: number): string {
  if (!metersPerSecond || metersPerSecond === 0) return "—";
  const minPerKm = 1000 / metersPerSecond / 60;
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
}

function formatDistance(meters: number): string {
  if (!meters) return "—";
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ActivityDetails({ activity }: { activity: StravaActivity }) {
  const hasZones =
    activity.hr_time_in_zone_1 ||
    activity.hr_time_in_zone_2 ||
    activity.hr_time_in_zone_3 ||
    activity.hr_time_in_zone_4 ||
    activity.hr_time_in_zone_5;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-3 py-3 px-4 text-sm">
      <div>
        <span className="text-muted">Distanse</span>
        <p className="font-medium tabular-nums">{formatDistance(activity.distance)}</p>
      </div>
      <div>
        <span className="text-muted">Varighet (bevegelse)</span>
        <p className="font-medium tabular-nums">{formatDuration(activity.moving_time)}</p>
      </div>
      <div>
        <span className="text-muted">Varighet (total)</span>
        <p className="font-medium tabular-nums">{formatDuration(activity.elapsed_time)}</p>
      </div>
      <div>
        <span className="text-muted">Høydemeter opp</span>
        <p className="font-medium tabular-nums">
          {activity.total_elevation_gain ? `${Math.round(activity.total_elevation_gain)} m` : "—"}
        </p>
      </div>
      {activity.elevation_loss != null && (
        <div>
          <span className="text-muted">Høydemeter ned</span>
          <p className="font-medium tabular-nums">{Math.round(activity.elevation_loss)} m</p>
        </div>
      )}
      <div>
        <span className="text-muted">Snittempo</span>
        <p className="font-medium tabular-nums">{formatPace(activity.average_speed)}</p>
      </div>
      <div>
        <span className="text-muted">Maksfart</span>
        <p className="font-medium tabular-nums">{formatPace(activity.max_speed)}</p>
      </div>
      {activity.average_heartrate && (
        <div>
          <span className="text-muted">Snitt HR</span>
          <p className="font-medium tabular-nums">{Math.round(activity.average_heartrate)} bpm</p>
        </div>
      )}
      {activity.max_heartrate && (
        <div>
          <span className="text-muted">Maks HR</span>
          <p className="font-medium tabular-nums">{Math.round(activity.max_heartrate)} bpm</p>
        </div>
      )}
      {activity.aerobic_training_effect != null && (
        <div>
          <span className="text-muted">Aerob treningseffekt</span>
          <p className="font-medium tabular-nums">{activity.aerobic_training_effect.toFixed(1)}</p>
        </div>
      )}
      {activity.anaerobic_training_effect != null && (
        <div>
          <span className="text-muted">Anaerob treningseffekt</span>
          <p className="font-medium tabular-nums">
            {activity.anaerobic_training_effect.toFixed(1)}
          </p>
        </div>
      )}
      {activity.training_load != null && (
        <div>
          <span className="text-muted">Treningsbelastning</span>
          <p className="font-medium tabular-nums">{Math.round(activity.training_load)}</p>
        </div>
      )}
      {activity.vo2max != null && (
        <div>
          <span className="text-muted">VO2max</span>
          <p className="font-medium tabular-nums">{activity.vo2max.toFixed(1)}</p>
        </div>
      )}

      {hasZones && (
        <div className="col-span-full mt-2">
          <span className="text-muted">Pulssoner</span>
          <div className="flex gap-4 mt-1">
            <span className="tabular-nums">
              S1: {formatZoneDuration(activity.hr_time_in_zone_1)}
            </span>
            <span className="tabular-nums">
              S2: {formatZoneDuration(activity.hr_time_in_zone_2)}
            </span>
            <span className="tabular-nums">
              S3: {formatZoneDuration(activity.hr_time_in_zone_3)}
            </span>
            <span className="tabular-nums">
              S4: {formatZoneDuration(activity.hr_time_in_zone_4)}
            </span>
            <span className="tabular-nums">
              S5: {formatZoneDuration(activity.hr_time_in_zone_5)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AktiviteterPage() {
  const [allActivities, setAllActivities] = useState<StravaActivity[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/activities");
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
    data.sort(
      (a, b) => new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime()
    );
    setAllActivities(data);
    setAuthenticated(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    const handler = () => { void fetchActivities(); };
    window.addEventListener("trenings:refresh", handler);
    return () => window.removeEventListener("trenings:refresh", handler);
  }, [fetchActivities]);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 py-24">
        <p className="text-lg text-muted">Laster aktiviteter...</p>
      </div>
    );
  }

  if (authenticated === false) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 py-24">
        <p className="text-muted">Du må logge inn først.</p>
        <a href="/" className="surface-card rounded-lg border px-4 py-2 text-sm font-medium">
          Gå til innlogging
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 py-24">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchActivities}
          className="surface-card rounded-lg border px-4 py-2 text-sm font-medium"
        >
          Prøv igjen
        </button>
      </div>
    );
  }

  const visible = allActivities.slice(0, visibleCount);
  const hasMore = visibleCount < allActivities.length;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Aktiviteter</h1>

      <p className="text-muted text-sm mb-4">
        Viser {visible.length} av {allActivities.length} aktiviteter
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4 font-medium">Dato</th>
              <th className="py-2 pr-4 font-medium">Type</th>
              <th className="py-2 pr-4 font-medium">Navn</th>
              <th className="py-2 pr-4 font-medium text-right">Distanse</th>
              <th className="py-2 pr-4 font-medium text-right">Varighet</th>
              <th className="py-2 pr-4 font-medium text-right">Tempo</th>
              <th className="py-2 pr-4 font-medium text-right">Snitt HR</th>
            </tr>
          </thead>
          <tbody>
            {visible
              .map((activity) => (
                <tr
                  key={activity.id}
                  className="border-b hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  onClick={() =>
                    setExpandedId((prev) => (prev === activity.id ? null : activity.id))
                  }
                >
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {formatDate(activity.start_date_local)}
                  </td>
                  <td className="py-2 pr-4">{activity.type}</td>
                  <td className="py-2 pr-4">{activity.name}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {formatDistance(activity.distance)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {formatDuration(activity.moving_time)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {activity.type === "Run" || activity.type === "Løping"
                      ? formatPace(activity.average_speed)
                      : "—"}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {activity.average_heartrate ? Math.round(activity.average_heartrate) : "—"}
                  </td>
                </tr>
              ))
              .flatMap((row, i) => {
                const activity = visible[i];
                if (expandedId === activity.id) {
                  return [
                    row,
                    <tr
                      key={`${activity.id}-details`}
                      className="border-b bg-black/[0.02] dark:bg-white/[0.02]"
                    >
                      <td colSpan={7}>
                        <ActivityDetails activity={activity} />
                      </td>
                    </tr>,
                  ];
                }
                return [row];
              })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="px-6 py-2 rounded border text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5"
          >
            Last inn {Math.min(PAGE_SIZE, allActivities.length - visibleCount)} eldre aktiviteter
          </button>
        </div>
      )}
    </main>
  );
}
