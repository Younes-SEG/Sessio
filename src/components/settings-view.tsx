'use client';
import { LanguageSwitch, T, useT } from '@/components/language-provider';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Loader2,
  Mail,
  Monitor,
  Moon,
  Palette,
  Pencil,
  Plus,
  ShieldCheck,
  Sun,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspace } from '@/components/workspace-provider';
import { formatDate } from '@/lib/dates';
import { schoolById, schoolName } from '@/lib/schools';
import type { Settings } from '@/lib/types';
import type { SettingsSectionId } from '@/lib/settings-sections';
import { CalendarSubscriptions } from './calendar-subscriptions';
import { PrivacyControls } from './privacy-controls';
import { BuddyCharacter, buddyCharacters } from './buddy-character';
import { EmailUpdatesLink } from './email-updates';
import { SchoolPicker } from './school-picker';
import { dismissSchoolPrompt } from './school-prompt';
import { useAccount } from './account-provider';
import { SignOutButton } from './auth-panel';

const settingsSections = [
  { id: 'account', title: 'Account', description: 'Who is signed in.', icon: UserRound },
  {
    id: 'profile',
    title: 'Profile & school',
    description: 'Your name and the school that sets your grade scale.',
    icon: GraduationCap,
  },
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Theme, language and your study buddy.',
    icon: Palette,
  },
  {
    id: 'calendar',
    title: 'Calendar & time',
    description: 'Time format, week start and calendar connections.',
    icon: CalendarClock,
  },
  {
    id: 'terms',
    title: 'Terms (semesters)',
    description: 'Dates and your active term.',
    icon: CalendarDays,
  },
  {
    id: 'email',
    title: 'Email updates',
    description: 'Grade notifications from your school.',
    icon: Mail,
  },
  {
    id: 'privacy',
    title: 'Privacy & data',
    description: 'Export or erase your workspace.',
    icon: ShieldCheck,
  },
] as const satisfies ReadonlyArray<{
  id: SettingsSectionId;
  title: string;
  description: string;
  icon: LucideIcon;
}>;

/** Old in-page anchors, kept working after Settings was split into sections. */
const legacyAnchors: Record<string, SettingsSectionId> = {
  '#terms': 'terms',
  '#calendar-connections': 'calendar',
  '#your-data': 'privacy',
  '#appearance': 'appearance',
};

function useSectionSummary() {
  const t = useT();
  const account = useAccount();
  const { data } = useWorkspace();
  const school = schoolById(data.settings.schoolId);
  const theme = { LIGHT: 'Light', DARK: 'Dark', SYSTEM: 'System' }[data.settings.theme];
  const active = data.semesters.find((semester) => semester.isActive);
  return (id: SettingsSectionId): string | null => {
    switch (id) {
      case 'account':
        return account ? account.email : t('Local workspace');
      case 'profile':
        return school
          ? schoolName(school, t.locale === 'fr-CA' ? 'fr' : 'en')
          : t('No school chosen');
      case 'appearance':
        return t(theme);
      case 'calendar':
        return data.settings.timeFormat === '24' ? t('24-hour') : t('12-hour');
      case 'terms':
        return active?.name ?? null;
      default:
        return null;
    }
  };
}

export function SettingsView() {
  const t = useT();
  const router = useRouter();
  const summary = useSectionSummary();
  useEffect(() => {
    const target = legacyAnchors[window.location.hash];
    if (target) router.replace(`/settings/${target}`);
  }, [router]);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="page-header">
        <div>
          <p className="eyebrow mb-2">
            <T text="MAKE YOURSELF AT HOME" />
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            <T text="Settings" />
          </h1>
          <p className="muted mt-2 text-sm">
            <T text="A few thoughtful details to make this space yours." />
          </p>
        </div>
      </header>
      <nav aria-label={t('Settings sections')} className="card divide-y divide-[var(--border)]">
        {settingsSections.map(({ id, title, description, icon: Icon }) => {
          const value = summary(id);
          return (
            <Link
              key={id}
              href={`/settings/${id}`}
              className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-[var(--muted)]/50 sm:px-5"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-[var(--muted)] text-[var(--primary)]">
                <Icon size={18} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{t(title)}</span>
                <span className="muted mt-0.5 block text-xs">{t(description)}</span>
              </span>
              {value && (
                <span className="muted hidden max-w-[40%] truncate text-xs sm:block">{value}</span>
              )}
              <ChevronRight size={16} className="muted shrink-0" aria-hidden />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function SettingsSection({ id }: { id: SettingsSectionId }) {
  const t = useT();
  const section = settingsSections.find((entry) => entry.id === id)!;
  const Icon = section.icon;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/settings" className="muted inline-flex items-center gap-2 text-sm">
        <ArrowLeft size={15} aria-hidden />
        <T text="Settings" />
      </Link>
      <header className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-sm bg-[var(--muted)] text-[var(--primary)]">
          <Icon size={20} aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t(section.title)}</h1>
          <p className="muted mt-1 text-sm">{t(section.description)}</p>
        </div>
      </header>
      {id === 'account' && <AccountSection />}
      {id === 'profile' && <ProfileSection />}
      {id === 'appearance' && <AppearanceSection />}
      {id === 'calendar' && <CalendarSection />}
      {id === 'terms' && <TermsSection />}
      {id === 'email' && (
        <section className="card flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
          <p className="muted text-sm">
            {t('Connect Gmail and review grade notifications from your school.')}
          </p>
          <EmailUpdatesLink />
        </section>
      )}
      {id === 'privacy' && <PrivacyControls />}
    </div>
  );
}

function AccountSection() {
  const t = useT();
  const account = useAccount();
  if (!account)
    return (
      <section className="card p-4 sm:p-5">
        <h2 className="section-title">{t('Local workspace')}</h2>
        <p className="muted mt-2 text-sm leading-relaxed">
          {t(
            'This copy of Command runs on your computer and keeps your data in its local database. There is no account to sign in to.',
          )}
        </p>
      </section>
    );
  return (
    <section className="card divide-y divide-[var(--border)]">
      <dl className="grid gap-4 p-4 sm:grid-cols-[10rem_1fr] sm:p-5">
        {account.name && (
          <>
            <dt className="muted text-sm">{t('Name')}</dt>
            <dd className="text-sm font-medium">{account.name}</dd>
          </>
        )}
        <dt className="muted text-sm">{t('Email')}</dt>
        <dd className="break-all text-sm font-medium">{account.email}</dd>
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <p className="muted text-xs">{t('Signing out ends this session on this device.')}</p>
        <SignOutButton />
      </div>
    </section>
  );
}

/** A section form that saves only its own fields; the server merges them into your settings. */
function SettingsForm({
  fields,
  children,
}: {
  fields: (form: FormData) => Partial<Record<keyof Settings, unknown>>;
  children: ReactNode;
}) {
  const t = useT();
  const { save } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = fields(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await save('settings', values, 'preferences');
      if ('schoolId' in values) dismissSchoolPrompt();
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to save your preferences. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} onChange={() => setSaved(false)} className="card overflow-hidden">
      <fieldset disabled={busy} className="min-w-0 divide-y divide-[var(--border)] px-4 sm:px-5">
        {children}
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] bg-[var(--muted)]/30 px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-1">
          {error ? (
            <p role="alert" className="text-sm text-[var(--destructive)]">
              {t(error)}
            </p>
          ) : saved ? (
            <p role="status" className="flex items-center gap-2 text-sm text-[var(--primary)]">
              <CheckCircle2 size={15} />
              <T text="Your preferences are saved." />
            </p>
          ) : null}
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {busy ? t('Saving…') : t('Save')}
        </Button>
      </div>
    </form>
  );
}

function ProfileSection() {
  const t = useT();
  const { data } = useWorkspace();
  const settings = data.settings;
  const [schoolId, setSchoolId] = useState(settings.schoolId ?? null);
  return (
    <SettingsForm
      fields={(form) => ({
        displayName: String(form.get('displayName') ?? '').trim(),
        schoolId: String(form.get('schoolId') ?? '').trim() || null,
      })}
    >
      <div className="grid gap-4 py-6 sm:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-sm font-medium">{t('School')}</h2>
          <p className="muted mt-2 text-xs leading-relaxed">
            {t('Used for letter grades, GPA and default course weights.')}
          </p>
        </div>
        <div className="space-y-3">
          <SchoolPicker value={schoolId} onChange={setSchoolId} name="schoolId" />
          {schoolId && (
            <Button type="button" size="sm" variant="outline" onClick={() => setSchoolId(null)}>
              {t('Clear school')}
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-4 py-6 sm:grid-cols-[1fr_1.4fr]">
        <div>
          <Label htmlFor="settings-name">
            <T text="What should we call you?" />
          </Label>
          <p className="muted mt-2 text-xs leading-relaxed">
            <T text="Optional. A nickname or no name is fine." />
          </p>
        </div>
        <Input
          id="settings-name"
          name="displayName"
          defaultValue={settings.displayName}
          maxLength={80}
          placeholder={t('Your first name')}
          autoComplete="given-name"
        />
      </div>
    </SettingsForm>
  );
}

function AppearanceSection() {
  const t = useT();
  const { data } = useWorkspace();
  const settings = data.settings;
  return (
    <>
      <section className="card flex items-center justify-between gap-4 p-4 sm:px-5">
        <h2 className="section-title">{t('Language')}</h2>
        <LanguageSwitch />
      </section>
      <SettingsForm
        fields={(form) => ({
          theme: form.get('theme'),
          studyBuddy: form.get('studyBuddy'),
          buddyMotion: form.get('buddyMotion') === 'on',
        })}
      >
        <fieldset className="min-w-0 py-6">
          <legend className="float-left w-full text-sm font-medium">
            <T text="Appearance" />
          </legend>
          <div className="clear-both pt-2">
            <p className="muted mb-4 text-xs">
              <T text="Choose your favorite look, or follow your device." />
            </p>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { value: 'LIGHT', label: 'Light', Icon: Sun },
                  { value: 'DARK', label: 'Dark', Icon: Moon },
                  { value: 'SYSTEM', label: 'System', Icon: Monitor },
                ] as const
              ).map(({ value, label, Icon }) => (
                <label key={value} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value={value}
                    defaultChecked={settings.theme === value}
                    className="peer sr-only"
                  />
                  <div className="rounded-sm border-2 border-[var(--border)] p-2 transition-colors peer-checked:border-[var(--primary)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--primary)] peer-focus-visible:ring-offset-2 sm:p-3">
                    <ThemePreview theme={value} />
                    <span className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium sm:text-sm">
                      <Icon size={14} />
                      {t(label)}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </fieldset>
        <fieldset className="min-w-0 py-6">
          <legend className="float-left w-full text-sm font-medium">
            <T text="Your study buddy" />
          </legend>
          <div className="clear-both pt-2">
            <p className="muted mb-4 text-xs leading-relaxed">
              <T text="A little company at the edge of your screen. No sounds, messages, or things to take care of." />
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {buddyCharacters.map((option) => (
                <label key={option.value} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="studyBuddy"
                    value={option.value}
                    defaultChecked={settings.studyBuddy === option.value}
                    className="peer sr-only"
                  />
                  <div className="rounded-sm border-2 border-[var(--border)] p-3 text-center transition-colors peer-checked:border-[var(--primary)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--primary)] peer-focus-visible:ring-offset-2">
                    <div className="mx-auto mb-2 size-16">
                      <BuddyCharacter character={option.value} />
                    </div>
                    <span className="block text-sm font-medium">{t(option.name)}</span>
                    <span className="muted mt-1 block text-[11px]">{t(option.description)}</span>
                  </div>
                </label>
              ))}
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="buddyMotion"
                defaultChecked={settings.buddyMotion}
                className="mt-0.5 shrink-0"
              />
              <span>
                <span className="text-sm font-medium">
                  <T text="Gentle movement" />
                </span>
                <span className="muted mt-1 block text-xs leading-relaxed">
                  <T text="Wander, follow your mouse along the edges, and hop along on page changes. Turn off for a still companion. Your device’s reduced-motion setting is always respected." />
                </span>
              </span>
            </label>
          </div>
        </fieldset>
      </SettingsForm>
    </>
  );
}

function CalendarSection() {
  const { data } = useWorkspace();
  const settings = data.settings;
  return (
    <>
      <CalendarSubscriptions />
      <SettingsForm
        fields={(form) => ({
          timeFormat: form.get('timeFormat'),
          weekStartsOn: Number(form.get('weekStartsOn')),
          showCompleted: form.get('showCompleted') === 'on',
        })}
      >
        <div className="grid gap-4 py-6 sm:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-sm font-medium">
              <T text="Date & time" />
            </h2>
            <p className="muted mt-2 text-xs leading-relaxed">
              <T text="Make the calendar feel familiar." />
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field">
              <Label htmlFor="settings-time">
                <T text="Time format" />
              </Label>
              <select
                id="settings-time"
                name="timeFormat"
                defaultValue={settings.timeFormat}
                className="input"
              >
                <option value="12">
                  <T text="12-hour · 2:30 PM" />
                </option>
                <option value="24">
                  <T text="24-hour · 14:30" />
                </option>
              </select>
            </div>
            <div className="field">
              <Label htmlFor="settings-week">
                <T text="Week starts on" />
              </Label>
              <select
                id="settings-week"
                name="weekStartsOn"
                defaultValue={settings.weekStartsOn}
                className="input"
              >
                <option value="1">
                  <T text="Monday" />
                </option>
                <option value="0">
                  <T text="Sunday" />
                </option>
              </select>
            </div>
          </div>
        </div>
        <div className="grid gap-4 py-6 sm:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-sm font-medium">
              <T text="A little less clutter" />
            </h2>
            <p className="muted mt-2 text-xs leading-relaxed">
              <T text="Choose how finished work appears." />
            </p>
          </div>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="showCompleted"
              defaultChecked={settings.showCompleted}
              className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
            />
            <span>
              <span className="text-sm font-medium">
                <T text="Show completed tasks" />
              </span>
              <span className="muted mt-1.5 block text-xs leading-relaxed">
                <T text="Include completed tasks on Home and in the calendar. They’re always available in Tasks." />
              </span>
            </span>
          </label>
        </div>
      </SettingsForm>
    </>
  );
}

function TermsSection() {
  const t = useT();
  const { data, openEditor } = useWorkspace();
  const semesters = [...data.semesters].sort(
    (a, b) => Number(b.isActive) - Number(a.isActive) || b.startDate.localeCompare(a.startDate),
  );
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4 sm:px-5">
        <p className="muted text-xs">
          <T text="Edit dates, choose your active term, or delete a term and its courses." />
        </p>
        <Button variant="outline" size="sm" onClick={() => openEditor('semesters')}>
          <Plus size={14} />
          <T text="Add semester" />
        </Button>
      </div>
      {semesters.length ? (
        <div className="divide-y divide-[var(--border)]">
          {semesters.map((semester) => {
            const count = data.courses.filter((course) => course.semesterId === semester.id).length;
            const date = (value: string) =>
              formatDate(
                value.slice(0, 10),
                { month: 'short', day: 'numeric', year: 'numeric' },
                t.locale,
              );
            return (
              <button
                type="button"
                key={semester.id}
                onClick={() => openEditor('semesters', semester.id)}
                className="flex w-full items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-[var(--muted)]/50"
              >
                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-sm ${semester.isActive ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}
                >
                  <CalendarDays size={21} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-medium">{semester.name}</h2>
                    {semester.isActive && (
                      <span className="badge text-[var(--primary)]">
                        <T text="Active" />
                      </span>
                    )}
                  </div>
                  <p className="muted mt-1.5 text-xs leading-relaxed">
                    {date(semester.startDate)} – {date(semester.endDate)}
                    <span className="ml-2">
                      · {count} {count === 1 ? t('course') : t('courses')}
                    </span>
                  </p>
                </div>
                <span className="flex items-center gap-2 text-sm text-primary">
                  <Pencil size={15} /> <T text="Edit" />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="empty-state px-6 py-8">
          <CalendarDays size={30} className="muted mx-auto mb-4" />
          <h2 className="font-semibold">
            <T text="Your next chapter starts here" />
          </h2>
          <p className="muted mx-auto mt-2 max-w-sm text-sm leading-relaxed">
            <T text="Create a semester before adding your courses. Its dates also define when weekly classes appear." />
          </p>
          <Button variant="outline" className="mt-5" onClick={() => openEditor('semesters')}>
            <Plus size={15} />
            <T text="Create your first semester" />
          </Button>
        </div>
      )}
      <p className="muted border-t border-[var(--border)] px-5 py-4 text-xs leading-relaxed">
        <T text="The active semester is selected by default for new courses. Select a semester to edit its dates, change its active status, or delete it." />
      </p>
    </section>
  );
}

function ThemePreview({ theme }: { theme: Settings['theme'] }) {
  const dark = theme === 'DARK';
  return (
    <div
      aria-hidden="true"
      className="relative flex h-16 overflow-hidden rounded-sm border border-border sm:h-20"
      style={{ backgroundColor: dark ? '#1b1b1d' : '#faf9f6' }}
    >
      <div
        className="w-[25%] border-r border-border px-1.5 py-2 sm:px-2"
        style={{ backgroundColor: dark ? '#242426' : '#f3f1ec' }}
      >
        <div className="mb-2 h-1.5 w-3 rounded-sm bg-[#536982]" />
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="mb-1.5 h-1 rounded-sm"
            style={{ backgroundColor: dark ? '#424145' : '#e1ddd6' }}
          />
        ))}
      </div>
      <div className="flex-1 px-2 py-3">
        <div
          className="mb-3 h-1.5 w-1/2 rounded-sm"
          style={{ backgroundColor: dark ? '#aaa7a2' : '#9b9690' }}
        />
        <div className="grid grid-cols-2 gap-1.5">
          <div className="h-6 rounded-sm border border-[#536982]/30 bg-[#536982]/15" />
          <div
            className="h-6 rounded-sm"
            style={{ backgroundColor: dark ? '#303033' : '#efede8' }}
          />
        </div>
      </div>
      {theme === 'SYSTEM' && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[#1b1b1d]/75 mix-blend-multiply" />
      )}
    </div>
  );
}
