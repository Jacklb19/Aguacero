/**
 * Region whitelist. The upstream `departamento` column spells each department in several
 * ways (accents, letter case, "BOGOTA D.C."). Each region lists the raw variants we match.
 * Variants for the most common departments were observed on 2026-09-29.
 */
export interface Region {
  slug: string;
  name: string;
  /** Exact upstream spellings matched with `departamento IN (...)`. */
  variants: string[];
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|\s)(\p{L})/gu, (_m, sp: string, c: string) => sp + c.toUpperCase())
    .replace(/\bDe\b/g, "De");
}

function variantsFor(name: string, extra: string[] = []): string[] {
  const upper = name.toUpperCase();
  const set = new Set([
    upper,
    stripAccents(upper),
    titleCase(name),
    stripAccents(titleCase(name)),
    ...extra,
  ]);
  return [...set];
}

function region(slug: string, name: string, extra: string[] = []): Region {
  return { slug, name, variants: variantsFor(name, extra) };
}

export const regions: Region[] = [
  region("amazonas", "Amazonas"),
  region("antioquia", "Antioquia"),
  region("arauca", "Arauca"),
  region("atlantico", "Atlántico"),
  region("bogota", "Bogotá", ["BOGOTA D.C.", "BOGOTÁ D.C.", "Bogotá D.C.", "BOGOTA, D.C."]),
  region("bolivar", "Bolívar"),
  region("boyaca", "Boyacá"),
  region("caldas", "Caldas"),
  region("caqueta", "Caquetá"),
  region("casanare", "Casanare"),
  region("cauca", "Cauca"),
  region("cesar", "Cesar"),
  region("choco", "Chocó"),
  region("cordoba", "Córdoba"),
  region("cundinamarca", "Cundinamarca"),
  region("guainia", "Guainía"),
  region("guaviare", "Guaviare"),
  region("huila", "Huila"),
  region("la-guajira", "La Guajira"),
  region("magdalena", "Magdalena"),
  region("meta", "Meta"),
  region("narino", "Nariño"),
  region("norte-de-santander", "Norte de Santander", ["Norte De Santander"]),
  region("putumayo", "Putumayo"),
  region("quindio", "Quindío"),
  region("risaralda", "Risaralda"),
  region("san-andres", "San Andrés", [
    "ARCHIPIELAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA",
    "ARCHIPIÉLAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA",
    "SAN ANDRÉS PROVIDENCIA",
    "SAN ANDRES PROVIDENCIA",
  ]),
  region("santander", "Santander"),
  region("sucre", "Sucre"),
  region("tolima", "Tolima"),
  region("valle-del-cauca", "Valle del Cauca", ["Valle Del Cauca"]),
  region("vaupes", "Vaupés"),
  region("vichada", "Vichada"),
];

export function getRegion(slug: string | undefined): Region | undefined {
  if (!slug) return undefined;
  return regions.find((r) => r.slug === slug);
}

export const REGION_COOKIE = "ag_region";
