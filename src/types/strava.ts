export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  elapsed_time: number; // seconds
  moving_time: number; // seconds
  distance: number; // meters
  total_elevation_gain: number;
  elevation_loss?: number;
  average_speed: number; // m/s
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  has_heartrate: boolean;
  suffer_score?: number;
  // Garmin-specific fields
  calories?: number;
  aerobic_training_effect?: number; // 0-5
  anaerobic_training_effect?: number; // 0-5
  vo2max?: number;
  training_load?: number;
  avg_running_cadence?: number; // steps/min
  avg_stride_length?: number; // cm
  avg_ground_contact_time?: number; // ms
  avg_vertical_oscillation?: number; // cm
  hr_time_in_zone_1?: number; // seconds
  hr_time_in_zone_2?: number; // seconds
  hr_time_in_zone_3?: number; // seconds
  hr_time_in_zone_4?: number; // seconds
  hr_time_in_zone_5?: number; // seconds
}

export interface StravaHeartRateZone {
  min: number;
  max: number;
  name: string;
}

export interface StravaZones {
  heart_rate: {
    custom_zones: boolean;
    zones: Array<{
      min: number;
      max: number;
    }>;
  };
}

export type PeriodType = "week" | "month" | "year";

export interface ActivitySummary {
  period: string;
  totalDuration: number; // minutes
  totalDistance: number; // km
  totalSessions: number;
  byType: Record<
    string,
    {
      duration: number;
      distance: number;
      sessions: number;
    }
  >;
}
