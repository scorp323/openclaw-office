export const PALETTE = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash);
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export interface AvatarInfo {
  backgroundColor: string;
  textColor: string;
  initial: string;
}

export function generateAvatar(agentId: string, agentName?: string): AvatarInfo {
  const hash = hashString(agentId);
  const backgroundColor = PALETTE[hash % PALETTE.length];
  const textColor = luminance(backgroundColor) > 0.5 ? "#000000" : "#ffffff";

  const displayName = agentName ?? agentId;
  const initial = displayName.charAt(0).toUpperCase() || "?";

  return { backgroundColor, textColor, initial };
}

/** Deterministic hex color for 3D MeshStandardMaterial */
export function generateAvatar3dColor(agentId: string): string {
  const hash = hashString(agentId);
  return PALETTE[hash % PALETTE.length];
}

// --- SVG Avatar ---

export type FaceShape = "round" | "square" | "oval";
export type HairStyle = "short" | "spiky" | "side-part" | "curly" | "buzz";
export type EyeStyle = "dot" | "line" | "wide";

const FACE_SHAPES: FaceShape[] = ["round", "square", "oval"];
const HAIR_STYLES: HairStyle[] = ["short", "spiky", "side-part", "curly", "buzz"];
const EYE_STYLES: EyeStyle[] = ["dot", "line", "wide"];
const SKIN_COLORS = ["#fde2c8", "#f5c5a0", "#d4956b", "#a0714f", "#6b4226", "#ffe0bd"];
const HAIR_COLORS = ["#2c1b0e", "#5a3214", "#c2884a", "#e8c068"];

export interface SvgAvatarData {
  faceShape: FaceShape;
  hairStyle: HairStyle;
  eyeStyle: EyeStyle;
  skinColor: string;
  hairColor: string;
  shirtColor: string;
}

export function generateSvgAvatar(agentId: string): SvgAvatarData {
  const h = hashString(agentId);
  const bits = (offset: number, count: number) => (h >>> offset) % count;

  return {
    faceShape: FACE_SHAPES[bits(0, FACE_SHAPES.length)],
    hairStyle: HAIR_STYLES[bits(3, HAIR_STYLES.length)],
    eyeStyle: EYE_STYLES[bits(6, EYE_STYLES.length)],
    skinColor: SKIN_COLORS[bits(8, SKIN_COLORS.length)],
    hairColor: HAIR_COLORS[bits(11, HAIR_COLORS.length)],
    shirtColor: PALETTE[h % PALETTE.length],
  };
}

// --- Matrix Character Visual Data ---

export interface MatrixCharacterStyle {
  /** Coat/outfit color */
  coatColor: string;
  /** Inner shirt / outfit accent */
  innerColor: string;
  /** Hair color */
  hairColor: string;
  /** Hair style key */
  hairStyle: "bald" | "short" | "slicked" | "braided" | "long" | "buzz";
  /** Glasses style */
  glasses: "round" | "narrow" | "sleek" | "none" | "green-tint";
  /** Glasses color */
  glassesColor: string;
  /** Skin tone */
  skinColor: string;
  /** Whether they have a long coat (trench) */
  hasCoat: boolean;
}

export const MATRIX_CHARACTERS: Record<string, MatrixCharacterStyle> = {
  morpheus: {
    coatColor: "#0a1a0a",
    innerColor: "#1a2a1a",
    hairColor: "#0a0f0a",
    hairStyle: "bald",
    glasses: "round",
    glassesColor: "#0a3d0a",
    skinColor: "#8b6914",
    hasCoat: true,
  },
  neo: {
    coatColor: "#050d05",
    innerColor: "#0a1a0a",
    hairColor: "#1a1a0a",
    hairStyle: "short",
    glasses: "narrow",
    glassesColor: "#0a2a0a",
    skinColor: "#f5c5a0",
    hasCoat: true,
  },
  trinity: {
    coatColor: "#080808",
    innerColor: "#0a0f0a",
    hairColor: "#0a0a0a",
    hairStyle: "short",
    glasses: "sleek",
    glassesColor: "#0a3d0a",
    skinColor: "#fde2c8",
    hasCoat: false,
  },
  tank: {
    coatColor: "#1a2a1a",
    innerColor: "#0a1a0a",
    hairColor: "#0a0a0a",
    hairStyle: "buzz",
    glasses: "none",
    glassesColor: "#0a3d0a",
    skinColor: "#6b4226",
    hasCoat: false,
  },
  theoracle: {
    coatColor: "#2a3a1a",
    innerColor: "#3a4a2a",
    hairColor: "#4a3a1a",
    hairStyle: "short",
    glasses: "round",
    glassesColor: "#5a4a2a",
    skinColor: "#a0714f",
    hasCoat: false,
  },
  link: {
    coatColor: "#1a2a1a",
    innerColor: "#0a1a0a",
    hairColor: "#0a0a0a",
    hairStyle: "buzz",
    glasses: "none",
    glassesColor: "#0a3d0a",
    skinColor: "#6b4226",
    hasCoat: false,
  },
  niobe: {
    coatColor: "#0a1a0a",
    innerColor: "#1a2a1a",
    hairColor: "#0a0a0a",
    hairStyle: "braided",
    glasses: "sleek",
    glassesColor: "#0a3d0a",
    skinColor: "#a0714f",
    hasCoat: false,
  },
  cypher: {
    coatColor: "#1a2a1a",
    innerColor: "#2a3a1a",
    hairColor: "#2a2a0a",
    hairStyle: "slicked",
    glasses: "green-tint",
    glassesColor: "#0a3d0a",
    skinColor: "#f5c5a0",
    hasCoat: false,
  },
};

export const DEFAULT_MATRIX_CHARACTER: MatrixCharacterStyle = {
  coatColor: "#0a1a0a",
  innerColor: "#1a2a1a",
  hairColor: "#1a1a0a",
  hairStyle: "short",
  glasses: "green-tint",
  glassesColor: "#0a3d0a",
  skinColor: "#d4956b",
  hasCoat: false,
};

export function getMatrixCharacter(characterKey: string | null): MatrixCharacterStyle {
  if (!characterKey) return DEFAULT_MATRIX_CHARACTER;
  return MATRIX_CHARACTERS[characterKey] ?? DEFAULT_MATRIX_CHARACTER;
}
