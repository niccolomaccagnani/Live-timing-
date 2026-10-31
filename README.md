# Race Engineer

Professional Formula 3 timing and pace analysis dashboard. React 19, TypeScript, Vite, Recharts; local persistence and PDF reports.

## Develop

Use Node.js 22+ and npm. Run `npm ci`, then `npm run dev`. Run `npm test` for deterministic engine tests and `npm run build` for type checking and the production bundle.

## Architecture

- `src/providers/mock.ts`: deterministic simulated 12-driver, 22-lap dataset and async `TimingProvider` interface. Implement this interface to connect a real timing source. The current session is a simulation snapshot, not a real live feed.
- `src/engine/timing.ts`: pure eligibility, anomaly, interval, sector and average functions.
- `src/engine/analysis.ts`: serializable `AnalysisRequest` / `analyze` boundary for future API or agent tools.
- `src/main.tsx`: dashboard, interaction state, local analysis history and PDF export. Data ingestion and calculations are separate from rendering.

## Graph controls

Select drivers with the comparison checkboxes. Click a legend or SET to choose the active driver. Click two lap points for an inclusive original lap interval. Right-click a point to toggle manual exclusion (red). Enter calculates averages inside the chart. Alt+S toggles shift mode; drag horizontally or press left/right arrows to shift the active series. Reset restores all shifts. Shifts affect display coordinates only. Exclusions and eligibility never mutate original timing data. All averages use original lap numbers.

Special-lap filtering removes in, out, invalid and incomplete laps. Incomplete/non-finite times are always excluded. Isolated anomaly filtering removes a valid lap at least 0.800s slower than both immediately adjacent valid laps. Fewer than two comparable neighboring laps cannot establish an anomaly. Sector theoretical best is the sum of each fastest valid sector.

Save analysis records drivers, filters, shifts, interval, exclusions, averages, rules and timestamp in browser localStorage. Restore from history; choose which analyses enter the daily PDF. Reports contain saved-state charts, included counts, excluded lap numbers, pace differences, engineering conclusions and original timing values. Browser storage is local, not a multi-user backend. Fuel loads, traffic and track evolution are not normalized.

## Lap exclusions and run alignment (including Mac)

Choose **Exclude / restore laps** above the graph, then click a lap point. Excluded points turn red and averages update immediately. Click again to restore. Right-click also toggles exclusions. **Review included laps** provides individual lap buttons with rule-filtered versus manually excluded status.

Choose **Active driver**, then **Align runs**. On Mac the shortcut is **Option + S** (physical S key); elsewhere **Alt + S**. Drag horizontally or press arrow keys. The visible left/right buttons also shift a series without using a shortcut. Reset clears all display shifts. Original lap times and lap identities are preserved.

## Timing sources and any racing category

Open **Timing connection** at the top of the dashboard (or the gear icon). Paste the event URL into **Live timing URL**. **Save link** stores a URL only, without claiming a connection. **Connect JSON feed** verifies the endpoint before switching away from demo data. Verified feeds refresh every 10 seconds; failed updates explicitly show stale data. Reload starts in demo mode until a feed is connected again.

Current working external connector: normalized HTTP(S) JSON endpoints with browser access (CORS). A snapshot contains `category`, `session`, `track`, and `drivers`; see the example schema in connection settings. Lap times and sectors are seconds; sector counts and graph time ranges are dynamic. Incomplete lap times are null. Data is validated before it reaches the calculation engine.

Al Kamel, Perugia Timing, official Formula 3, and other public timing websites are **not automatically compatible**. Their event pages need separate adapters to their actual data feeds; some also require a backend proxy or authorized access. There is no universal timing-webpage connector in this build. Add each adapter behind `TimingProvider`. Never put credentials in event URLs.

Saved analyses now retain their original driver/lap snapshot and category/session metadata, so reports remain tied to the analyzed data after a source switch. Legacy saved analyses without a snapshot use the current data as before.
