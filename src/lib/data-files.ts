import index from "@/generated/data-files.json";

/** Metadata written by scripts/build-datasets.ts for each Parquet file in public/data. */
export interface DataFileMeta {
  slug: string;
  id: string;
  file: string;
  rows: number;
  bytes: number;
  from: string;
  to: string;
  days: number;
  generatedAt: string;
  columns: { name: string; type: string; description: string }[];
}

export const dataFiles: Partial<Record<string, DataFileMeta>> = index as Record<string, DataFileMeta>;
