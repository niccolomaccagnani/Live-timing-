import { useState, useEffect } from "react";
import { Radio, X } from "lucide-react";
import type { TimingSnapshot } from "../providers/types";
import { JsonTimingProvider, validateTimingUrl } from "../providers/json";
interface Props {
  url: string;
  category: string;
  live: boolean;
  onClose: () => void;
  onCategory: (category: string) => void;
  onConnect: (url: string, snapshot: TimingSnapshot) => void;
  onDemo: () => void;
  onSaveUrl: (url: string) => void;
}
export function ConnectionSettings(p: Props) {
  const [url, setUrl] = useState(p.url),
    [category, setCategory] = useState(p.category),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") p.onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [p.onClose]);
  async function connect() {
    setError("");
    setBusy(true);
    try {
      const valid = validateTimingUrl(url);
      const data = await new JsonTimingProvider(valid).getSnapshot();
      p.onConnect(valid, data);
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Could not read this feed. Check the URL, network and provider browser access (CORS). A timing webpage may need a provider adapter."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="connection-title"
        className="connection-dialog"
      >
        <div className="panel-title">
          <h2 id="connection-title">
            <Radio size={17} /> Timing connection & category
          </h2>
          <button
            className="icon-button"
            aria-label="Close connection settings"
            onClick={p.onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="connection-body">
          <p>
            Race Engineer works with any racing category. The included Formula 3
            session is sample data.
          </p>
          <label>
            Category / championship
            <input
              value={category}
              placeholder="GT3, karting, touring cars, motorcycles…"
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
          <button
            className="outline"
            onClick={() => {
              if (category.trim()) p.onCategory(category.trim());
            }}
          >
            Apply category label
          </button>
          <label>
            Live timing URL
            <input
              type="url"
              autoFocus
              placeholder="https://your-provider.com/timing-feed.json"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <p>
            Paste your live timing link here. Connecting currently supports the
            documented JSON feed format. A public timing webpage needs a
            provider-specific adapter; saving its link does not connect it. Al
            Kamel, Perugia Timing and official Formula 3 webpage adapters are
            not implemented yet.
          </p>
          <div className="connection-actions">
            <button disabled={busy} className="primary" onClick={connect}>
              {busy ? "Checking feed…" : "Connect JSON feed"}
            </button>
            <button
              className="outline"
              onClick={() => {
                try {
                  const value = validateTimingUrl(url);
                  p.onSaveUrl(value);
                  setError(
                    "URL saved. It is not connected until a supported feed is verified.",
                  );
                } catch {
                  setError("Enter a valid HTTP(S) URL without credentials.");
                }
              }}
            >
              Save link
            </button>
            <button disabled={busy} className="outline" onClick={p.onDemo}>
              Use demo data
            </button>
          </div>
          <p className="connection-status" role="status">
            {error ||
              (p.live
                ? "Live JSON feed connected · refreshed every 10 seconds."
                : "Demo mode · no live timing connection.")}
          </p>
          <details>
            <summary>Supported JSON format</summary>
            <pre>
              {JSON.stringify(
                {
                  category: "GT3",
                  session: "Practice",
                  track: "Spa-Francorchamps",
                  drivers: [
                    {
                      id: "CAR7",
                      number: 7,
                      name: "Alex Driver",
                      short: "ALE",
                      team: "Example Racing",
                      color: "#a8ef57",
                      laps: [
                        {
                          number: 1,
                          time: 138.45,
                          sectors: [42.1, 55.2, 41.15],
                          status: "valid",
                        },
                      ],
                    },
                  ],
                },
                null,
                2,
              )}
            </pre>
            <p>
              Times are seconds. Status: valid, in, out, invalid or incomplete.
              Missing lap time: null, with incomplete status. The endpoint must
              allow browser requests. Never paste secret tokens into a URL.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
