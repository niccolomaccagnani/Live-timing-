import type { Driver } from "../engine/timing";
import type { TimingProvider } from "./types";
const roster: [number, string, string, string, string][] = [
  [1, "Leonardo Fornaroli", "FOR", "Trident", "#a8ef57"],
  [4, "Gabriele Minì", "MIN", "PREMA Racing", "#b19cff"],
  [5, "Dino Beganovic", "BEG", "PREMA Racing", "#53b7ff"],
  [2, "Sami Meguetounif", "MEG", "Trident", "#ffa15c"],
  [7, "Luke Browning", "BRO", "Hitech Pulse-Eight", "#f0d46a"],
  [10, "Arvid Lindblad", "LIN", "PREMA Racing", "#f979a4"],
  [23, "Christian Mansell", "MAN", "ART Grand Prix", "#5ee1c0"],
  [3, "Santiago Ramos", "RAM", "Trident", "#7893ff"],
  [17, "Oliver Goethe", "GOE", "Campos Racing", "#ee9cdd"],
  [24, "Laurens van Hoepen", "VHO", "ART Grand Prix", "#a1b4c7"],
  [11, "Nikola Tsolov", "TSO", "ART Grand Prix", "#ed745e"],
  [6, "Sebastián Montoya", "MON", "Hitech Pulse-Eight", "#6fcddd"],
];
export const drivers: Driver[] = roster.map(
  ([number, name, short, team, color], i) => ({
    id: short,
    number,
    name,
    short,
    team,
    color,
    laps: Array.from({ length: 22 }, (_, j) => {
      const n = j + 1;
      const status =
        n === 1
          ? "out"
          : n === 22
            ? "in"
            : n === 11 && i === 1
              ? "invalid"
              : n === 9 && i === 4
                ? "incomplete"
                : "valid";
      const time =
        status === "incomplete"
          ? null
          : 95.65 +
            i * 0.115 +
            Math.sin(n * 1.63 + i) * 0.22 +
            (22 - n) * 0.041 +
            (n === 8 && i === 0 ? 1.35 : 0) +
            (status === "out" ? 5.3 : status === "in" ? 3.4 : 0);
      return {
        number: n,
        time,
        sectors:
          status === "incomplete"
            ? [30.4, 0, 0]
            : [
                (time ?? 97) * 0.319 + Math.sin(n + i) * 0.09,
                (time ?? 97) * 0.391 + Math.cos(n * 0.8 + i) * 0.11,
                (time ?? 97) * 0.29 -
                  Math.sin(n + i) * 0.09 -
                  Math.cos(n * 0.8 + i) * 0.11,
              ],
        status,
      };
    }),
  }),
);
export class MockTimingProvider implements TimingProvider {
  async getSnapshot() {
    return {
      drivers,
      session: "Practice 2",
      track: "Autodromo Nazionale Monza",
      category: "Formula 3 · demo",
    };
  }
}
