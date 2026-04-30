import { startOfWeek, startOfMonth, startOfYear, format } from "date-fns";
import { nb } from "date-fns/locale";
import { StravaActivity, PeriodType, ActivitySummary } from "@/types/strava";

function getPeriodKey(date: Date, period: PeriodType): string {
  switch (period) {
    case "week": {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      return format(weekStart, "'Uke' w, yyyy", { locale: nb });
    }
    case "month": {
      const monthStart = startOfMonth(date);
      return format(monthStart, "MMMM yyyy", { locale: nb });
    }
    case "year": {
      const yearStart = startOfYear(date);
      return format(yearStart, "yyyy");
    }
  }
}

function getPeriodSortKey(date: Date, period: PeriodType): string {
  switch (period) {
    case "week":
      return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
    case "month":
      return format(startOfMonth(date), "yyyy-MM");
    case "year":
      return format(startOfYear(date), "yyyy");
  }
}

export function groupActivitiesByPeriod(
  activities: StravaActivity[],
  period: PeriodType
): ActivitySummary[] {
  const map = new Map<string, ActivitySummary & { _sortKey: string }>();

  for (const act of activities) {
    const date = new Date(act.start_date_local);
    const key = getPeriodKey(date, period);
    const sortKey = getPeriodSortKey(date, period);

    if (!map.has(key)) {
      map.set(key, {
        period: key,
        totalDuration: 0,
        totalDistance: 0,
        totalSessions: 0,
        byType: {},
        _sortKey: sortKey,
      });
    }

    const summary = map.get(key)!;
    const durationMin = act.moving_time / 60;
    const distanceKm = act.distance / 1000;

    summary.totalDuration += durationMin;
    summary.totalDistance += distanceKm;
    summary.totalSessions += 1;

    const type = act.type;
    if (!summary.byType[type]) {
      summary.byType[type] = { duration: 0, distance: 0, sessions: 0 };
    }
    summary.byType[type].duration += durationMin;
    summary.byType[type].distance += distanceKm;
    summary.byType[type].sessions += 1;
  }

  return Array.from(map.values())
    .sort((a, b) => a._sortKey.localeCompare(b._sortKey))
    .map(({ _sortKey: _, ...rest }) => rest);
}

export interface IntensityData {
  zone: string;
  minutes: number;
}

export function calculateIntensityFromActivities(activities: StravaActivity[]): IntensityData[] {
  // HR zone thresholds: Z1 <60%, Z2 60-70%, Z3 70-80%, Z4 80-90%, Z5 90%+ of max HR
  const zones = [0, 0, 0, 0, 0];
  const zoneNames = [
    "Sone 1 (Hvile)",
    "Sone 2 (Lett)",
    "Sone 3 (Moderat)",
    "Sone 4 (Hard)",
    "Sone 5 (Maks)",
  ];

  for (const act of activities) {
    if (!act.has_heartrate || !act.average_heartrate || !act.max_heartrate) continue;

    const ratio = act.average_heartrate / act.max_heartrate;
    const minutes = act.moving_time / 60;

    if (ratio < 0.6) zones[0] += minutes;
    else if (ratio < 0.7) zones[1] += minutes;
    else if (ratio < 0.8) zones[2] += minutes;
    else if (ratio < 0.9) zones[3] += minutes;
    else zones[4] += minutes;
  }

  return zoneNames.map((name, i) => ({
    zone: name,
    minutes: Math.round(zones[i]),
  }));
}

export function getActivityTypeDistribution(
  activities: StravaActivity[]
): Array<{ type: string; minutes: number; km: number; sessions: number }> {
  const map = new Map<string, { minutes: number; km: number; sessions: number }>();

  for (const act of activities) {
    const existing = map.get(act.type) || { minutes: 0, km: 0, sessions: 0 };
    existing.minutes += act.moving_time / 60;
    existing.km += act.distance / 1000;
    existing.sessions += 1;
    map.set(act.type, existing);
  }

  return Array.from(map.entries())
    .map(([type, data]) => ({
      type,
      minutes: Math.round(data.minutes),
      km: +data.km.toFixed(1),
      sessions: data.sessions,
    }))
    .sort((a, b) => b.minutes - a.minutes);
}
