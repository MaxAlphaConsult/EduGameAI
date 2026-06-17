// Theme-System für die GameEngine.
// Jedes Spiel-Skin wird auf eine kohärente Farbwelt + Atmosphäre gemappt,
// damit MultipleChoice, BossFight, Hangman & Co. nicht mehr alle gleich aussehen.

export type GameThemeId =
  | 'kids'      // Unterstufe — hell, bunt, freundlich
  | 'mission'   // Mittelstufe — Sci-Fi/Space, blau-lila
  | 'analytics' // Oberstufe — clean, minimal, professionell
  | 'boss'      // Combat — dunkel rot-lila, intensiv
  | 'sprint'    // Tempo — energetisch gelb-orange
  | 'noir'      // Escape/Detective — dunkel, sepia, Spannung
  | 'neon'      // Story/Puzzle — neon-pink, cyber
  | 'factory'   // Werkstatt/Prozess — industriell warm
  | 'lab'       // Analyse/Fehler-Scanner — klinisch grün-cyan

export interface GameTheme {
  id: GameThemeId
  label: string
  mood: 'light' | 'dark'
  bg: string            // Body-Hintergrund (gradient erlaubt)
  surface: string       // Karten-Hintergrund
  surfaceAlt: string    // Sekundäre Fläche
  border: string
  text: string
  textMuted: string
  accent: string        // Primärfarbe
  accentSoft: string    // Hover/Tint
  accentGradient: string // Buttons / Highlights
  success: string
  successSoft: string
  error: string
  errorSoft: string
  warning: string
  glowAccent: string    // box-shadow Glow
  backgroundEffect: 'stars' | 'grid' | 'particles' | 'rays' | 'fog' | 'none'
  /** Kleines Emoji/Icon für HUD-Badge */
  badge: string
}

const themes: Record<GameThemeId, GameTheme> = {
  kids: {
    id: 'kids',
    label: '🐾 Lern-Abenteuer',
    mood: 'light',
    bg: 'linear-gradient(135deg, #FEF3C7 0%, #FCE7F3 50%, #DDD6FE 100%)',
    surface: '#FFFFFF',
    surfaceAlt: '#FFF7ED',
    border: '#FCD34D',
    text: '#1F1235',
    textMuted: '#7A6A94',
    accent: '#F59E0B',
    accentSoft: 'rgba(245, 158, 11, 0.12)',
    accentGradient: 'linear-gradient(135deg, #F59E0B, #EC4899)',
    success: '#10B981',
    successSoft: 'rgba(16, 185, 129, 0.12)',
    error: '#EF4444',
    errorSoft: 'rgba(239, 68, 68, 0.1)',
    warning: '#F59E0B',
    glowAccent: '0 8px 32px rgba(245, 158, 11, 0.35)',
    backgroundEffect: 'particles',
    badge: '🐾',
  },
  mission: {
    id: 'mission',
    label: '🚀 Mission',
    mood: 'dark',
    bg: 'radial-gradient(ellipse at top, #1E1B4B 0%, #0F172A 50%, #020617 100%)',
    surface: 'rgba(30, 27, 75, 0.6)',
    surfaceAlt: 'rgba(15, 23, 42, 0.7)',
    border: 'rgba(99, 102, 241, 0.25)',
    text: '#E2E8F0',
    textMuted: '#94A3B8',
    accent: '#60A5FA',
    accentSoft: 'rgba(96, 165, 250, 0.15)',
    accentGradient: 'linear-gradient(135deg, #3B82F6, #A78BFA)',
    success: '#34D399',
    successSoft: 'rgba(52, 211, 153, 0.15)',
    error: '#F87171',
    errorSoft: 'rgba(248, 113, 113, 0.12)',
    warning: '#FBBF24',
    glowAccent: '0 8px 32px rgba(96, 165, 250, 0.4)',
    backgroundEffect: 'stars',
    badge: '🚀',
  },
  analytics: {
    id: 'analytics',
    label: '📊 Analyse',
    mood: 'light',
    bg: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
    surface: '#FFFFFF',
    surfaceAlt: '#F8FAFC',
    border: '#E2E8F0',
    text: '#0F172A',
    textMuted: '#64748B',
    accent: '#0F172A',
    accentSoft: 'rgba(15, 23, 42, 0.06)',
    accentGradient: 'linear-gradient(135deg, #0F172A, #334155)',
    success: '#059669',
    successSoft: 'rgba(5, 150, 105, 0.08)',
    error: '#DC2626',
    errorSoft: 'rgba(220, 38, 38, 0.08)',
    warning: '#D97706',
    glowAccent: '0 4px 16px rgba(15, 23, 42, 0.12)',
    backgroundEffect: 'grid',
    badge: '📊',
  },
  boss: {
    id: 'boss',
    label: '⚔️ Boss Fight',
    mood: 'dark',
    bg: 'radial-gradient(ellipse at center, #450A0A 0%, #1E1B4B 60%, #020617 100%)',
    surface: 'rgba(69, 10, 10, 0.5)',
    surfaceAlt: 'rgba(30, 27, 75, 0.6)',
    border: 'rgba(248, 113, 113, 0.3)',
    text: '#FAFAFA',
    textMuted: '#A1A1AA',
    accent: '#F87171',
    accentSoft: 'rgba(248, 113, 113, 0.15)',
    accentGradient: 'linear-gradient(135deg, #DC2626, #7C3AED)',
    success: '#34D399',
    successSoft: 'rgba(52, 211, 153, 0.15)',
    error: '#F43F5E',
    errorSoft: 'rgba(244, 63, 94, 0.15)',
    warning: '#FBBF24',
    glowAccent: '0 8px 40px rgba(220, 38, 38, 0.45)',
    backgroundEffect: 'fog',
    badge: '⚔️',
  },
  sprint: {
    id: 'sprint',
    label: '🏃 Sprint',
    mood: 'light',
    bg: 'linear-gradient(135deg, #FEF3C7 0%, #FED7AA 50%, #FECACA 100%)',
    surface: '#FFFFFF',
    surfaceAlt: '#FFFBEB',
    border: '#FDBA74',
    text: '#1F1235',
    textMuted: '#78716C',
    accent: '#EA580C',
    accentSoft: 'rgba(234, 88, 12, 0.12)',
    accentGradient: 'linear-gradient(135deg, #F59E0B, #DC2626)',
    success: '#16A34A',
    successSoft: 'rgba(22, 163, 74, 0.12)',
    error: '#DC2626',
    errorSoft: 'rgba(220, 38, 38, 0.1)',
    warning: '#D97706',
    glowAccent: '0 8px 32px rgba(234, 88, 12, 0.35)',
    backgroundEffect: 'rays',
    badge: '🏃',
  },
  noir: {
    id: 'noir',
    label: '🔐 Escape',
    mood: 'dark',
    bg: 'radial-gradient(ellipse at top, #292524 0%, #1C1917 60%, #0C0A09 100%)',
    surface: 'rgba(41, 37, 36, 0.7)',
    surfaceAlt: 'rgba(28, 25, 23, 0.8)',
    border: 'rgba(251, 191, 36, 0.25)',
    text: '#F5F5F4',
    textMuted: '#A8A29E',
    accent: '#FBBF24',
    accentSoft: 'rgba(251, 191, 36, 0.12)',
    accentGradient: 'linear-gradient(135deg, #D97706, #92400E)',
    success: '#65A30D',
    successSoft: 'rgba(101, 163, 13, 0.15)',
    error: '#DC2626',
    errorSoft: 'rgba(220, 38, 38, 0.12)',
    warning: '#FBBF24',
    glowAccent: '0 8px 32px rgba(251, 191, 36, 0.3)',
    backgroundEffect: 'fog',
    badge: '🔐',
  },
  neon: {
    id: 'neon',
    label: '🌌 Cyber',
    mood: 'dark',
    bg: 'radial-gradient(ellipse at top, #4C1D95 0%, #1E1B4B 50%, #0F0721 100%)',
    surface: 'rgba(76, 29, 149, 0.4)',
    surfaceAlt: 'rgba(30, 27, 75, 0.6)',
    border: 'rgba(236, 72, 153, 0.3)',
    text: '#FAFAFA',
    textMuted: '#C4B5FD',
    accent: '#EC4899',
    accentSoft: 'rgba(236, 72, 153, 0.15)',
    accentGradient: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
    success: '#34D399',
    successSoft: 'rgba(52, 211, 153, 0.15)',
    error: '#F43F5E',
    errorSoft: 'rgba(244, 63, 94, 0.15)',
    warning: '#FBBF24',
    glowAccent: '0 8px 40px rgba(236, 72, 153, 0.4)',
    backgroundEffect: 'grid',
    badge: '🌌',
  },
  factory: {
    id: 'factory',
    label: '🏭 Werkstatt',
    mood: 'light',
    bg: 'linear-gradient(135deg, #FAFAF9 0%, #E7E5E4 100%)',
    surface: '#FFFFFF',
    surfaceAlt: '#F5F5F4',
    border: '#D6D3D1',
    text: '#1C1917',
    textMuted: '#78716C',
    accent: '#0891B2',
    accentSoft: 'rgba(8, 145, 178, 0.1)',
    accentGradient: 'linear-gradient(135deg, #0891B2, #0E7490)',
    success: '#16A34A',
    successSoft: 'rgba(22, 163, 74, 0.1)',
    error: '#DC2626',
    errorSoft: 'rgba(220, 38, 38, 0.08)',
    warning: '#EAB308',
    glowAccent: '0 6px 24px rgba(8, 145, 178, 0.25)',
    backgroundEffect: 'grid',
    badge: '🏭',
  },
  lab: {
    id: 'lab',
    label: '🔬 Labor',
    mood: 'dark',
    bg: 'radial-gradient(ellipse at top, #064E3B 0%, #134E4A 50%, #0F172A 100%)',
    surface: 'rgba(6, 78, 59, 0.4)',
    surfaceAlt: 'rgba(15, 23, 42, 0.6)',
    border: 'rgba(52, 211, 153, 0.25)',
    text: '#ECFDF5',
    textMuted: '#86EFAC',
    accent: '#34D399',
    accentSoft: 'rgba(52, 211, 153, 0.15)',
    accentGradient: 'linear-gradient(135deg, #10B981, #06B6D4)',
    success: '#34D399',
    successSoft: 'rgba(52, 211, 153, 0.2)',
    error: '#F87171',
    errorSoft: 'rgba(248, 113, 113, 0.15)',
    warning: '#FBBF24',
    glowAccent: '0 8px 32px rgba(52, 211, 153, 0.35)',
    backgroundEffect: 'particles',
    badge: '🔬',
  },
}

// Vollständige Skin-Liste — wird sowohl für Theme-Mapping als auch
// für die Validierung in der KI-Pipeline + Lehrkraft-UI genutzt.
const SKIN_TO_THEME: Record<string, GameThemeId> = {
  // Basis-Altersstufen
  unterstufe: 'kids',
  mittelstufe: 'mission',
  oberstufe: 'analytics',
  // Spezifische Skins aus dem Spielmapping-Prompt
  'Boss Battle': 'boss',
  'Sprint-Bahn': 'sprint',
  'Escape Room': 'noir',
  'Detective Room': 'noir',
  'Radar-Scanner': 'mission',
  'Space Invaders': 'mission',
  'Puzzle-Karte': 'neon',
  'Entdeckerkarte': 'neon',
  'Story-Fork': 'neon',
  'Werkstatt-Band': 'factory',
  'Flow-Kette': 'factory',
  'Werkzeugkasten': 'factory',
  'Fehler-Scanner': 'lab',
  'Waage': 'analytics',
  'Arena': 'boss',
}

/** Alle bekannten Skin-Strings — Quelle für KI-Validation + Lehrkraft-Dropdown. */
export const KNOWN_SKINS = Object.keys(SKIN_TO_THEME)

/**
 * Gibt einen normalisierten Skin-String zurück, der garantiert im Mapping existiert.
 * Falls der Input unbekannt ist, fällt es auf den `fallback` (oder 'mittelstufe') zurück.
 */
export function normalizeSkin(skin: string | null | undefined, fallback: string = 'mittelstufe'): string {
  if (skin && skin in SKIN_TO_THEME) return skin
  if (fallback in SKIN_TO_THEME) return fallback
  return 'mittelstufe'
}

export function getThemeForSkin(skin: string | null | undefined): GameTheme {
  if (!skin) return themes.mission
  const id = SKIN_TO_THEME[skin] ?? 'mission'
  return themes[id]
}

export function getTheme(id: GameThemeId): GameTheme {
  return themes[id]
}

export const ALL_THEMES = themes
