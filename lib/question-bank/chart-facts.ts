import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

interface ChartSeries {
  name: string;
  values: Record<string, number>;
}

export interface CambridgeChartFacts {
  questionId: string;
  title: string;
  chartType: string;
  unit?: string;
  observedYears?: number[];
  projectedYears?: number[];
  series?: ChartSeries[];
  factNotes: string[];
  provenance?: {
    sourceImage: string;
    verification: string;
    verifiedAt: string;
  };
}

interface ChartFactsFile {
  version: number;
  facts: CambridgeChartFacts[];
}

const CHART_FACTS_FILE = path.join(
  process.cwd(),
  "data",
  "cambridge-chart-facts",
  "index.json",
);

/** Reads only facts that were manually checked against a local Cambridge chart. */
export async function getCambridgeChartFacts(questionId: string) {
  try {
    const content = await readFile(CHART_FACTS_FILE, "utf8");
    const file = JSON.parse(content) as ChartFactsFile;
    if (!Array.isArray(file.facts)) return null;
    return file.facts.find((fact) => fact.questionId === questionId) ?? null;
  } catch {
    return null;
  }
}

/** Formats local facts as canonical evidence for the writing assessor. */
export function formatChartFactsForAssessment(facts: CambridgeChartFacts) {
  const years = [...(facts.observedYears ?? []), ...(facts.projectedYears ?? [])];
  const rows = (facts.series ?? []).map((series) => (
    `${series.name}: ${years.map((year) => `${year}=${series.values[String(year)]}%`).join(", ")}`
  ));
  const timeRange = facts.observedYears?.length
    ? `Observed years: ${facts.observedYears.join(", ")}.${facts.projectedYears?.length ? ` Projected years: ${facts.projectedYears.join(", ")}.` : ""}`
    : "";

  return [
    "VERIFIED LOCAL CAMBRIDGE CHART FACTS — use these as the sole ground truth for factual accuracy; do not reinterpret the chart image.",
    `Chart: ${facts.title} (${facts.chartType})${facts.unit ? `; unit: ${facts.unit}` : ""}.`,
    timeRange,
    ...(rows.length ? ["Exact values:", ...rows] : []),
    "Canonical facts:",
    ...facts.factNotes.map((fact) => `- ${fact}`),
    "Assess Task Achievement against these facts. Do not penalise an essay merely for using sensible approximation language such as 'about' or 'roughly'.",
  ].join("\n");
}
