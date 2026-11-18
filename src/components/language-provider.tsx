'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { french } from '@/lib/i18n/fr';
import { formatPercent, isSingular } from '@/lib/i18n/format';
export type Language = 'en' | 'fr';
const Context = createContext<{ language: Language; setLanguage: (value: Language) => void }>({
  language: 'en',
  setLanguage: () => {},
});
export function LanguageProvider({
  children,
  initialLanguage = 'en',
}: {
  children: ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguage] = useState(initialLanguage);
  useEffect(() => {
    document.documentElement.lang = language;
    // Functional preference only; no identifier or third-party request.
    document.cookie = `command-language=${language}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  }, [language]);
  return <Context.Provider value={{ language, setLanguage }}>{children}</Context.Provider>;
}
export function useLanguage() {
  return useContext(Context);
}
export function translate(text: string, language: Language): string {
  return language === 'fr' ? (french[text] ?? text) : text;
}
export function useT() {
  const { language } = useLanguage();
  const locale = language === 'fr' ? 'fr-CA' : 'en-CA';
  return Object.assign((text: string) => translate(text, language), {
    locale,
    /** Use the singular form for this count (French: 0 and 1). */
    one: (count: number) => isSingular(count, locale),
    percent: (value: number, digits = 1) => formatPercent(value, locale, digits),
  });
}
/** Only application copy belongs here, never stored course names or academic records. */
export function T({ text }: { text: string }) {
  const t = useT();
  return <>{t(text)}</>;
}
export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return (
    <button
      type="button"
      className="language-switch"
      lang={language === 'en' ? 'fr' : 'en'}
      aria-label={language === 'en' ? 'Passer en français' : 'Switch to English'}
      onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
    >
      <span aria-hidden>◎</span> {language === 'en' ? 'Français' : 'English'}
    </button>
  );
}
