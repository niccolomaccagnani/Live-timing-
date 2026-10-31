import { eligible, average, type Driver, type Filters } from "./timing";
/** Serializable boundary for future agents and API tools. Original timing data stays immutable. */
export interface AnalysisRequest {
  driverIds: string[];
  interval: [number, number];
  exclusions: Record<string, number[]>;
  filters: Filters;
}
export function analyze(drivers: Driver[], request: AnalysisRequest) {
  return drivers
    .filter((d) => request.driverIds.includes(d.id))
    .map((d) => {
      const included = eligible(
        d.laps,
        request.interval,
        request.exclusions[d.id] || [],
        request.filters,
      );
      const [lo, hi] = [...request.interval].sort((a, b) => a - b);
      return {
        id: d.id,
        mean: average(included),
        count: included.length,
        excluded: d.laps
          .filter(
            (l) => l.number >= lo && l.number <= hi && !included.includes(l),
          )
          .map((l) => l.number),
      };
    });
}
