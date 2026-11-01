import type { Driver, Lap, LapStatus } from "../engine/timing";
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

// Seeded randomness keeps the test session repeatable.
function randomSequence(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createLaps(driverIndex: number): Lap[] {
  const random = randomSequence(20261101 + driverIndex * 97);
  const laps: Lap[] = [];

  const offset = driverIndex % 4;

  const pushStart = 2 + offset;
  const pushEnd = pushStart + 2;

  const pitIn = pushEnd + 1;
  const pitOut = pitIn + 1;

  const longStart = pitOut + 1;
  const longEnd = longStart + 20;

  const finalIn = longEnd + 1;

  const longPace = 96.0 + driverIndex * 0.11;
  const pushPace = longPace - 2.0;

  // Two isolated interruptions at different points in each long run.
  const firstSlowLap = 2 + (driverIndex % 5);
  const secondSlowLap = 14 + (driverIndex % 5);

  for (let number = 1; number <= finalIn; number++) {
    let status: LapStatus = "valid";
    let time: number;

    const variation = (random() - 0.5) * 0.18;

    if (number === 1) {
      // Initial out-lap.
      status = "out";
      time = longPace + 9.0 + random() * 0.6;
    } else if (number < pushStart) {
      // Different warm-up lengths stagger the performance runs.
      time = longPace + 1.0 + variation;
    } else if (number <= pushEnd) {
      // Exactly three performance laps.
      const pushLap = number - pushStart;
      time = pushPace - pushLap * 0.04 + variation;
    } else if (number === pitIn) {
      status = "in";
      time = longPace + 5.0 + random() * 0.4;
    } else if (number === pitOut) {
      // Fresh out-lap after the pit stop.
      status = "out";
      time = longPace + 9.5 + random() * 0.6;
    } else if (number <= longEnd) {
      // Exactly 21 consecutive long-run laps.
      const runLap = number - longStart + 1;

      // Small, gradual tyre degradation.
      const degradation = (runLap - 1) * 0.025;
      time = longPace + degradation + variation;

      // Occasional traffic / mistakes, isolated from one another.
      if (runLap === firstSlowLap) {
        time += 1.35 + random() * 0.35;
      }

      if (runLap === secondSlowLap) {
        time += 1.7 + random() * 0.4;
      }

      // One track-limits example, retaining its original lap time.
      if (driverIndex === 1 && number === 11) {
        status = "invalid";
      }
    } else {
      status = "in";
      time = longPace + 5.5 + random() * 0.4;
    }

    // Sector variations sum exactly to the original lap time.
    const sectorVariation1 = (random() - 0.5) * 0.15;
    const sectorVariation2 = (random() - 0.5) * 0.15;

    const sector1 = time * 0.319 + sectorVariation1;
    const sector2 = time * 0.391 + sectorVariation2;
    const sector3 = time - sector1 - sector2;

    laps.push({
      number,
      time,
      sectors: [sector1, sector2, sector3],
      status,
    });
  }

  return laps;
}

export const drivers: Driver[] = roster.map(
  ([number, name, short, team, color], index) => ({
    id: short,
    number,
    name,
    short,
    team,
    color,
    laps: createLaps(index),
  }),
);

export class MockTimingProvider implements TimingProvider {
  async getSnapshot() {
    return {
      drivers,
      category: "Motorsport · simulated test",
      session: "Performance runs + long runs",
      track: "Autodromo Nazionale Monza",
    };
  }
}
