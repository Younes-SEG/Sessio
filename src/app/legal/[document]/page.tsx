import { publicOperator } from '@/lib/server/operator';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { legalDocuments, policyUpdated, type LegalDocument } from '@/lib/legal';
import { LegalFooter } from '@/components/legal-footer';

export async function generateMetadata({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  return {
    title: Object.hasOwn(legalDocuments, document)
      ? legalDocuments[document as LegalDocument].title
      : 'Not found',
  };
}

export default async function LegalPage({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  if (!Object.hasOwn(legalDocuments, document)) notFound();
  const content = legalDocuments[document as LegalDocument];
  const operator = publicOperator();
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 sm:py-16">
      <a href="#policy-content" className="skip-link">
        Skip to policy
      </a>
      <header className="mb-10">
        <Link href="/" className="text-lg font-semibold">
          Command
        </Link>
        <p className="muted mt-2 text-sm">Local edition · Policy information</p>
      </header>
      <main id="policy-content" tabIndex={-1} className="policy-content">
        <h1 className="text-3xl font-semibold tracking-tight">{content.title}</h1>
        <p className="muted mt-3 text-sm">Updated {policyUpdated}</p>
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
                Lora font licence
              </a>
            </p>
            <p>
              <a className="underline" href="/fonts/Plus-Jakarta-Sans-OFL.txt" download>
                Plus Jakarta Sans font licence
              </a>
            </p>
            <p>
              <a className="underline" href="/third-party-notices.txt" download>
                Download third-party licence notices
              </a>
            </p>
            <p>
              <a className="underline" href="/licenses/ical-source.txt" download="ical-source.txt">
                Download the unmodified ical.js source and file index
              </a>
            </p>
          </div>
        )}
        {['privacy', 'about'].includes(document) && (
          <p className="mt-6">
            <Link href="/settings/privacy" className="underline">
              Manage your workspace data
            </Link>
          </p>
        )}
        <section id="account-deletion" className="my-8 border-t pt-5 text-sm">
          <h2>Account deletion and support / Suppression du compte et assistance</h2>
          {operator.name && <p>{operator.name}</p>}
          {operator.email ? (
            <p>
              <a className="underline" href={`mailto:${operator.email}`}>
                {operator.email}
              </a>
            </p>
          ) : (
            <p>
              A public support contact has not been designated yet. / Le contact public n&apos;est
              pas encore défini.
            </p>
          )}
          <p>
            Workspace erasure does not delete your login account. Account deletion requires
            verification and provider cleanup. Never send your password.
          </p>
          <p lang="fr">
            Effacer l&apos;espace de travail ne supprime pas le compte de connexion. La suppression
            du compte demande une vérification et un traitement chez les fournisseurs.
            N&apos;envoyez jamais votre mot de passe.
          </p>
        </section>
      </main>
      <LegalFooter />
    </div>
  );
}
