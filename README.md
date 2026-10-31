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
