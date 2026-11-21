import type { Metadata, Viewport } from 'next';
import './globals.css';
import { cookies } from 'next/headers';
import { LanguageProvider } from '@/components/language-provider';
import { APP_BACKGROUND, THEME_BOOTSTRAP, THEME_COOKIE, themePreference } from '@/lib/theme';
import { ServiceWorkerRegistration } from '@/components/install-tip';

export const metadata: Metadata = {
  title: { default: 'Sessio — Your personal command center', template: '%s · Sessio' },
  description: 'Your courses, tasks, grades, and study plans in one personal workspace.',
  icons: { apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Sessio', statusBarStyle: 'default' },
};

// The phone's status bar follows the chosen theme (the same cookie the page uses).
export async function generateViewport(): Promise<Viewport> {
  const theme = themePreference((await cookies()).get(THEME_COOKIE)?.value);
  if (theme !== 'SYSTEM')
    return { themeColor: theme === 'DARK' ? APP_BACKGROUND.dark : APP_BACKGROUND.light };
  return {
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: APP_BACKGROUND.light },
      { media: '(prefers-color-scheme: dark)', color: APP_BACKGROUND.dark },
    ],
  };
}

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
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
