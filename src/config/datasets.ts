/**
 * Dataset registry. Every value here was verified against datos.gov.co on 2026-09-29
 * (catalog API + /api/views/<id>.json). See docs/DECISIONS.md, entry "Datasets".
 */

export interface ColumnSpec {
  field: string;
  type: "text" | "number" | "calendar_date";
  label: string;
  description: string;
}

export interface DatasetSpec {
  /** URL slug used by our routes. */
  slug: string;
  /** Socrata four-by-four id. */
  id: string;
  title: string;
  summary: string;
  measure: string;
  unit: string;
  /** How the measure should be aggregated per month (rain adds up, temperature averages). */
  monthlyAggregate: "sum" | "avg";
  sourceUrl: string;
  license: { name: string; url: string };
  attribution: string;
  columns: ColumnSpec[];
  /** Preset questions for the explorer (SQL runs against table `data`). */
  presets: { id: string; question: string; sql: string }[];
}

const IDEAM_ATTRIBUTION =
  "Instituto de Hidrología, Meteorología y Estudios Ambientales (IDEAM), through Datos Abiertos Colombia.";

const CC_BY_SA = {
  name: "Creative Commons Attribution-ShareAlike 4.0 International",
  url: "https://creativecommons.org/licenses/by-sa/4.0/legalcode",
};

const telemetryColumns = (measureLabel: string, measureDescription: string): ColumnSpec[] => [
  {
    field: "codigoestacion",
    type: "text",
    label: "Station code",
    description: "IDEAM identifier of the weather station.",
  },
  {
    field: "codigosensor",
    type: "text",
    label: "Sensor code",
    description: "Identifier of the sensor that took the reading.",
  },
  {
    field: "fechaobservacion",
    type: "calendar_date",
    label: "Observation time",
    description: "Local date and time of the reading (Colombia, UTC−5), without an offset.",
  },
  {
    field: "valorobservado",
    type: "number",
    label: measureLabel,
    description: measureDescription,
  },
  {
    field: "nombreestacion",
    type: "text",
    label: "Station name",
    description: "Station name. The suffix “AUT” marks automatic stations.",
  },
  {
    field: "departamento",
    type: "text",
    label: "Department",
    description:
      "Department (first-level region). Spelling is not consistent upstream: the same department appears with and without accents and in different letter case.",
  },
  { field: "municipio", type: "text", label: "Municipality", description: "Municipality name." },
  {
    field: "zonahidrografica",
    type: "text",
    label: "Hydrographic zone",
    description: "River basin zone the station belongs to.",
  },
  { field: "latitud", type: "number", label: "Latitude", description: "Decimal degrees." },
  { field: "longitud", type: "number", label: "Longitude", description: "Decimal degrees." },
  {
    field: "descripcionsensor",
    type: "text",
    label: "Sensor description",
    description: "What the sensor measures, in Spanish.",
  },
  { field: "unidadmedida", type: "text", label: "Unit", description: "Unit of the reading." },
];

export const datasets: DatasetSpec[] = [
  {
    slug: "precipitation",
    id: "s54a-sgyg",
    title: "Precipitation",
    summary:
      "Rainfall readings from IDEAM automatic stations across Colombia, usually every ten minutes to one hour.",
    measure: "rainfall",
    unit: "mm",
    monthlyAggregate: "sum",
    sourceUrl: "https://www.datos.gov.co/d/s54a-sgyg",
    license: CC_BY_SA,
    attribution: IDEAM_ATTRIBUTION,
    columns: telemetryColumns(
      "Rainfall",
      "Rain that fell since the previous reading, in millimetres.",
    ),
    presets: [
      {
        id: "wettest-days",
        question: "Which days were wettest this month?",
        sql: "SELECT strftime(date_trunc('day', observed_at), '%d %b') AS day,\n       round(sum(value) / count(DISTINCT station_code), 1) AS mm_per_station\nFROM data\nGROUP BY date_trunc('day', observed_at)\nORDER BY date_trunc('day', observed_at);",
      },
      {
        id: "top-stations",
        question: "Which stations recorded the most rain?",
        sql: "SELECT station, department, round(sum(value), 1) AS rainfall_mm\nFROM data\nGROUP BY station, department\nORDER BY rainfall_mm DESC\nLIMIT 20;",
      },
      {
        id: "by-department",
        question: "How much rain fell in each department?",
        sql: "SELECT department, round(sum(value), 1) AS rainfall_mm, count(DISTINCT station) AS stations\nFROM data\nGROUP BY department\nORDER BY rainfall_mm DESC;",
      },
      {
        id: "rainy-hours",
        question: "At what time of day does it rain most?",
        sql: "SELECT hour(observed_at) AS hour, round(sum(value), 1) AS rainfall_mm\nFROM data\nGROUP BY hour\nORDER BY hour;",
      },
    ],
  },
  {
    slug: "air-temperature",
    id: "sbwg-7ju4",
    title: "Air temperature",
    summary: "Air temperature readings from IDEAM automatic stations across Colombia.",
    measure: "air temperature",
    unit: "°C",
    monthlyAggregate: "avg",
    sourceUrl: "https://www.datos.gov.co/d/sbwg-7ju4",
    license: CC_BY_SA,
    attribution: IDEAM_ATTRIBUTION,
    columns: telemetryColumns("Air temperature", "Air temperature at the station, in °C."),
    presets: [
      {
        id: "monthly-mean",
        question: "How does average temperature change through the year?",
        sql: "SELECT month(observed_at) AS month, round(avg(value), 2) AS mean_c\nFROM data\nGROUP BY month\nORDER BY month;",
      },
      {
        id: "warmest-departments",
        question: "Which departments are warmest?",
        sql: "SELECT department, round(avg(value), 2) AS mean_c\nFROM data\nGROUP BY department\nORDER BY mean_c DESC;",
      },
      {
        id: "extremes",
        question: "Which stations saw the highest readings?",
        sql: "SELECT station, department, max(value) AS max_c\nFROM data\nGROUP BY station, department\nORDER BY max_c DESC\nLIMIT 20;",
      },
    ],
  },
];

export function getDataset(slug: string): DatasetSpec | undefined {
  return datasets.find((d) => d.slug === slug);
}

export function getDatasetById(id: string): DatasetSpec | undefined {
  return datasets.find((d) => d.id === id);
}
