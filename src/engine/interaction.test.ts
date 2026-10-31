import { describe, it, expect } from "vitest";
import {
  isShiftShortcut,
  toggleExclusion,
  eligible,
  average,
  theoretical,
} from "./timing";
import { drivers } from "../providers/mock";
describe("Mac alignment and manual lap exclusions", () => {
  it("recognizes Option+S even when the OS supplies a special character", () => {
    expect(isShiftShortcut({ altKey: true, code: "KeyS", key: "ß" })).toBe(
      true,
    );
    expect(isShiftShortcut({ altKey: true, code: "KeyS", key: "s" })).toBe(
      true,
    );
    expect(isShiftShortcut({ altKey: false, code: "KeyS", key: "s" })).toBe(
      false,
    );
  });
  it("excludes and reinstates laps while preserving the original timing", () => {
    const laps = drivers[0].laps;
    const before = JSON.stringify(laps);
    const filter = { special: true, anomalies: false };
    const all = eligible(laps, [3, 10], [], filter);
    const excluded = toggleExclusion([], 8);
    const without = eligible(laps, [3, 10], excluded, filter);
    expect(without).toHaveLength(all.length - 1);
    expect(average(without)).toBeLessThan(average(all)!);
    expect(
      eligible(laps, [3, 10], toggleExclusion(excluded, 8), filter),
    ).toEqual(all);
    expect(JSON.stringify(laps)).toBe(before);
  });
  it("supports theoretical best laps with four sectors", () => {
    expect(
      theoretical([
        { number: 1, time: 120, sectors: [30, 30, 30, 30], status: "valid" },
      ]),
    ).toBe(120);
  });
});
