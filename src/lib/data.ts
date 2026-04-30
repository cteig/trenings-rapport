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
  const zoneNames = [
    "Sone 1 (Hvile)",
    "Sone 2 (Lett)",
    "Sone 3 (Moderat)",
    "Sone 4 (Hard)",
    "Sone 5 (Maks)",
  ];

  const hasGarminZones = activities.some((a) => a.hr_time_in_zone_1 != null);

  if (hasGarminZones) {
    const zones = [0, 0, 0, 0, 0];
    for (const act of activities) {
      zones[0] += act.hr_time_in_zone_1 || 0;
      zones[1] += act.hr_time_in_zone_2 || 0;
      zones[2] += act.hr_time_in_zone_3 || 0;
      zones[3] += act.hr_time_in_zone_4 || 0;
      zones[4] += act.hr_time_in_zone_5 || 0;
    }
    return zoneNames.map((name, i) => ({
      zone: name,
      minutes: Math.round(zones[i] / 60),
    }));
  }

  const zones = [0, 0, 0, 0, 0];
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

export interface TrainingEffectPoint {
  date: string;
  name: string;
  aerobic: number;
  anaerobic: number;
}

export function getTrainingEffectOverTime(activities: StravaActivity[]): TrainingEffectPoint[] {
  return activities
    .filter((a) => a.aerobic_training_effect != null)
    .sort((a, b) => a.start_date_local.localeCompare(b.start_date_local))
    .map((a) => {
      const aerob = a.aerobic_training_effect || 0;
      const anaerob = a.anaerobic_training_effect || 0;
      const total = aerob + anaerob;
      return {
        date: format(new Date(a.start_date_local), "dd.MM"),
        name: a.name,
        aerobic: total > 0 ? Math.round((aerob / total) * 100) : 0,
        anaerobic: total > 0 ? Math.round((anaerob / total) * 100) : 0,
      };
    });
}

export interface VO2MaxPoint {
  date: string;
  vo2max: number;
}

export function getVO2MaxOverTime(activities: StravaActivity[]): VO2MaxPoint[] {
  const points: VO2MaxPoint[] = [];
  let lastValue: number | null = null;

  const sorted = activities
    .filter((a) => a.vo2max != null && a.vo2max > 0)
    .sort((a, b) => a.start_date_local.localeCompare(b.start_date_local));

  for (const a of sorted) {
    if (a.vo2max !== lastValue) {
      points.push({
        date: format(new Date(a.start_date_local), "dd.MM"),
        vo2max: a.vo2max!,
      });
      lastValue = a.vo2max!;
    }
  }
  return points;
}

export interface RunningDynamicsPoint {
  date: string;
  cadence?: number;
  strideLength?: number;
  groundContactTime?: number;
}

export function getRunningDynamics(activities: StravaActivity[]): RunningDynamicsPoint[] {
  return activities
    .filter((a) => a.avg_running_cadence != null && a.sport_type.includes("running"))
    .sort((a, b) => a.start_date_local.localeCompare(b.start_date_local))
    .map((a) => ({
      date: format(new Date(a.start_date_local), "dd.MM"),
      cadence: a.avg_running_cadence ? Math.round(a.avg_running_cadence) : undefined,
      strideLength: a.avg_stride_length ? Math.round(a.avg_stride_length) : undefined,
      groundContactTime: a.avg_ground_contact_time
        ? Math.round(a.avg_ground_contact_time)
        : undefined,
    }));
}

export interface ElevationByMonth {
  month: string;
  gain: number;
  loss: number;
}

export function getElevationByMonth(activities: StravaActivity[]): ElevationByMonth[] {
  const map = new Map<string, { gain: number; loss: number }>();

  for (const act of activities) {
    const date = new Date(act.start_date_local);
    const key = format(startOfMonth(date), "MMM yyyy", { locale: nb });
    const existing = map.get(key) || { gain: 0, loss: 0 };
    existing.gain += act.total_elevation_gain || 0;
    existing.loss += act.elevation_loss || 0;
    map.set(key, existing);
  }

  return Array.from(map.entries()).map(([month, data]) => ({
    month,
    gain: Math.round(data.gain),
    loss: Math.round(data.loss),
  }));
}

export interface TrainingLoadByWeek {
  week: string;
  load: number;
}

export function getTrainingLoadByWeek(activities: StravaActivity[]): TrainingLoadByWeek[] {
  const map = new Map<string, { sortKey: string; load: number }>();

  for (const act of activities) {
    if (!act.training_load) continue;
    const date = new Date(act.start_date_local);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const key = format(weekStart, "'Uke' w", { locale: nb });
    const sortKey = format(weekStart, "yyyy-MM-dd");
    const existing = map.get(key) || { sortKey, load: 0 };
    existing.load += act.training_load;
    map.set(key, existing);
  }

  return Array.from(map.entries())
    .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
    .map(([week, { load }]) => ({
      week,
      load: Math.round(load),
    }));
}
