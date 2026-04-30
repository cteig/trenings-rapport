import { describe, it, expect } from "vitest";
import {
  groupActivitiesByPeriod,
  calculateIntensityFromActivities,
  getActivityTypeDistribution,
} from "../data";
import { StravaActivity } from "@/types/strava";

function makeActivity(overrides: Partial<StravaActivity> = {}): StravaActivity {
  return {
    id: 1,
    name: "Morning Run",
    type: "Run",
    sport_type: "Run",
    start_date: "2025-03-10T07:00:00Z",
    start_date_local: "2025-03-10T08:00:00",
    elapsed_time: 3600,
    moving_time: 3600,
    distance: 10000,
    total_elevation_gain: 50,
    average_speed: 2.78,
    max_speed: 4.0,
    has_heartrate: false,
    ...overrides,
  };
}

describe("groupActivitiesByPeriod", () => {
  it("groups activities by week", () => {
    const activities = [
      makeActivity({
        id: 1,
        start_date_local: "2025-03-10T08:00:00",
        moving_time: 3600,
        distance: 10000,
      }),
      makeActivity({
        id: 2,
        start_date_local: "2025-03-12T08:00:00",
        moving_time: 1800,
        distance: 5000,
      }),
      makeActivity({
        id: 3,
        start_date_local: "2025-03-17T08:00:00",
        moving_time: 7200,
        distance: 20000,
      }),
    ];

    const result = groupActivitiesByPeriod(activities, "week");

    expect(result).toHaveLength(2);
    expect(result[0].totalSessions).toBe(2);
    expect(result[0].totalDuration).toBe(90);
    expect(result[0].totalDistance).toBe(15);
    expect(result[1].totalSessions).toBe(1);
  });

  it("groups activities by month", () => {
    const activities = [
      makeActivity({
        id: 1,
        start_date_local: "2025-01-15T08:00:00",
        moving_time: 3600,
        distance: 10000,
      }),
      makeActivity({
        id: 2,
        start_date_local: "2025-02-10T08:00:00",
        moving_time: 1800,
        distance: 5000,
      }),
    ];

    const result = groupActivitiesByPeriod(activities, "month");

    expect(result).toHaveLength(2);
    expect(result[0].period).toContain("januar");
    expect(result[1].period).toContain("februar");
  });

  it("groups activities by year", () => {
    const activities = [
      makeActivity({
        id: 1,
        start_date_local: "2024-06-01T08:00:00",
        moving_time: 3600,
        distance: 10000,
      }),
      makeActivity({
        id: 2,
        start_date_local: "2025-03-01T08:00:00",
        moving_time: 1800,
        distance: 5000,
      }),
    ];

    const result = groupActivitiesByPeriod(activities, "year");

    expect(result).toHaveLength(2);
    expect(result[0].period).toBe("2024");
    expect(result[1].period).toBe("2025");
  });

  it("tracks byType breakdown", () => {
    const activities = [
      makeActivity({ id: 1, type: "Run", moving_time: 3600, distance: 10000 }),
      makeActivity({ id: 2, type: "Ride", moving_time: 7200, distance: 30000 }),
      makeActivity({ id: 3, type: "Run", moving_time: 1800, distance: 5000 }),
    ];

    const result = groupActivitiesByPeriod(activities, "week");

    expect(result[0].byType["Run"].sessions).toBe(2);
    expect(result[0].byType["Run"].duration).toBe(90);
    expect(result[0].byType["Run"].distance).toBe(15);
    expect(result[0].byType["Ride"].sessions).toBe(1);
    expect(result[0].byType["Ride"].duration).toBe(120);
  });

  it("returns empty array for no activities", () => {
    expect(groupActivitiesByPeriod([], "week")).toEqual([]);
  });

  it("sorts periods chronologically", () => {
    const activities = [
      makeActivity({ id: 1, start_date_local: "2025-03-17T08:00:00" }),
      makeActivity({ id: 2, start_date_local: "2025-03-03T08:00:00" }),
      makeActivity({ id: 3, start_date_local: "2025-03-10T08:00:00" }),
    ];

    const result = groupActivitiesByPeriod(activities, "week");

    expect(result[0].period).toContain("Uke 10");
    expect(result[2].period).toContain("Uke 12");
  });
});

describe("calculateIntensityFromActivities", () => {
  it("categorizes by HR zone based on avg/max ratio", () => {
    const activities = [
      makeActivity({
        has_heartrate: true,
        average_heartrate: 100,
        max_heartrate: 200,
        moving_time: 3600,
      }),
      makeActivity({
        has_heartrate: true,
        average_heartrate: 160,
        max_heartrate: 200,
        moving_time: 1800,
      }),
      makeActivity({
        has_heartrate: true,
        average_heartrate: 185,
        max_heartrate: 200,
        moving_time: 600,
      }),
    ];

    const result = calculateIntensityFromActivities(activities);

    expect(result).toHaveLength(5);
    expect(result[0].minutes).toBe(60);
    expect(result[3].minutes).toBe(30);
    expect(result[4].minutes).toBe(10);
  });

  it("skips activities without heart rate data", () => {
    const activities = [
      makeActivity({ has_heartrate: false, moving_time: 3600 }),
      makeActivity({
        has_heartrate: true,
        average_heartrate: 140,
        max_heartrate: 200,
        moving_time: 1800,
      }),
    ];

    const result = calculateIntensityFromActivities(activities);
    const totalMinutes = result.reduce((sum, z) => sum + z.minutes, 0);

    expect(totalMinutes).toBe(30);
  });

  it("returns all zeros for empty input", () => {
    const result = calculateIntensityFromActivities([]);
    expect(result.every((z) => z.minutes === 0)).toBe(true);
  });
});

describe("getActivityTypeDistribution", () => {
  it("aggregates by activity type", () => {
    const activities = [
      makeActivity({ type: "Run", moving_time: 3600, distance: 10000 }),
      makeActivity({ type: "Run", moving_time: 1800, distance: 5000 }),
      makeActivity({ type: "Ride", moving_time: 7200, distance: 40000 }),
    ];

    const result = getActivityTypeDistribution(activities);

    expect(result).toHaveLength(2);
    const ride = result.find((r) => r.type === "Ride")!;
    const run = result.find((r) => r.type === "Run")!;
    expect(run.minutes).toBe(90);
    expect(run.km).toBe(15);
    expect(run.sessions).toBe(2);
    expect(ride.minutes).toBe(120);
    expect(ride.km).toBe(40);
  });

  it("sorts by minutes descending", () => {
    const activities = [
      makeActivity({ type: "Walk", moving_time: 600, distance: 1000 }),
      makeActivity({ type: "Run", moving_time: 7200, distance: 20000 }),
    ];

    const result = getActivityTypeDistribution(activities);

    expect(result[0].type).toBe("Run");
    expect(result[1].type).toBe("Walk");
  });

  it("returns empty for no activities", () => {
    expect(getActivityTypeDistribution([])).toEqual([]);
  });
});
