'use client';
import { T, useT } from '@/components/language-provider';
import Link from 'next/link';

export function LegalFooter() {
  const t = useT();
  return (
    <footer className="legal-footer" aria-label={t('Legal and privacy information')}>
      <nav aria-label={t('Policies')} className="flex flex-wrap gap-x-5 gap-y-2">
        <Link href="/legal/privacy">
          <T text="Privacy" />
        </Link>
        <Link href="/legal/terms">
          <T text="Terms" />
        </Link>
        <Link href="/legal/cookies">
          <T text="Cookies" />
        </Link>
        <Link href="/legal/accessibility">
          <T text="Accessibility" />
        </Link>
        <Link href="/legal/credits">
          <T text="Credits" />
        </Link>
        <Link href="/legal/about">
          <T text="About & contact" />
        </Link>
      </nav>
      <p className="mt-3 text-xs">
        <T text="Command · Local edition · Ontario, Canada" />
      </p>
    </footer>
  );
}
