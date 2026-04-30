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
  average_speed: number; // m/s
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  has_heartrate: boolean;
  suffer_score?: number;
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
