import type { Density } from '../model/foundation';
export type RadioTokens = Readonly<Record<string, string>>;
export type RadioThemeTokens = RadioTokens;
export interface RadioTheme { id: string; label: string; tokens: RadioTokens; }
export const RADIO_THEMES: Record<'classic' | 'midnight', RadioTheme> = {
  classic: { id: 'classic', label: 'Thetis Classic', tokens: {
    '--radio-bg': '#222b34', '--radio-surface': '#303d49', '--radio-raised': '#3b4b58',
    '--radio-border': '#697782', '--radio-text': '#f3f5f7', '--radio-muted': '#b8c4cf',
    '--radio-accent': '#f3c360', '--radio-accent-text': '#171e25', '--radio-vfo': '#a8e3a1',
    '--radio-plot': '#101921', '--radio-trace': '#77d2ee', '--radio-grid': '#344551',
    '--radio-warning': '#f3c360', '--radio-focus': '#9bdcff', '--radio-waterfall-low': '#112e53',
    '--radio-fault': '#ffb4ab', '--radio-stale': '#e8c785', '--radio-disabled': '#303d49', '--radio-disabled-text': '#a8b3bc', '--radio-selection': '#f3c360', '--radio-selection-text': '#171e25',
    '--radio-waterfall-high': '#d8b65a', '--radio-radius': '3px', '--radio-font': "'Segoe UI', sans-serif"
  } },
  midnight: { id: 'midnight', label: 'Thetis Midnight', tokens: {
    '--radio-bg': '#101c25', '--radio-surface': '#182b37', '--radio-raised': '#203947',
    '--radio-border': '#436372', '--radio-text': '#e5f4f7', '--radio-muted': '#a7c1ca',
    '--radio-accent': '#66d9ce', '--radio-accent-text': '#0a2425', '--radio-vfo': '#70e6d1',
    '--radio-plot': '#07131c', '--radio-trace': '#71e8d5', '--radio-grid': '#24414d',
    '--radio-warning': '#f0bf6a', '--radio-focus': '#9ce9ff', '--radio-waterfall-low': '#082b42',
    '--radio-fault': '#ffb4b4', '--radio-stale': '#ebcc92', '--radio-disabled': '#182b37', '--radio-disabled-text': '#a7c1ca', '--radio-selection': '#66d9ce', '--radio-selection-text': '#0a2425',
    '--radio-waterfall-high': '#55ceb9', '--radio-radius': '7px', '--radio-font': "'Segoe UI', sans-serif"
  } }
};
export function resolveRadioTheme(id: unknown): RadioTheme {
  return id === 'midnight' ? RADIO_THEMES.midnight : RADIO_THEMES.classic;
}
export function applyRadioTheme(root: { style: { setProperty(name: string, value: string): void } }, tokens: RadioTokens): void {
  for (const [key, value] of Object.entries(tokens)) {
    if (key.startsWith('--radio-')) root.style.setProperty(key, value);
  }
}
export function resolveDensity(preference: Density, width: number, coarsePointer: boolean): Exclude<Density, 'auto'> {
  if (preference !== 'auto') return preference;
  return coarsePointer ? 'touch' : width < 700 ? 'compact' : 'expanded';
}
