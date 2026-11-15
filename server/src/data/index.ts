import type { Dataset } from "../types.ts";
import { Engine } from "../engine/predict.ts";
import { buildDemoDataset } from "./demo.ts";
import { fetchFootballData } from "./footballData.ts";

const TTL_MS = 30 * 60 * 1000;
let current: { engine: Engine; loadedAt: number; warning?: string } | null = null;
let loading: Promise<Engine> | null = null;

async function loadDataset(): Promise<{ data: Dataset; warning?: string }> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (key) {
    try {
      const data = await fetchFootballData(key, process.env.FOOTBALL_DATA_COMPETITION || "PL");
      if (data.matches.some((m) => m.status === "finished")) return { data };
      throw new Error("no finished matches returned");
    } catch (err) {
      console.error("[data] live provider failed, using demo league:", (err as Error).message);
      return { data: buildDemoDataset(), warning: "Live data unavailable — showing demo league." };
    }
  }
  return { data: buildDemoDataset() };
}

export async function getEngine(): Promise<Engine> {
  if (current && Date.now() - current.loadedAt < TTL_MS) return current.engine;
  loading ??= loadDataset()
    .then(({ data, warning }) => {
      const engine = new Engine(data);
      current = { engine, loadedAt: Date.now(), warning };
      return engine;
    })
    .finally(() => (loading = null));
  return loading;
}

export const dataWarning = () => current?.warning;
