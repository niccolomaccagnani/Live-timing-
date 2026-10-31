export type LapStatus = "valid" | "in" | "out" | "invalid" | "incomplete";
export interface Lap {
  number: number;
  time: number | null;
  sectors: [number, number, number];
  status: LapStatus;
}
export interface Driver {
  id: string;
  number: number;
  name: string;
  short: string;
  team: string;
  color: string;
  laps: Lap[];
}
export interface Filters {
  anomalies: boolean;
  special: boolean;
}
export const RULES =
  "v1: inclusive original lap interval; finite valid laps only when special filter enabled; manual exclusions; optional isolated anomaly >=0.800s slower than both adjacent valid laps. Shift affects display only.";
export function isAnomaly(laps: Lap[], i: number) {
  const a = laps[i - 1],
    b = laps[i],
    c = laps[i + 1];
  return !!(
    a &&
    b &&
    c &&
    [a, b, c].every((l) => l.status === "valid" && l.time !== null) &&
    b.time! - a.time! >= 0.8 - 1e-9 &&
    b.time! - c.time! >= 0.8 - 1e-9
  );
}
export function eligible(
  laps: Lap[],
  interval: [number, number],
  excluded: number[],
  filters: Filters,
) {
  const [a, b] = interval.slice().sort((x, y) => x - y);
  return laps.filter(
    (l, i) =>
      l.number >= a &&
      l.number <= b &&
      l.time !== null &&
      Number.isFinite(l.time) &&
      !excluded.includes(l.number) &&
      (!filters.special || l.status === "valid") &&
      (!filters.anomalies || !isAnomaly(laps, i)),
  );
}
export function average(laps: Lap[]) {
  const times = laps.flatMap((l) =>
    l.time !== null && Number.isFinite(l.time) ? [l.time] : [],
  );
  return times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
}
export function shifted(laps: Lap[], shift: number) {
  return laps.map((l) => ({ ...l, x: l.number + shift }));
}
export function intervalFromPoints(a: number, b: number): [number, number] {
  return [Math.min(a, b), Math.max(a, b)];
}
export function theoretical(laps: Lap[]) {
  const valid = laps.filter(
    (l) =>
      l.status === "valid" &&
      l.sectors.every((s) => s > 0 && Number.isFinite(s)),
  );
  return valid.length
    ? [0, 1, 2]
        .map((i) => Math.min(...valid.map((l) => l.sectors[i])))
        .reduce((a, b) => a + b, 0)
    : null;
}
export function formatTime(time: number | null) {
  if (time === null) return "—";
  return `${Math.floor(time / 60)}:${(time % 60).toFixed(3).padStart(6, "0")}`;
}
export interface Analysis {
  id: string;
  title: string;
  created: string;
  drivers: string[];
  interval: [number, number];
  shifts: Record<string, number>;
  excluded: Record<string, number[]>;
  filters: Filters;
  results: {
    id: string;
    mean: number | null;
    count: number;
    excluded: number[];
  }[];
  rules: string;
  report: boolean;
}
