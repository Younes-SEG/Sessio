export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';
export const THEME_COOKIE = 'command-theme';
/** Matches --background in globals.css; used for the installed app's status bar and splash. */
export const APP_BACKGROUND = { light: '#faf9f6', dark: '#1b1b1d' } as const;

export function themePreference(value: unknown): ThemePreference {
  return value === 'DARK' || value === 'LIGHT' ? value : 'SYSTEM';
}

/** Runs directly in the document head, before content or React hydration. */
export const THEME_BOOTSTRAP = `(()=>{const root=document.documentElement;const theme=root.dataset.theme;const dark=theme==='DARK'||(theme!=='LIGHT'&&window.matchMedia('(prefers-color-scheme: dark)').matches);root.classList.toggle('dark',dark);root.style.colorScheme=dark?'dark':'light';})();`;

export function applyThemePreference(theme: ThemePreference) {
  const root = document.documentElement;
  const dark =
    theme === 'DARK' ||
    (theme === 'SYSTEM' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = theme;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  // A browser preference lets the server render the next document in the right
  // theme without accessing the database on public/authentication pages.
  try {
    document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch {
    // The current page still works if the browser blocks preference cookies.
  }
}
