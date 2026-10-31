import { describe, it, expect } from "vitest";
import {
  average,
  eligible,
  shifted,
  intervalFromPoints,
  isAnomaly,
  theoretical,
  type Lap,
} from "./timing";
const laps: Lap[] = [95, 96, 95, 99, 95].map((time, i) => ({
  number: i + 1,
  time,
  sectors: [30, 35, 30],
  status: "valid",
}));
describe("deterministic analysis", () => {
  it("selects inclusive intervals in either order", () => {
    expect(intervalFromPoints(4, 2)).toEqual([2, 4]);
    expect(
      eligible(laps, [4, 2], [], { special: true, anomalies: false }).map(
        (l) => l.number,
      ),
    ).toEqual([2, 3, 4]);
  });
  it("shifts display coordinates without changing originals", () => {
    const original = JSON.stringify(laps);
    expect(shifted(laps, -2)[0].x).toBe(-1);
    expect(JSON.stringify(laps)).toBe(original);
    expect(shifted(laps, 0)[0].time).toBe(95);
  });
  it("filters manual exclusions and calculates averages", () => {
    expect(
      average(
        eligible(laps, [1, 5], [2, 4], { special: true, anomalies: false }),
      ),
    ).toBe(95);
    expect(average([])).toBeNull();
  });
  it("detects isolated anomalies and preserves data", () => {
    expect(isAnomaly(laps, 3)).toBe(true);
    expect(
      eligible(laps, [1, 5], [], { special: true, anomalies: true }),
    ).toHaveLength(3);
    expect(laps[3].time).toBe(99);
  });
  it("filters special and incomplete laps", () => {
    const a: Lap[] = [
      { ...laps[0], status: "out" },
      { ...laps[1], status: "invalid" },
      { ...laps[2], time: null, status: "incomplete" },
      laps[3],
    ];
    expect(
      eligible(a, [1, 5], [], { special: true, anomalies: false }),
    ).toEqual([laps[3]]);
    expect(
      eligible(a, [1, 5], [], { special: false, anomalies: false }),
    ).toHaveLength(3);
  });
  it("requires comparable neighboring laps and respects 800ms threshold", () => {
    expect(isAnomaly(laps, 0)).toBe(false);
    expect(
      isAnomaly([{ ...laps[0], status: "out" }, laps[1], laps[2]], 1),
    ).toBe(false);
    expect(isAnomaly([laps[0], { ...laps[1], time: 95.8 }, laps[2]], 1)).toBe(
      true,
    );
  });
  it("calculates sector theoretical best", () => {
    expect(theoretical(laps)).toBe(95);
    expect(theoretical([])).toBeNull();
  });
});
