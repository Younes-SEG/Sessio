'use client';

import Link from 'next/link';
import { legalDocuments, policyUpdated, type LegalDocument } from '@/lib/legal';
import { legalDocumentsFr, policyUpdatedFr } from '@/lib/legal-fr';
import { LanguageSwitch, useLanguage } from './language-provider';

const chrome = {
  en: {
    skip: 'Skip to policy',
    hosted: 'Hosted edition',
    local: 'Local edition',
    info: 'Policy information',
    updated: `Updated ${policyUpdated}`,
    manage: 'Manage your workspace data',
    support: 'Account deletion and support',
    noContact: 'A public support contact has not been designated yet.',
    deletion:
      'Workspace erasure does not delete your login account. Account deletion requires verification and provider cleanup. Never send your password.',
    lora: 'Lora font licence',
    jakarta: 'Plus Jakarta Sans font licence',
    notices: 'Download third-party licence notices',
    ical: 'Download the unmodified ical.js source and file index',
  },
  fr: {
    skip: 'Aller à la politique',
    hosted: 'Édition hébergée',
    local: 'Édition locale',
    info: 'Renseignements sur les politiques',
    updated: `Mis à jour le ${policyUpdatedFr}`,
    manage: 'Gérer les données de votre espace de travail',
    support: 'Suppression du compte et assistance',
    noContact: 'Le contact public n’est pas encore défini.',
    deletion:
      'Effacer l’espace de travail ne supprime pas le compte de connexion. La suppression du compte demande une vérification et un traitement chez les fournisseurs. N’envoyez jamais votre mot de passe.',
    lora: 'Licence de la police Lora',
    jakarta: 'Licence de la police Plus Jakarta Sans',
    notices: 'Télécharger les avis de licence de tiers',
    ical: 'Télécharger le code source non modifié d’ical.js et l’index des fichiers',
  },
};

export function LegalContent({
  document,
  hosted,
  operator,
}: {
  document: LegalDocument;
  hosted: boolean;
  operator: { name: string; email: string };
}) {
  const { language } = useLanguage();
  const text = chrome[language];
  const content = language === 'fr' ? legalDocumentsFr[document] : legalDocuments[document];
  return (
    <>
      <a href="#policy-content" className="skip-link">
        {text.skip}
      </a>
      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-lg font-semibold">
            Sessio
          </Link>
          <p className="muted mt-2 text-sm">
            {hosted ? text.hosted : text.local} · {text.info}
          </p>
        </div>
        <LanguageSwitch />
      </header>
      <main id="policy-content" tabIndex={-1} className="policy-content">
        <h1 className="text-3xl font-semibold tracking-tight">{content.title}</h1>
        <p className="muted mt-3 text-sm">{text.updated}</p>
        <p className="mt-6 text-base leading-7">{content.introduction}</p>
        {content.sections.map((section) => (
          <section key={section.title} className="mt-8">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-7">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
        {document === 'credits' && (
          <div className="mt-6 space-y-3">
            <p>
              <a className="underline" href="/fonts/Lora-OFL.txt" download>
                {text.lora}
              </a>
            </p>
            <p>
              <a className="underline" href="/fonts/Plus-Jakarta-Sans-OFL.txt" download>
                {text.jakarta}
              </a>
            </p>
            <p>
              <a className="underline" href="/third-party-notices.txt" download>
                {text.notices}
              </a>
            </p>
            <p>
              <a className="underline" href="/licenses/ical-source.txt" download="ical-source.txt">
                {text.ical}
              </a>
            </p>
          </div>
        )}
        {(document === 'privacy' || document === 'about') && (
          <p className="mt-6">
            <Link href="/settings/privacy" className="underline">
              {text.manage}
            </Link>
          </p>
        )}
        <section id="account-deletion" className="my-8 border-t pt-5 text-sm">
          <h2>{text.support}</h2>
          {operator.name && <p>{operator.name}</p>}
          {operator.email ? (
            <p>
              <a className="underline" href={`mailto:${operator.email}`}>
                {operator.email}
              </a>
            </p>
          ) : (
            <p>{text.noContact}</p>
          )}
          <p>{text.deletion}</p>
        </section>
      </main>
    </>
  );
}
