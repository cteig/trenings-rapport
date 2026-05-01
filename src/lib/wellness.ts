import { format } from "date-fns";

export interface WellnessDay {
  date: string;
  sleepSeconds: number;
  deepSleepSeconds: number;
  lightSleepSeconds: number;
  remSleepSeconds: number;
  awakeSleepSeconds: number;
  sleepScore?: number;
  avgSleepStress?: number;
  avgOvernightHrv?: number;
  hrvStatus?: string;
  restingHeartRate?: number;
  bodyBatteryChange?: number;
  averageRespiration?: number;
  maxHeartRate?: number;
  minHeartRate?: number;
}

export function formatSleepHours(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}t ${minutes}m`;
}

export function getSleepChartData(days: WellnessDay[]) {
  return days.map((day) => ({
    date: format(new Date(day.date), "dd.MM"),
    sleepHours: +(day.sleepSeconds / 3600).toFixed(1),
    deepHours: +(day.deepSleepSeconds / 3600).toFixed(1),
    remHours: +(day.remSleepSeconds / 3600).toFixed(1),
    lightHours: +(day.lightSleepSeconds / 3600).toFixed(1),
  }));
}

export function getRecoveryChartData(days: WellnessDay[]) {
  return days.map((day) => ({
    date: format(new Date(day.date), "dd.MM"),
    hrv: day.avgOvernightHrv ?? null,
    restingHeartRate: day.restingHeartRate ?? null,
    sleepScore: day.sleepScore ?? null,
    stress: day.avgSleepStress ?? null,
  }));
}

export function getWellnessSummary(days: WellnessDay[]) {
  const withSleep = days.filter((day) => day.sleepSeconds > 0);
  const withHrv = days.filter((day) => day.avgOvernightHrv != null);
  const withSleepScore = withSleep.filter((day) => day.sleepScore != null);
  const withRestingHeartRate = days.filter((day) => day.restingHeartRate != null);

  const avgSleepSeconds = withSleep.length
    ? Math.round(withSleep.reduce((sum, day) => sum + day.sleepSeconds, 0) / withSleep.length)
    : 0;

  const avgSleepScore = withSleepScore.length
    ? Math.round(
        withSleepScore.reduce((sum, day) => sum + (day.sleepScore || 0), 0) / withSleepScore.length
      )
    : null;

  const avgHrv = withHrv.length
    ? Math.round(withHrv.reduce((sum, day) => sum + (day.avgOvernightHrv || 0), 0) / withHrv.length)
    : null;

  const avgRestingHeartRate = withRestingHeartRate.length
    ? Math.round(
        withRestingHeartRate.reduce((sum, day) => sum + (day.restingHeartRate || 0), 0) /
          withRestingHeartRate.length
      )
    : null;

  const latestHrvStatus = [...days].reverse().find((day) => day.hrvStatus)?.hrvStatus || null;

  return {
    avgSleepSeconds,
    avgSleepScore,
    avgHrv,
    avgRestingHeartRate,
    latestHrvStatus,
  };
}
