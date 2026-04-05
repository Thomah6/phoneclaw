/**
 * OpenDroid Design System
 * Electric Cyan + Deep Purple — AI-forward, distinct from OpenClaw (red)
 */

import { Platform } from 'react-native';

/* ─── Brand Palette ─── */
export const palette = {
  // Backgrounds (premium light UI)
  black: '#000000',
  bg0: '#FFFFFF',       // pure white
  bg1: '#F8FAFC',       // slate-50
  bg2: '#F1F5F9',       // slate-100
  bg3: '#E2E8F0',       // slate-200
  bg4: '#CBD5E1',       // slate-300

  // Text
  textPrimary: '#0F172A',     // slate-900
  textSecondary: '#334155',   // slate-700
  textTertiary: '#64748B',    // slate-500
  textMuted: '#94A3B8',       // slate-400

  // Brand accent — Unicorn Violet
  accent: '#A855F7',          // violet-500
  accentLight: '#C084FC',
  accentDark: '#7E22CE',
  accentGlow: 'rgba(168, 85, 247, 0.08)',
  accentSoft: 'rgba(168, 85, 247, 0.15)',

  // Secondary accent — Sky Blue/Cyan
  violet: '#0EA5E9',          // sky-500
  violetLight: '#38BDF8',
  violetGlow: 'rgba(14, 165, 233, 0.10)',

  // Gradient endpoints (for decorative use)
  gradientStart: '#A855F7',   // violet
  gradientEnd: '#0EA5E9',     // sky

  // Semantic
  success: '#22C55E',         // green-500
  successBg: 'rgba(34, 197, 94, 0.10)',
  error: '#EF4444',           // red-500
  errorBg: 'rgba(239, 68, 68, 0.10)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.10)',
  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.10)',

  // Tool colors
  toolBlue: '#3B82F6',        // blue-500
  toolBlueBg: 'rgba(59, 130, 246, 0.08)',
  toolGreen: '#10B981',       // emerald-500
  toolGreenBg: 'rgba(16, 185, 129, 0.08)',

  // Borders
  border: 'rgba(15, 23, 42, 0.08)',
  borderLight: 'rgba(15, 23, 42, 0.15)',
  borderMed: 'rgba(15, 23, 42, 0.25)',
  borderAccent: 'rgba(168, 85, 247, 0.25)',
  borderDashed: 'rgba(15, 23, 42, 0.10)',

  // Overlay
  overlay: 'rgba(15, 23, 42, 0.5)',
  glass: 'rgba(248, 250, 252, 0.90)',
} as const;

/* ─── Spacing (4px base) ─── */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/* ─── Radius ─── */
export const radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 22,
  full: 999,
} as const;

/* ─── Typography ─── */
const fontFamily = Platform.select({
  ios: { regular: 'System', mono: 'Menlo' },
  default: { regular: 'sans-serif', mono: 'monospace' },
})!;

export const typography = {
  hero: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.8, fontFamily: fontFamily.regular },
  title: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.3, fontFamily: fontFamily.regular },
  subtitle: { fontSize: 15, fontWeight: '500' as const, fontFamily: fontFamily.regular },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22, fontFamily: fontFamily.regular },
  bodySm: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18, fontFamily: fontFamily.regular },
  caption: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.3, fontFamily: fontFamily.regular },
  mono: { fontSize: 12, fontFamily: fontFamily.mono, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const, fontFamily: fontFamily.regular },
} as const;

/* ─── Shadows ─── */
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 8,
  },
  glow: {
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

/* ─── Legacy ─── */
export const Colors = {
  light: { text: palette.textPrimary, background: palette.bg0, tint: palette.accent, icon: palette.textTertiary, tabIconDefault: palette.textTertiary, tabIconSelected: palette.accent },
  dark: { text: palette.textPrimary, background: palette.bg0, tint: palette.accent, icon: palette.textTertiary, tabIconDefault: palette.textTertiary, tabIconSelected: palette.accent },
};

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
});
