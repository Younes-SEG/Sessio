'use client';
import { Button } from '@/components/ui/button';
import { useT } from '@/components/language-provider';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <div className="card empty-state min-h-96">
      <h1 className="text-xl font-semibold text-foreground">
        {t('Something interrupted your workspace.')}
      </h1>
      <p>{t('Your saved data is safe. Please try loading this page again.')}</p>
      <Button onClick={reset}>{t('Try again')}</Button>
    </div>
  );
}
