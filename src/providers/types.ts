import type { Driver } from "../engine/timing";
export interface TimingSnapshot {
  drivers: Driver[];
  session: string;
  track: string;
  category: string;
}
export interface TimingProvider {
  getSnapshot(signal?: AbortSignal): Promise<TimingSnapshot>;
}
