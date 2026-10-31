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
import { MockTimingProvider } from "./providers/mock";
import {
  formatTime,
  average,
  eligible,
  theoretical,
  isAnomaly,
  intervalFromPoints,
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
    new MockTimingProvider().getSnapshot().then((s) => setDrivers(s.drivers));
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
      if (e.altKey && e.key.toLowerCase() === "s") {
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
    setResults([]);
  }
  function point(id: string, lap: number, right: boolean) {
    if (right) {
      setExcluded((e) => {
        const a = e[id] || [];
        return {
          ...e,
          [id]: a.includes(lap) ? a.filter((n) => n !== lap) : [...a, lap],
        };
      });
      setResults([]);
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
  const chartMin = Math.min(0, ...Object.values(shifts));
  const chartMax = Math.max(24, ...Object.values(shifts).map((s) => 24 + s));
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
            onClick={() =>
              setNotice(
                "Mock provider active · no external connection required",
              )
            }
            title="Provider status"
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
            <span className="f3">F3</span>
            <div>
              FIA Formula 3 Championship <ChevronDown size={13} />
              <small>
                2025 SEASON <span> / </span> ROUND 10
              </small>
            </div>
          </div>
          <div className="header-right">
            <span className="sim">
              <i /> SIMULATED SESSION
            </span>
            <div className="avatar">NM</div>
          </div>
        </header>
        <div className="page-top">
          <div>
            <div className="eyebrow">
              WORKSPACE <span>/</span> MONZA
            </div>
            <h1>{tab}</h1>
            <p>Every lap. Every sector. The complete picture.</p>
          </div>
          <button className="outline" onClick={report}>
            <Download size={15} /> Export report <ArrowUpRight size={13} />
          </button>
        </div>
        <div className="session-bar">
          <div className="track-icon">⌁</div>
          <div>
            <strong>MONZA</strong>
            <small>
              Autodromo Nazionale Monza <span>·</span> 5.793 km
            </small>
          </div>
          <div className="session-divider" />
          <div>
            <span className="session-label">SESSION</span>
            <strong>
              Practice 2 <ChevronDown size={12} />
            </strong>
          </div>
          <div className="session-divider" />
          <div>
            <span className="session-label">TIME REMAINING</span>
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
            <i /> TRACK CLEAR
          </span>
        </div>
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
                      {drivers.map((d, i) => (
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
                              className={"position " + (i === 0 ? "first" : "")}
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
                            {formatTime(d.laps[21].time)}
                            <sup className="lap-status">IN</sup>
                          </td>
                          <td
                            className={"mono " + (i === 0 ? "lime" : "muted")}
                          >
                            {i === 0
                              ? "LEADER"
                              : `+${(latestBest(d) - latestBest(drivers[0])).toFixed(3)}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="panel-footer">
                  <span>
                    <i className="green-dot" /> 12 drivers on track
                  </span>
                  <span>
                    22 laps completed <Clock3 size={12} />
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
                    {Array.from({ length: 22 }, (_, i) => (
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
                        <th>SECTOR 1</th>
                        <th>SECTOR 2</th>
                        <th>SECTOR 3</th>
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
                                    b.time! < (a.time ?? Infinity)
                                      ? b
                                      : a,
                                  d.laps[1],
                                )
                              : sector.startsWith("Lap ")
                                ? d.laps[Number(sector.slice(4)) - 1]
                                : d.laps[21];
                          const sectors =
                            sector === "Theoretical best"
                              ? [0, 1, 2].map((i) =>
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
                      onClick={() => setShiftMode((s) => !s)}
                    >
                      <MoveHorizontal size={13} /> Shift <kbd>Alt S</kbd>
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
                          domain={[95, 99]}
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
                                    onClick={() => point(d.id, lap, false)}
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
                <div className="graph-help">
                  <span>Click two points to select an interval</span>
                  <b>·</b>
                  <span>Right-click a point to exclude / restore</span>
                  <b>·</b>
                  <span>
                    {shiftMode
                      ? `Shift ${active}: drag or use ← →`
                      : "Alt + S to shift a driver"}
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
            <i className="green-dot" /> MOCK TIMING PROVIDER <b>·</b> Original
            timing data preserved
          </span>
          <span>
            RACE ENGINEER <b> / </b> ENGINEERED FOR THE EDGE.
          </span>
          <span>
            UTC {new Date().toISOString().slice(11, 16)} <Activity size={12} />
          </span>
        </footer>
      </div>
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
