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
  hasSleepData: boolean;
  hasHeartRateData: boolean;
}
