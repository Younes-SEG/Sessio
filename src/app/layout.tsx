import type { Metadata } from 'next';
import './globals.css';
import { cookies } from 'next/headers';
import { LanguageProvider } from '@/components/language-provider';
import { THEME_BOOTSTRAP, THEME_COOKIE, themePreference } from '@/lib/theme';

export const metadata: Metadata = {
  title: { default: 'Command — Your personal command center', template: '%s · Command' },
  description: 'Your courses, tasks, grades, and study plans in one personal workspace.',
};

// Information pages have no database access or private workspace payload.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const preferences = await cookies();
  const language = preferences.get('command-language')?.value === 'fr' ? 'fr' : 'en';
  const theme = themePreference(preferences.get(THEME_COOKIE)?.value);
  return (
    <html
      lang={language}
      data-theme={theme}
      className={theme === 'DARK' ? 'dark' : undefined}
      style={{ colorScheme: theme === 'SYSTEM' ? 'light dark' : theme.toLowerCase() }}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <LanguageProvider initialLanguage={language}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
