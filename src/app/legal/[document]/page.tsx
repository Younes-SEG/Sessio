import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { publicOperator } from '@/lib/server/operator';
import { legalDocuments, type LegalDocument } from '@/lib/legal';
import { legalDocumentsFr } from '@/lib/legal-fr';
import { LegalContent } from '@/components/legal-content';
import { LegalFooter } from '@/components/legal-footer';
import { isHosted } from '@/lib/server/hosting';

export async function generateMetadata({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  if (!Object.hasOwn(legalDocuments, document)) return { title: 'Not found' };
  const french = (await cookies()).get('command-language')?.value === 'fr';
  return {
    title: (french ? legalDocumentsFr : legalDocuments)[document as LegalDocument].title,
  };
}

export default async function LegalPage({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  if (!Object.hasOwn(legalDocuments, document)) notFound();
  const operator = publicOperator();
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 sm:py-16">
      <LegalContent
        document={document as LegalDocument}
        hosted={isHosted()}
        operator={{ name: operator.name, email: operator.email }}
      />
      <LegalFooter hosted={isHosted()} />
    </div>
  );
}
