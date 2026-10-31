import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from "recharts";
import {
  Activity,
  Flag,
  ChartNoAxesCombined,
  Layers,
  FileText,
  Settings,
  ChevronDown,
  Search,
  Plus,
  ArrowUpRight,
  Radio,
  RotateCcw,
  Download,
  Check,
  X,
  Clock3,
  SlidersHorizontal,
  Bookmark,
  MoveHorizontal,
} from "lucide-react";
import { ConnectionSettings } from "./components/ConnectionSettings";
import { JsonTimingProvider } from "./providers/json";
import type { TimingSnapshot } from "./providers/types";
import { MockTimingProvider } from "./providers/mock";
import {
  formatTime,
  eligible,
  theoretical,
  isAnomaly,
  intervalFromPoints,
  isShiftShortcut,
  toggleExclusion,
  RULES,
  type Driver,
  type Analysis,
} from "./engine/timing";

import "./style.css";
import { analyze } from "./engine/analysis";
const storageKey = "race-engineer-v1";
function readSaved(): Analysis[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "[]");
  } catch {
    return [];
  }
}
function App() {
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState(
    () => localStorage.getItem("race-engineer-url") || "",
  );
  const [liveUrl, setLiveUrl] = useState("");
  const [feedError, setFeedError] = useState("");
  const [sessionMeta, setSessionMeta] = useState({
    category: "Motorsport · demo",
    track: "Monza",
    session: "Practice 2",
  });
  const [excludeMode, setExcludeMode] = useState(false);
  function applySnapshot(snapshot: TimingSnapshot, reset = true) {
    setDrivers(snapshot.drivers);
    setSessionMeta({
      category: snapshot.category,
      track: snapshot.track,
      session: snapshot.session,
    });
    if (reset) {
      setSelected(snapshot.drivers.slice(0, 3).map((d) => d.id));
      setActive(snapshot.drivers[0]?.id || "");
      setInterval([
        Math.min(
          ...snapshot.drivers.flatMap((d) => d.laps.map((l) => l.number)),
        ),
        Math.max(
          ...snapshot.drivers.flatMap((d) => d.laps.map((l) => l.number)),
        ),
      ]);
      setShifts({});
      setExcluded({});
      setAnchor(null);
      setResults([]);
      setSector("Latest lap");
      setShiftMode(false);
      setExcludeMode(false);
    }
  }
  function saveUrl(url: string) {
    localStorage.setItem("race-engineer-url", url);
    setSourceUrl(url);
  }
  function connect(url: string, snapshot: TimingSnapshot) {
    applySnapshot(snapshot);
    saveUrl(url);
    setLiveUrl(url);
    setFeedError("");
    setConnectionOpen(false);
    setNotice("Timing feed connected · refreshes every 10 seconds");
  }
  function useDemo() {
    setLiveUrl("");
    setFeedError("");
    new MockTimingProvider().getSnapshot().then((s) => applySnapshot(s));
    setConnectionOpen(false);
  }
  useEffect(() => {
    if (!liveUrl) return;
    let disposed = false;
    let controller: AbortController | null = null;
    const timer = window.setInterval(async () => {
      if (controller) return;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 15000);
      try {
        const snapshot = await new JsonTimingProvider(liveUrl).getSnapshot(
          controller.signal,
        );
        if (!disposed) {
          applySnapshot(snapshot, false);
          setFeedError("");
          setResults([]);
        }
      } catch (e) {
        if (!disposed)
          setFeedError(
            "Feed update failed · displaying the last received data. Check the timing connection.",
          );
      } finally {
        clearTimeout(timeout);
        controller = null;
      }
    }, 10000);
    return () => {
      disposed = true;
      clearInterval(timer);
      controller?.abort();
    };
  }, [liveUrl]);

  const [drivers, setDrivers] = useState<Driver[]>([]),
    [selected, setSelected] = useState(["FOR", "MIN", "BEG"]),
    [search, setSearch] = useState(""),
    [active, setActive] = useState("FOR"),
    [shifts, setShifts] = useState<Record<string, number>>({}),
    [shiftMode, setShiftMode] = useState(false),
    [excluded, setExcluded] = useState<Record<string, number[]>>({}),
    [interval, setInterval] = useState<[number, number]>([3, 18]),
    [anchor, setAnchor] = useState<number | null>(null),
    [filters, setFilters] = useState({ anomalies: true, special: true }),
    [results, setResults] = useState<Analysis["results"]>([]),
    [history, setHistory] = useState<Analysis[]>(readSaved),
    [tab, setTab] = useState("Timing dashboard"),
    [notice, setNotice] = useState(""),
    [sector, setSector] = useState("Latest lap");
  const drag = useRef<{ x: number; shift: number } | null>(null);
  useEffect(() => {
    new MockTimingProvider().getSnapshot().then((s) => {
      setDrivers(s.drivers);
      setSessionMeta({
        category: s.category,
        track: s.track,
        session: s.session,
      });
    });
  }, []);
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(history));
  }, [history]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 3500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  const chosen = drivers.filter((d) => selected.includes(d.id));
  function eligibleForReview(d: Driver, lap: number) {
    return eligible(d.laps, interval, excluded[d.id] || [], filters).some(
      (l) => l.number === lap,
    );
  }
  function calculate() {
    const r = analyze(drivers, {
      driverIds: selected,
      interval,
      exclusions: excluded,
      filters,
    });
    setResults(r);
    return r;
  }
  function save() {
    const r = calculate();
    const a: Analysis = {
      id: crypto.randomUUID(),
      title: `Race pace · ${selected.join(" / ")}`,
      created: new Date().toISOString(),
      drivers: [...selected],
      interval: [...interval],
      shifts: { ...shifts },
      excluded: structuredClone(excluded),
      filters: { ...filters },
      results: r,
      rules: RULES,
      report: true,
      timingSnapshot: structuredClone({ drivers: chosen, ...sessionMeta }),
    };
    setHistory((h) => [a, ...h]);
    setNotice("Analysis saved to your session history");
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>(".search input")?.focus();
        return;
      }
      if (
        ["INPUT", "SELECT", "TEXTAREA"].includes(
          (e.target as HTMLElement).tagName,
        )
      )
        return;
      if (!e.repeat && isShiftShortcut(e)) {
        setExcludeMode(false);
        e.preventDefault();
        setShiftMode((v) => !v);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        calculate();
      }
      if (shiftMode && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setShifts((s) => ({
          ...s,
          [active]: (s[active] || 0) + (e.key === "ArrowLeft" ? -1 : 1),
        }));
        setResults([]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
    if (selected.includes(id) && active === id) {
      setActive(selected.find((x) => x !== id) || "");
      setShiftMode(false);
    }
    if (!selected.includes(id) && !selected.length) setActive(id);
    setResults([]);
  }
  function point(id: string, lap: number, right: boolean) {
    if (right) {
      const next = {
        ...excluded,
        [id]: toggleExclusion(excluded[id] || [], lap),
      };
      setExcluded(next);
      setResults(
        analyze(drivers, {
          driverIds: selected,
          interval,
          exclusions: next,
          filters,
        }),
      );
      return;
    }
    if (shiftMode) return;
    setActive(id);
    if (anchor === null) {
      setAnchor(lap);
      setInterval([lap, lap]);
    } else {
      setInterval(intervalFromPoints(anchor, lap));
      setAnchor(null);
    }
    setResults([]);
  }
  const maxLap = Math.max(
    1,
    ...drivers.flatMap((d) => d.laps.map((l) => l.number)),
  );
  const sectorCount = Math.max(
    1,
    ...drivers.flatMap((d) => d.laps.map((l) => l.sectors.length)),
  );
  const plotTimes = chosen.flatMap((d) =>
    d.laps.filter((l) => l.time !== null).map((l) => l.time!),
  );
  const yMin = plotTimes.length ? Math.floor(Math.min(...plotTimes)) - 0.2 : 0;
  const yMax = plotTimes.length ? Math.ceil(Math.max(...plotTimes)) + 0.2 : 1;
  const activeDriver = drivers.find((d) => d.id === active);
  function nudgeShift(amount: number) {
    setShifts((s) => ({ ...s, [active]: (s[active] || 0) + amount }));
  }
  const chartMin = Math.min(0, ...Object.values(shifts));
  const chartMax = Math.max(
    maxLap + 1,
    ...Object.values(shifts).map((s) => maxLap + 1 + s),
  );
  const chartRows = Array.from({ length: chartMax - chartMin + 1 }, (_, i) => {
    const x = i + chartMin;
    const row: Record<string, number | null> = { lap: x };
    chosen.forEach((d) => {
      row[d.id] =
        d.laps.find((l) => l.number + (shifts[d.id] || 0) === x)?.time ?? null;
    });
    return row;
  });
  async function report() {
    const entries = history.filter((a) => a.report);
    if (!entries.length) {
      setNotice("Save an analysis and include it in the report first");
      return;
    }
    try {
      const { exportReport } = await import("./engine/report");
      await exportReport(entries, drivers);
      setNotice("Daily engineering report exported");
    } catch {
      setNotice("Report export failed. Please try again.");
    }
  }
  function load(a: Analysis) {
    if (a.timingSnapshot) {
      setLiveUrl("");
      applySnapshot(a.timingSnapshot);
    }
    setSelected(a.drivers);
    setActive(a.drivers[0] || "FOR");
    setInterval(a.interval);
    setShifts(a.shifts);
    setExcluded(a.excluded);
    setFilters(a.filters);
    setResults(a.results);
    setTab("Timing dashboard");
  }
  const latestBest = (d: Driver) =>
    Math.min(...d.laps.filter((l) => l.status === "valid").map((l) => l.time!));
  return (
    <div className="app">
      <aside className="rail">
        <div className="brand-mark">
          <Flag size={23} />
        </div>
        <button
          className={tab === "Timing dashboard" ? "rail-active" : ""}
          onClick={() => setTab("Timing dashboard")}
          title="Timing dashboard"
        >
          <ChartNoAxesCombined />
        </button>
        <button
          onClick={() => setTab("Analysis history")}
          title="Analysis history"
        >
          <Layers />
        </button>
        <button onClick={() => setTab("Daily report")} title="Daily report">
          <FileText />
        </button>
        <div className="rail-bottom">
          <span className="connection" />
          <button
            onClick={() => setConnectionOpen(true)}
            title="Timing connection settings"
          >
            <Settings size={20} />
          </button>
          <div className="avatar">RE</div>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <div className="wordmark">
            RACE<span>ENGINEER</span>
            <small>RACE INTELLIGENCE, IN REAL TIME.</small>
          </div>
          <div className="session-select">
            <span className="f3">RE</span>
            <div>
              {sessionMeta.category} <ChevronDown size={13} />
              <small>
                ALL CATEGORIES <span> / </span> TIMING & ANALYSIS
              </small>
            </div>
          </div>
          <div className="header-right">
            <span className="sim">
              <i />{" "}
              {liveUrl
                ? feedError
                  ? "FEED STALE"
                  : "LIVE JSON FEED"
                : "SIMULATED SESSION"}
            </span>
            <div className="avatar">NM</div>
          </div>
        </header>
        <div className="page-top">
          <div>
            <div className="eyebrow">
              WORKSPACE <span>/</span> {sessionMeta.track.toUpperCase()}
            </div>
            <h1>{tab}</h1>
            <p>Every lap. Every sector. The complete picture.</p>
          </div>
          <div className="page-actions">
            <button className="outline" onClick={() => setConnectionOpen(true)}>
              <Radio size={15} /> Timing connection
            </button>
            <button className="outline" onClick={report}>
              <Download size={15} /> Export report <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
        <div className="session-bar">
          <div className="track-icon">⌁</div>
          <div>
            <strong>{sessionMeta.track}</strong>
            <small>
              {sessionMeta.category} <span>·</span>{" "}
              {liveUrl ? "External timing feed" : "Demonstration data"}
            </small>
          </div>
          <div className="session-divider" />
          <div>
            <span className="session-label">SESSION</span>
            <strong>
              {sessionMeta.session} <ChevronDown size={12} />
            </strong>
          </div>
          {!liveUrl && (
            <>
              <div className="session-divider" />
              <div>
                <span className="session-label">DEMO TIME REMAINING</span>
                <strong className="mono">
                  12:48 <span className="live-dot" />
                </strong>
              </div>
              <div className="weather">
                <span>☀</span>
                <div>
                  <strong>
                    24°C <small>AIR</small>
                  </strong>
                  <strong>
                    32°C <small>TRACK</small>
                  </strong>
                </div>
                <span className="dry">DRY</span>
              </div>
              <span className="track-status">
                <i /> DEMO TRACK CLEAR
              </span>
            </>
          )}
        </div>
        {feedError && (
          <p role="status" className="feed-error">
            {feedError}
          </p>
        )}
        {tab !== "Timing dashboard" ? (
          <section className="history panel">
            <div className="panel-title">
              <h2>{tab}</h2>
              <span>{history.length} saved analyses</span>
            </div>
            <p className="muted">
              Saved selections preserve calculation rules, filters, original lap
              intervals, exclusions and display shifts.
            </p>
            {!history.length ? (
              <div className="empty">
                <Bookmark />
                <h3>Your engineering notebook starts here</h3>
                <p>
                  Select drivers and a lap interval, then save your analysis
                  from the dashboard.
                </p>
                <button
                  className="primary"
                  onClick={() => setTab("Timing dashboard")}
                >
                  Open timing dashboard
                </button>
              </div>
            ) : (
              history.map((a) => (
                <div className="history-row" key={a.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={a.report}
                      onChange={() =>
                        setHistory((h) =>
                          h.map((x) =>
                            x.id === a.id ? { ...x, report: !x.report } : x,
                          ),
                        )
                      }
                    />{" "}
                    Include in report
                  </label>
                  <div>
                    <strong>{a.title}</strong>
                    <small>
                      {new Date(a.created).toLocaleString()} · Laps{" "}
                      {a.interval.join("–")}
                    </small>
                  </div>
                  <span>
                    {a.results
                      .map((r) => `${r.id} ${formatTime(r.mean)}`)
                      .join(" / ")}
                  </span>
                  <button className="outline" onClick={() => load(a)}>
                    Restore
                  </button>
                  <button
                    className="icon-button"
                    onClick={() =>
                      setHistory((h) => h.filter((x) => x.id !== a.id))
                    }
                    title="Delete analysis"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
            <button className="primary" onClick={report}>
              <Download size={14} /> Generate daily PDF
            </button>
          </section>
        ) : (
          <>
            <div className="dashboard-grid">
              <section className="panel classification">
                <div className="panel-title">
                  <h2>
                    <span className="tiny-square" /> Live classification
                  </h2>
                  <span className="live-badge">
                    <i /> SESSION SNAPSHOT
                  </span>
                  <button
                    className="icon-button"
                    title="Timing info"
                    onClick={() =>
                      setNotice(
                        "Deterministic simulated F3 practice data · 22 laps per driver",
                      )
                    }
                  >
                    <SlidersHorizontal size={14} />
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>POS</th>
                        <th>NO.</th>
                        <th>DRIVER / TEAM</th>
                        <th>BEST LAP</th>
                        <th>LAST LAP</th>
                        <th>GAP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...drivers]
                        .sort((a, b) => latestBest(a) - latestBest(b))
                        .map((d, i) => (
                          <tr
                            key={d.id}
                            className={
                              selected.includes(d.id) ? "selected-row" : ""
                            }
                            onClick={() => {
                              setActive(d.id);
                              if (!selected.includes(d.id)) toggle(d.id);
                            }}
                          >
                            <td>
                              <span
                                className={
                                  "position " + (i === 0 ? "first" : "")
                                }
                              >
                                {i + 1}
                              </span>
                            </td>
                            <td className="car">
                              {d.number.toString().padStart(2, "0")}
                            </td>
                            <td>
                              <div className="driver-cell">
                                <i style={{ background: d.color }} />
                                <div>
                                  <strong>{d.name}</strong>
                                  <small>{d.team}</small>
                                </div>
                              </div>
                            </td>
                            <td className={"mono " + (i === 0 ? "purple" : "")}>
                              {formatTime(latestBest(d))}
                            </td>
                            <td className="mono">
                              {formatTime(d.laps.at(-1)!.time)}
                              <sup className="lap-status">
                                {d.laps.at(-1)!.status.toUpperCase()}
                              </sup>
                            </td>
                            <td
                              className={"mono " + (i === 0 ? "lime" : "muted")}
                            >
                              {i === 0
                                ? "LEADER"
                                : Number.isFinite(latestBest(d))
                                  ? `+${(latestBest(d) - Math.min(...drivers.map(latestBest))).toFixed(3)}`
                                  : "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="panel-footer">
                  <span>
                    <i className="green-dot" /> {drivers.length} drivers in
                    session
                  </span>
                  <span>
                    Up to {maxLap} laps recorded <Clock3 size={12} />
                  </span>
                </div>
              </section>
              <section className="panel sectors">
                <div className="panel-title">
                  <h2>Lap & sector times</h2>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                  >
                    <option>Latest lap</option>
                    <option>Best lap</option>
                    <option>Theoretical best</option>
                    {Array.from({ length: maxLap }, (_, i) => (
                      <option key={i}>Lap {i + 1}</option>
                    ))}
                  </select>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>NO.</th>
                        <th>DRIVER</th>
                        <th>LAP</th>
                        {Array.from({ length: sectorCount }, (_, i) => (
                          <th key={i}>SECTOR {i + 1}</th>
                        ))}
                        <th>LAP TIME</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...drivers]
                        .sort((a, b) => a.number - b.number)
                        .map((d) => {
                          const lap =
                            sector === "Best lap"
                              ? d.laps.reduce(
                                  (a, b) =>
                                    b.status === "valid" &&
                                    b.time !== null &&
                                    b.time <
                                      (a.status === "valid"
                                        ? (a.time ?? Infinity)
                                        : Infinity)
                                      ? b
                                      : a,
                                  d.laps[0],
                                )
                              : sector.startsWith("Lap ")
                                ? (d.laps.find(
                                    (l) => l.number === Number(sector.slice(4)),
                                  ) ?? {
                                    number: Number(sector.slice(4)),
                                    time: null,
                                    sectors: Array(sectorCount).fill(0),
                                    status: "incomplete",
                                  })
                                : d.laps.at(-1)!;
                          const sectors =
                            sector === "Theoretical best"
                              ? Array.from(
                                  { length: sectorCount },
                                  (_, i) => i,
                                ).map((i) =>
                                  Math.min(
                                    ...d.laps
                                      .filter((l) => l.status === "valid")
                                      .map((l) => l.sectors[i]),
                                  ),
                                )
                              : lap.sectors;
                          return (
                            <tr key={d.id}>
                              <td className="car">
                                {d.number.toString().padStart(2, "0")}
                              </td>
                              <td>
                                <span
                                  className="driver-abbr"
                                  style={{ borderColor: d.color }}
                                >
                                  {d.short}
                                </span>
                              </td>
                              <td className="muted mono">
                                {sector === "Theoretical best"
                                  ? "Σ"
                                  : lap.number}
                                {sector !== "Theoretical best" &&
                                  lap.status !== "valid" && (
                                    <sup className="lap-status">
                                      {lap.status.toUpperCase()}
                                    </sup>
                                  )}
                              </td>
                              {sectors.map((s, i) => (
                                <td
                                  key={i}
                                  className={
                                    "mono " +
                                    (s ===
                                    Math.min(
                                      ...drivers.flatMap((x) =>
                                        x.laps
                                          .filter((l) => l.status === "valid")
                                          .map((l) => l.sectors[i]),
                                      ),
                                    )
                                      ? "purple"
                                      : s ===
                                          Math.min(
                                            ...d.laps
                                              .filter(
                                                (l) => l.status === "valid",
                                              )
                                              .map((l) => l.sectors[i]),
                                          )
                                        ? "lime"
                                        : "")
                                  }
                                >
                                  {s > 0 ? s.toFixed(3) : "—"}
                                </td>
                              ))}
                              <td className="mono strong">
                                {formatTime(
                                  sector === "Theoretical best"
                                    ? theoretical(d.laps)
                                    : lap.time,
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <div className="panel-footer">
                  <span>
                    <i className="legend-dot purple-bg" /> Session best{" "}
                    <i className="legend-dot lime-bg" /> Personal best
                  </span>
                  <button
                    onClick={() =>
                      setNotice(
                        "Original dataset: 22 laps per driver, including in / out / invalid / incomplete laps",
                      )
                    }
                  >
                    Timing details <ArrowUpRight size={11} />
                  </button>
                </div>
              </section>
              <section className="panel driver-panel">
                <div className="panel-title">
                  <h2>
                    Driver comparison{" "}
                    <span className="count">{selected.length}</span>
                  </h2>
                  <button
                    className="text-button"
                    onClick={() => {
                      setSelected([]);
                      setResults([]);
                    }}
                  >
                    Clear all
                  </button>
                </div>
                <div className="search">
                  <Search size={15} />
                  <input
                    placeholder="Search driver, number or team…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <kbd>⌘ K</kbd>
                </div>
                <div className="driver-list">
                  {drivers
                    .filter((d) =>
                      `${d.name} ${d.number} ${d.team}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((d) => (
                      <div
                        className={
                          "driver-option " +
                          (selected.includes(d.id) ? "checked" : "")
                        }
                        key={d.id}
                      >
                        <button
                          className="driver-check"
                          onClick={() => toggle(d.id)}
                          aria-label={`Compare ${d.name}`}
                        >
                          <span
                            className="checkbox"
                            style={
                              selected.includes(d.id)
                                ? { background: d.color, borderColor: d.color }
                                : undefined
                            }
                          >
                            {selected.includes(d.id) && <Check size={12} />}
                          </span>
                          <span className="number-tag">
                            {d.number.toString().padStart(2, "0")}
                          </span>
                          <div>
                            <strong>{d.name}</strong>
                            <small>{d.team}</small>
                          </div>
                        </button>
                        <span
                          className="color-line"
                          style={{ background: d.color }}
                        />
                        <button
                          className={
                            "focus-driver " + (active === d.id ? "focused" : "")
                          }
                          title={`Set ${d.name} as active driver`}
                          onClick={() => {
                            setActive(d.id);
                            if (!selected.includes(d.id)) toggle(d.id);
                          }}
                        >
                          {active === d.id ? "ACTIVE" : "SET"}
                        </button>
                      </div>
                    ))}
                </div>
                <div className="comparison-note">
                  <Layers size={15} />
                  <p>
                    Select multiple drivers to compare race pace.
                    <br />
                    <span>
                      Set an active driver to adjust their lap alignment.
                    </span>
                  </p>
                </div>
              </section>
              <section className="panel graph-panel">
                <div className="panel-title">
                  <h2>
                    Lap time comparison{" "}
                    <span className="subtle">/ RACE PACE</span>
                  </h2>
                  <button className="outline compact" onClick={save}>
                    <Plus size={13} /> Save analysis
                  </button>
                </div>
                <div className="graph-toolbar">
                  <div className="graph-legends">
                    {chosen.map((d) => (
                      <button
                        className={active === d.id ? "active-legend" : ""}
                        key={d.id}
                        onClick={() => setActive(d.id)}
                      >
                        <i style={{ background: d.color }} />
                        {d.short}
                        <span>
                          {shifts[d.id]
                            ? `${shifts[d.id] > 0 ? "+" : ""}${shifts[d.id]}`
                            : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="shift-tools">
                    <button
                      className={shiftMode ? "shift-on" : ""}
                      onClick={() => {
                        setShiftMode((s) => !s);
                        setExcludeMode(false);
                      }}
                    >
                      <MoveHorizontal size={13} /> Align runs{" "}
                      <kbd>⌥ / Alt S</kbd>
                    </button>
                    <button
                      title="Reset all shifts"
                      onClick={() => {
                        setShifts({});
                        setResults([]);
                      }}
                    >
                      <RotateCcw size={12} /> Reset
                    </button>
                  </div>
                </div>
                <div className="analysis-controls">
                  <label>
                    Active driver{" "}
                    <select
                      aria-label="Active driver"
                      value={active}
                      onChange={(e) => setActive(e.target.value)}
                    >
                      {chosen.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.number} · {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className={excludeMode ? "mode-active" : ""}
                    aria-pressed={excludeMode}
                    onClick={() => {
                      setExcludeMode((v) => !v);
                      setShiftMode(false);
                    }}
                  >
                    Exclude / restore laps
                  </button>
                  <span>Shift: {shifts[active] || 0} laps</span>
                  <button
                    disabled={!activeDriver || !selected.includes(active)}
                    aria-label="Shift active driver left"
                    onClick={() => nudgeShift(-1)}
                  >
                    ←
                  </button>
                  <button
                    disabled={!activeDriver || !selected.includes(active)}
                    aria-label="Shift active driver right"
                    onClick={() => nudgeShift(1)}
                  >
                    →
                  </button>
                </div>
                <div className="mode-hint">
                  {shiftMode
                    ? `Aligning ${active}: drag horizontally or use ← →. Option + S on Mac / Alt + S toggles alignment.`
                    : excludeMode
                      ? "Click any lap point to exclude it from the average. Click again to restore it. Averages update automatically."
                      : "Click two lap points for an interval. To remove laps, choose Exclude / restore laps or right-click a point."}
                </div>
                <div
                  className={"chart " + (shiftMode ? "shift-mode" : "")}
                  tabIndex={0}
                  onPointerDown={(e) => {
                    if (shiftMode) {
                      drag.current = {
                        x: e.clientX,
                        shift: shifts[active] || 0,
                      };
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }
                  }}
                  onPointerMove={(e) => {
                    if (drag.current && shiftMode) {
                      setShifts((s) => ({
                        ...s,
                        [active]:
                          drag.current!.shift +
                          Math.round((e.clientX - drag.current!.x) / 25),
                      }));
                      setResults([]);
                    }
                  }}
                  onPointerUp={() => {
                    drag.current = null;
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                  }}
                >
                  <div className="axis-caption">
                    LAP TIME <span>(s)</span>
                  </div>
                  {chosen.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartRows}
                        margin={{ top: 30, right: 22, left: -22, bottom: 4 }}
                      >
                        <CartesianGrid
                          stroke="#2b3038"
                          vertical={false}
                          strokeDasharray="3 5"
                        />
                        <XAxis
                          dataKey="lap"
                          type="number"
                          domain={["dataMin", "dataMax"]}
                          tick={{ fill: "#818792", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          tickCount={12}
                        />
                        <YAxis
                          domain={[yMin, yMax]}
                          allowDataOverflow
                          tick={{ fill: "#818792", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => formatTime(v).slice(0, -1)}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#20252d",
                            border: "1px solid #3d454f",
                            borderRadius: 6,
                            fontSize: 11,
                          }}
                          labelFormatter={(v) => `Display lap ${v}`}
                          formatter={(v: number) => formatTime(v)}
                        />
                        <ReferenceArea
                          x1={interval[0] + (shifts[active] || 0)}
                          x2={interval[1] + (shifts[active] || 0)}
                          fill="#a8ef57"
                          fillOpacity={0.035}
                          stroke="#a8ef57"
                          strokeOpacity={0.22}
                        />
                        {[...chosen]
                          .sort(
                            (a, b) =>
                              Number(a.id === active) - Number(b.id === active),
                          )
                          .map((d) => (
                            <Line
                              key={d.id}
                              dataKey={d.id}
                              type="linear"
                              stroke={d.color}
                              strokeWidth={1.8}
                              isAnimationActive={false}
                              connectNulls={false}
                              activeDot={false}
                              dot={(p: any) => {
                                const lap = p.payload.lap - (shifts[d.id] || 0);
                                if (
                                  p.payload[d.id] === null ||
                                  !d.laps.some((l) => l.number === lap)
                                )
                                  return <g key={p.key} />;
                                const ex = (excluded[d.id] || []).includes(lap);
                                return (
                                  <circle
                                    key={p.key}
                                    cx={p.cx}
                                    cy={p.cy}
                                    r={ex ? 4 : 3}
                                    data-driver={d.id}
                                    data-lap={lap}
                                    aria-label={`${d.short} lap ${lap}`}
                                    fill={ex ? "#ff646b" : "#191d23"}
                                    stroke={ex ? "#ff646b" : d.color}
                                    strokeWidth={1.7}
                                    style={{
                                      cursor: shiftMode
                                        ? "ew-resize"
                                        : "pointer",
                                    }}
                                    onClick={() =>
                                      point(d.id, lap, excludeMode)
                                    }
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      point(d.id, lap, true);
                                    }}
                                  >
                                    <title>
                                      {d.name} · lap {lap} ·{" "}
                                      {formatTime(p.payload[d.id])}
                                      {isAnomaly(d.laps, lap - 1)
                                        ? " · isolated anomaly"
                                        : ""}{" "}
                                      · {d.laps[lap - 1]?.status}
                                    </title>
                                  </circle>
                                );
                              }}
                            />
                          ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty">
                      <ChartNoAxesCombined />
                      <p>Select drivers to begin comparing laps</p>
                    </div>
                  )}
                  {results.length > 0 && (
                    <div className="average-overlay">
                      <span>
                        INTERVAL AVERAGE <small>L{interval.join("–L")}</small>
                      </span>
                      {results.map((r, i) => (
                        <div key={r.id}>
                          <i
                            style={{
                              background: drivers.find((d) => d.id === r.id)
                                ?.color,
                            }}
                          />
                          <strong>{r.id}</strong>
                          <b>{formatTime(r.mean)}</b>
                          <small>{r.count} laps</small>
                          {i > 0 &&
                            r.mean !== null &&
                            results[0].mean !== null && (
                              <em>
                                {r.mean - results[0].mean >= 0 ? "+" : ""}
                                {(r.mean - results[0].mean).toFixed(3)}
                              </em>
                            )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="interval-bar">
                  <span className="interval-label">
                    <span className="selection-icon">↔</span> LAP INTERVAL{" "}
                    <strong>
                      {interval[0].toString().padStart(2, "0")} —{" "}
                      {interval[1].toString().padStart(2, "0")}
                    </strong>
                  </span>
                  <span className="interval-state">
                    {anchor !== null
                      ? "Click a second lap point"
                      : `${interval[1] - interval[0] + 1} laps selected`}
                  </span>
                  <button className="calculate" onClick={calculate}>
                    Calculate average <kbd>↵</kbd>
                  </button>
                </div>
                <div className="filters">
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.special}
                      onChange={(e) => {
                        setFilters((f) => ({
                          ...f,
                          special: e.target.checked,
                        }));
                        setResults([]);
                      }}
                    />{" "}
                    Exclude in / out & invalid laps
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.anomalies}
                      onChange={(e) => {
                        setFilters((f) => ({
                          ...f,
                          anomalies: e.target.checked,
                        }));
                        setResults([]);
                      }}
                    />{" "}
                    Filter anomalies <span>≥ 0.800s</span>
                  </label>
                  <span className="excluded-count">
                    <i /> {Object.values(excluded).flat().length} manually
                    excluded
                  </span>
                </div>
                <details className="lap-review">
                  <summary>
                    Review included laps ·{" "}
                    {activeDriver?.name || "select a driver"} · original laps{" "}
                    {interval.join("–")}
                  </summary>
                  <div className="lap-chips">
                    {activeDriver?.laps
                      .filter(
                        (l) =>
                          l.number >= interval[0] && l.number <= interval[1],
                      )
                      .map((l) => {
                        const manual = (excluded[active] || []).includes(
                          l.number,
                        );
                        const included = eligibleForReview(
                          activeDriver,
                          l.number,
                        );
                        return (
                          <button
                            key={l.number}
                            className={
                              manual
                                ? "lap-excluded"
                                : included
                                  ? "lap-included"
                                  : "lap-filtered"
                            }
                            onClick={() => point(active, l.number, true)}
                            aria-pressed={manual}
                            title={`${l.status}${isAnomaly(activeDriver.laps, activeDriver.laps.indexOf(l)) ? " · anomaly" : ""}${manual ? " · manually excluded" : included ? " · included" : " · filtered by rules"}`}
                          >
                            <span>L{l.number}</span>
                            {formatTime(l.time)}{" "}
                            <small>
                              {manual
                                ? "Excluded · restore"
                                : included
                                  ? "Included · exclude"
                                  : "Filtered by rules"}
                            </small>
                          </button>
                        );
                      })}
                  </div>
                </details>
                <div className="graph-help">
                  <span>Click two points to select an interval</span>
                  <b>·</b>
                  <span>Right-click a point to exclude / restore</span>
                  <b>·</b>
                  <span>
                    {shiftMode
                      ? `Shift ${active}: drag or use ← →`
                      : "Option / Alt + S to align runs"}
                  </span>
                </div>
              </section>
            </div>
            <div className="bottom-strip">
              <span>
                <Bookmark size={14} /> Your insights, ready for the debrief.
                <small>{history.length} analyses saved in this session</small>
              </span>
              <button onClick={() => setTab("Analysis history")}>
                Open analysis history <ArrowUpRight size={14} />
              </button>
            </div>
          </>
        )}
        <footer>
          <span>
            <i className="green-dot" />{" "}
            {liveUrl ? "EXTERNAL JSON PROVIDER" : "MOCK TIMING PROVIDER"}{" "}
            <b>·</b> Original timing data preserved
          </span>
          <span>
            RACE ENGINEER <b> / </b> ENGINEERED FOR THE EDGE.
          </span>
          <span>
            UTC {new Date().toISOString().slice(11, 16)} <Activity size={12} />
          </span>
        </footer>
      </div>
      {connectionOpen && (
        <ConnectionSettings
          url={sourceUrl}
          category={sessionMeta.category}
          live={!!liveUrl}
          onClose={() => setConnectionOpen(false)}
          onCategory={(category) => {
            setSessionMeta((m) => ({ ...m, category }));
            setNotice("Category label updated");
          }}
          onConnect={connect}
          onDemo={useDemo}
          onSaveUrl={saveUrl}
        />
      )}
      {notice && (
        <div role="status" className="toast">
          <Check size={16} />
          {notice}
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
