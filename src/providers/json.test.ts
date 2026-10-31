import { describe, it, expect, vi, afterEach } from "vitest";
import { parseSnapshot, validateTimingUrl, JsonTimingProvider } from "./json";
const snapshot = {
  category: "GT3",
  track: "Spa",
  session: "Practice",
  drivers: [
    {
      id: "car7",
      number: 7,
      name: "Alex",
      laps: [
        { number: 1, time: 120, sectors: [30, 30, 30, 30], status: "valid" },
      ],
    },
  ],
};
afterEach(() => vi.unstubAllGlobals());
describe("category-neutral JSON timing provider", () => {
  it("accepts other categories and variable sector counts without mutating input", () => {
    const before = JSON.stringify(snapshot);
    const s = parseSnapshot(snapshot);
    expect(s.category).toBe("GT3");
    expect(s.drivers[0].laps[0].sectors).toHaveLength(4);
    expect(JSON.stringify(snapshot)).toBe(before);
  });
  it("rejects unsupported links and embedded credentials", () => {
    expect(() => validateTimingUrl("file:///etc/passwd")).toThrow();
    expect(() => validateTimingUrl("https://user:pass@example.com")).toThrow();
    expect(() => validateTimingUrl("not a link")).toThrow();
    expect(validateTimingUrl("https://timing.example.com")).toBe(
      "https://timing.example.com/",
    );
  });
  it("rejects incomplete schema, duplicate drivers and invalid laps", () => {
    expect(() => parseSnapshot({})).toThrow();
    expect(() =>
      parseSnapshot({
        ...snapshot,
        drivers: [...snapshot.drivers, ...snapshot.drivers],
      }),
    ).toThrow();
    expect(() =>
      parseSnapshot({
        ...snapshot,
        drivers: [
          {
            ...snapshot.drivers[0],
            laps: [{ ...snapshot.drivers[0].laps[0], time: NaN }],
          },
        ],
      }),
    ).toThrow();
  });
  it("does not pretend a timing webpage is a supported feed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>timing</html>", {
          headers: { "content-type": "text/html" },
        }),
      ),
    );
    await expect(
      new JsonTimingProvider("https://example.com").getSnapshot(),
    ).rejects.toThrow("provider adapter");
  });
  it("fetches and validates a JSON snapshot", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(snapshot), {
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    expect(
      (await new JsonTimingProvider("https://example.com/feed").getSnapshot())
        .drivers[0].number,
    ).toBe(7);
  });
});
