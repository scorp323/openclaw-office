/**
 * Matrix character codename mapping for agents.
 * Maps agent IDs/names to their Matrix universe codenames.
 */

export const MATRIX_CODENAMES: Record<string, string> = {
  morpheus: "Morpheus",
  main: "Morpheus",
  jack: "Neo",
  scout: "Trinity",
  sentinel: "Tank",
  oracle: "The Oracle",
  link: "Link",
  kat: "Niobe",
  fast: "Cypher",
};

/** Resolve a Matrix codename from an agent's id and name. Falls back to raw name. */
export function getCodename(id: string, name: string): string {
  const lower = id.toLowerCase();
  for (const [key, codename] of Object.entries(MATRIX_CODENAMES)) {
    if (lower.includes(key)) return codename;
  }
  const nameLower = name.toLowerCase();
  for (const [key, codename] of Object.entries(MATRIX_CODENAMES)) {
    if (nameLower.includes(key)) return codename;
  }
  return name;
}

/** Get the canonical character key (e.g. "morpheus", "neo") from an agent id/name. */
export function getCharacterKey(id: string, name: string): string | null {
  const lower = id.toLowerCase();
  for (const key of Object.keys(MATRIX_CODENAMES)) {
    if (lower.includes(key)) return MATRIX_CODENAMES[key].toLowerCase().replace(/\s+/g, "");
  }
  const nameLower = name.toLowerCase();
  for (const key of Object.keys(MATRIX_CODENAMES)) {
    if (nameLower.includes(key)) return MATRIX_CODENAMES[key].toLowerCase().replace(/\s+/g, "");
  }
  return null;
}
