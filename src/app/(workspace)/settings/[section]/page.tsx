import { notFound } from 'next/navigation';
import { SettingsSection } from '@/components/settings-view';
import { isSettingsSection } from '@/lib/settings-sections';

export default async function SettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!isSettingsSection(section)) notFound();
  return <SettingsSection id={section} />;
}
