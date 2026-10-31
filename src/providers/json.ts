import type { TimingProvider, TimingSnapshot } from "./types";
import type { Driver, Lap, LapStatus } from "../engine/timing";
const statuses: LapStatus[] = ["valid", "in", "out", "invalid", "incomplete"];
function record(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function text(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
export function validateTimingUrl(value: string) {
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Use an HTTP(S) timing URL without embedded credentials.");
  return url.toString();
}
export function parseSnapshot(data: unknown): TimingSnapshot {
  if (
    !record(data) ||
    !text(data.session) ||
    !text(data.track) ||
    !text(data.category) ||
    !Array.isArray(data.drivers) ||
    !data.drivers.length
  )
    throw new Error(
      "Expected a normalized timing JSON feed with category, session, track and drivers. A timing webpage needs a provider adapter.",
    );
  const ids = new Set<string>();
  const drivers: Driver[] = data.drivers.map((d: unknown, index: number) => {
    if (
      !record(d) ||
      !text(d.id) ||
      ids.has(d.id) ||
      !Number.isInteger(d.number) ||
      !text(d.name) ||
      !Array.isArray(d.laps) ||
      !d.laps.length
    )
      throw new Error(
        "Each driver needs a unique id, car number, name and lap history.",
      );
    ids.add(d.id);
    const numbers = new Set<number>();
    const laps: Lap[] = d.laps
      .map((l: unknown) => {
        if (
          !record(l) ||
          !Number.isInteger(l.number) ||
          (l.number as number) < 1 ||
          numbers.has(l.number as number) ||
          !(
            l.time === null ||
            (typeof l.time === "number" &&
              Number.isFinite(l.time) &&
              l.time > 0)
          ) ||
          !statuses.includes(l.status as LapStatus) ||
          !Array.isArray(l.sectors) ||
          l.sectors.length < 1 ||
          !l.sectors.every(
            (s) => typeof s === "number" && Number.isFinite(s) && s >= 0,
          ) ||
          (l.time === null && l.status !== "incomplete")
        )
          throw new Error(
            "Invalid lap data: positive unique lap numbers, seconds, sectors and a valid status are required.",
          );
        numbers.add(l.number as number);
        return {
          number: l.number as number,
          time: l.time as number | null,
          sectors: [...l.sectors] as number[],
          status: l.status as LapStatus,
        };
      })
      .sort((a, b) => a.number - b.number);
    return {
      id: d.id,
      number: d.number as number,
      name: d.name,
      short: text(d.short) ? d.short : d.id,
      team: text(d.team) ? d.team : "Independent",
      color:
        typeof d.color === "string" && /^#[0-9a-f]{6}$/i.test(d.color)
          ? d.color
          : ["#a8ef57", "#b19cff", "#53b7ff", "#ffa15c"][index % 4],
      laps,
    };
  });
  return {
    drivers,
    session: data.session,
    track: data.track,
    category: data.category,
  };
}
export class JsonTimingProvider implements TimingProvider {
  constructor(private url: string) {
    validateTimingUrl(url);
  }
  async getSnapshot(signal?: AbortSignal) {
    const response = await fetch(this.url, {
      signal: signal ?? AbortSignal.timeout(15000),
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(`Timing feed returned HTTP ${response.status}`);
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("json"))
      throw new Error(
        "This link serves a webpage, not a timing JSON feed. A provider adapter is required.",
      );
    return parseSnapshot(await response.json());
  }
}
