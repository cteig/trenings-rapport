import { format } from "date-fns";
import type { WellnessDay } from "@/types/wellness";

function formatChartDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return format(new Date(year, month - 1, day), "dd.MM");
}

export function formatSleepHours(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}t ${minutes}m`;
}

export function getSleepChartData(days: WellnessDay[]) {
  return days.map((day) => ({
    date: formatChartDate(day.date),
    sleepHours: +(day.sleepSeconds / 3600).toFixed(1),
    deepHours: +(day.deepSleepSeconds / 3600).toFixed(1),
    remHours: +(day.remSleepSeconds / 3600).toFixed(1),
    lightHours: +(day.lightSleepSeconds / 3600).toFixed(1),
  }));
}

export function getRecoveryChartData(days: WellnessDay[]) {
  return days.map((day) => ({
    date: formatChartDate(day.date),
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
