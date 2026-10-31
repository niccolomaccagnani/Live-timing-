import { describe, it, expect } from "vitest";
import { analyze } from "./analysis";
import { drivers } from "../providers/mock";
import { shifted } from "./timing";
describe("structured analysis boundary", () => {
  it("keeps results invariant under display shifts and preserves original data", () => {
    const before = JSON.stringify(drivers);
    const request = {
      driverIds: ["FOR", "MIN"],
      interval: [3, 18] as [number, number],
      exclusions: { FOR: [4] },
      filters: { special: true, anomalies: true },
    };
    const result = analyze(drivers, request);
    shifted(drivers[0].laps, 5);
    expect(analyze(drivers, request)).toEqual(result);
    expect(result[0].excluded).toContain(8);
    expect(result[0].excluded).toContain(4);
    expect(result[1].excluded).toContain(11);
    expect(JSON.stringify(drivers)).toBe(before);
  });
  it("returns null averages when every lap is excluded", () => {
    const result = analyze(drivers, {
      driverIds: ["FOR"],
      interval: [1, 2],
      exclusions: { FOR: [2] },
      filters: { special: true, anomalies: true },
    });
    expect(result[0]).toMatchObject({ count: 0, mean: null, excluded: [1, 2] });
  });
});
